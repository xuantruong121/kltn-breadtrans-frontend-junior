"use client";

/**
 * TOEIC L&R attempt, laid out like a paper exam page:
 *  - Part tabs; only the active Part's questions are rendered, all of them.
 *  - Compact right sidebar: time left, submit, restore/save, review hint and
 *    the question numbers grouped by Part (click = open that Part and go there).
 *  - One persistent <audio> for Listening: the continuous master (intro, Part
 *    directions, number cues, questions) in both modes, pausable and seekable.
 *    A part practice plays only its selected Listening Parts. Without a
 *    master the page plays the group clips in order and says so.
 *
 * Answers autosave to the server. "Lưu bài làm" flushes and records a
 * checkpoint; "Khôi phục" returns to that checkpoint. Attempts begun under
 * the old one-pass rules (`section` set) keep their server-enforced locks.
 */
import { use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, ArrowUp, ListOrdered, Loader2, Maximize2, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

import { toeicService, type ToeicListeningMaster, type ToeicQuestionGroup } from "@/lib/api/services/toeic.service";
import { resolveAssessmentPolicy } from "@/lib/practice/focusMode";
import { useAssessmentAntiCheat } from "@/hooks/useAssessmentAntiCheat";
import { PracticeHeader } from "@/components/practice/PracticeHeader";
import { isSafeCourseReturn } from "@/lib/course/navigation";
import {
  buildPaperParts,
  formatMinutes,
  nextPlayable,
  playbackSegments,
  realToVirtual,
  segmentsDuration,
  virtualToReal,
} from "@/lib/toeic/examPaper";
import { ToeicExamPaper } from "@/components/toeic/paper/ToeicExamPaper";
import { ToeicQuestionNavigator } from "@/components/toeic/paper/ToeicQuestionNavigator";
import { ToeicListeningBar } from "@/components/toeic/paper/ToeicListeningBar";

type SaveState = "idle" | "saving" | "saved" | "error";
type ReadyMaster = Extract<ToeicListeningMaster, { available: true }>;
type Checkpoint = { answers: Record<number, number>; marked: number[]; savedAt: string };

const checkpointKey = (id: number) => `breadtrans:toeic-checkpoint:${id}`;
const draftKey = (id: number) => `breadtrans:toeic-draft:${id}`;
const readJson = <T,>(key: string): T | null => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
};
const writeJson = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or blocked: the server copy is still authoritative.
  }
};
const sameState = (a: Record<number, number>, am: Iterable<number>, b: Record<number, number>, bm: Iterable<number>) =>
  JSON.stringify(Object.entries(a).sort()) === JSON.stringify(Object.entries(b).sort()) &&
  JSON.stringify([...am].sort()) === JSON.stringify([...bm].sort());
const timeOf = (iso: string) => new Date(iso).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

export default function ToeicAttemptPage({ params }: { params: Promise<{ attemptId: string }> }) {
  const { attemptId: raw } = use(params);
  const attemptId = Number(raw);
  const router = useRouter();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const requestedReturnTo = searchParams.get("returnTo");
  const parentAttemptId = searchParams.get("parentAttemptId");
  const parentComponentId = searchParams.get("parentComponentId");
  const parentAssessmentId = searchParams.get("parentAssessmentId");
  const courseReturn = requestedReturnTo && isSafeCourseReturn(requestedReturnTo) ? requestedReturnTo : null;

  const [answers, setAnswers] = useState<Record<number, number> | null>(null);
  const [marked, setMarked] = useState<Set<number>>(new Set());
  const [activePart, setActivePart] = useState<number | null>(null);
  const [currentQuestionId, setCurrentQuestionId] = useState<number | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [checkpoint, setCheckpoint] = useState<Checkpoint | null>(null);
  const [confirmRestore, setConfirmRestore] = useState(false);
  const [draftOffer, setDraftOffer] = useState<Checkpoint | null>(null);
  const [showSubmitSummary, setShowSubmitSummary] = useState(false);
  const [showExit, setShowExit] = useState(false);
  const [showDrawer, setShowDrawer] = useState(false);
  const [showTop, setShowTop] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [nowMs, setNowMs] = useState(0);
  // Audio: one element for the whole attempt.
  const audioRef = useRef<HTMLAudioElement>(null);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [audioLoading, setAudioLoading] = useState(false);
  const [audioBlocked, setAudioBlocked] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [realPosition, setRealPosition] = useState(0);
  const [clipDuration, setClipDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [groupCursor, setGroupCursor] = useState(0);
  const blobUrlRef = useRef<string | null>(null);
  const audioRequestRef = useRef(0);
  const hydratedRef = useRef<number | null>(null);
  const advancingRef = useRef(false);
  const pendingJumpRef = useRef<number | null>(null);

  const { data: attempt, isLoading, isError } = useQuery({
    queryKey: ["toeic-attempt", attemptId],
    queryFn: () => toeicService.getAttempt(attemptId),
    enabled: Number.isInteger(attemptId),
  });
  const legacyStrict = Boolean(attempt?.section);
  const section = attempt?.section ?? null;
  const selectedParts = useMemo(() => attempt?.selectedParts ?? [], [attempt?.selectedParts]);
  const { data: master } = useQuery({
    queryKey: ["toeic-listening-master", attemptId],
    queryFn: () => toeicService.getListeningMaster(attemptId),
    enabled: Boolean(attempt && !legacyStrict && attempt.status === "IN_PROGRESS"),
    staleTime: Infinity,
  });
  const masterReady: ReadyMaster | null = master?.available ? (master as ReadyMaster) : null;
  const masterSrc = masterReady ? (masterReady.url ?? toeicService.apiUrl(masterReady.path ?? "")) : null;

  const parts = useMemo(() => buildPaperParts<ToeicQuestionGroup>(attempt?.exam.groups ?? []), [attempt?.exam.groups]);
  const questionMeta = useMemo(() => {
    const map = new Map<number, { part: number; number: number }>();
    for (const p of parts) for (const g of p.groups) for (const q of g.questions) map.set(q.id, { part: p.part, number: q.questionNumber });
    return map;
  }, [parts]);
  const numberToPart = useMemo(() => new Map([...questionMeta.values()].map((m) => [m.number, m.part])), [questionMeta]);
  const listeningGroups = useMemo(() => parts.filter((p) => p.part <= 4).flatMap((p) => p.groups), [parts]);
  const total = questionMeta.size;
  const shownPart = parts.find((p) => p.part === activePart) ?? parts[0] ?? null;

  const persistedAnswers = useMemo(
    () =>
      Object.fromEntries(
        (attempt?.answers ?? []).filter((a) => a.selectedIndex !== null).map((a) => [a.questionId, a.selectedIndex as number]),
      ) as Record<number, number>,
    [attempt],
  );
  const currentAnswers = answers ?? persistedAnswers;
  const answeredCount = Object.keys(currentAnswers).length;
  const persistedRef = useRef(persistedAnswers);
  useEffect(() => {
    persistedRef.current = persistedAnswers;
  }, [persistedAnswers]);

  const lockedReason = (part: number) =>
    legacyStrict && section === "READING" && part <= 4
      ? "Phần Nghe của lượt thi này đã kết thúc, đáp án đã khóa."
      : legacyStrict && section === "LISTENING" && part >= 5
        ? "Phần Đọc của lượt thi này mở khi phần Nghe kết thúc."
        : null;

  /** Legacy strict attempts accept only the open section's answers. */
  const sendable = useCallback(
    (all: Record<number, number>) => {
      if (!legacyStrict || !section) return all;
      return Object.fromEntries(
        Object.entries(all).filter(([id]) => {
          const part = questionMeta.get(Number(id))?.part ?? 0;
          return section === "LISTENING" ? part <= 4 : part >= 5;
        }),
      ) as Record<number, number>;
    },
    [legacyStrict, section, questionMeta],
  );

  // ---------- Fullscreen: never left by the page except on purpose ----------
  useEffect(() => {
    const sync = () => setIsFullscreen(Boolean(document.fullscreenElement));
    sync();
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);
  const enterFullscreen = () => void document.documentElement.requestFullscreen?.().catch(() => undefined);
  const exitFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen?.().catch(() => undefined);
  };
  // Leave fullscreen when the page is really gone. React Strict Mode mounts
  // effects twice in development, so the exit waits a tick and is skipped
  // when the page mounted again (a plain cleanup dropped fullscreen at once).
  const mountTokenRef = useRef(0);
  useEffect(() => {
    const token = ++mountTokenRef.current;
    const audio = audioRef.current;
    return () => {
      window.setTimeout(() => {
        if (mountTokenRef.current !== token) return;
        audio?.pause();
        if (document.fullscreenElement) void document.exitFullscreen?.().catch(() => undefined);
      }, 0);
    };
  }, []);

  useEffect(() => {
    if (!attempt) return;
    const timer = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [attempt]);
  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 600);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // ---------- Hydrate once: flags, active Part, checkpoint, unsaved draft ----------
  useEffect(() => {
    if (!attempt || !parts.length || hydratedRef.current === attempt.id) return;
    hydratedRef.current = attempt.id;
    const serverMarked = new Set(attempt.markedQuestionIds ?? []);
    setMarked(serverMarked);
    setGroupCursor(legacyStrict ? (attempt.listeningPosition ?? 0) : 0);
    const resumeId = attempt.currentQuestionId ?? null;
    setActivePart(resumeId && questionMeta.has(resumeId) ? questionMeta.get(resumeId)!.part : parts[0].part);
    if (resumeId && questionMeta.has(resumeId)) {
      setCurrentQuestionId(resumeId);
      pendingJumpRef.current = questionMeta.get(resumeId)!.number;
    }
    setCheckpoint(readJson<Checkpoint>(checkpointKey(attempt.id)));
    const draft = readJson<Checkpoint>(draftKey(attempt.id));
    if (draft && !sameState(draft.answers, draft.marked, persistedRef.current, serverMarked)) setDraftOffer(draft);
  }, [attempt, parts, questionMeta, legacyStrict]);

  // ---------- Autosave (server), with a local draft while unsaved ----------
  const saveTimerRef = useRef<number | null>(null);
  const inFlightRef = useRef<Promise<unknown> | null>(null);
  const latestRef = useRef({ answers: currentAnswers, marked, currentQuestionId });
  const clearedRef = useRef<Set<number>>(new Set());
  useEffect(() => {
    latestRef.current = { answers: currentAnswers, marked, currentQuestionId };
  }, [currentAnswers, marked, currentQuestionId]);
  const saveNow = useCallback(async () => {
    setSaveState("saving");
    // One save at a time: each waits for the previous one and then sends the
    // newest snapshot, so an older snapshot can never land after a newer one.
    const previous = inFlightRef.current;
    const request = (async () => {
      if (previous) await previous.catch(() => undefined);
      const { answers: a, marked: m, currentQuestionId: c } = latestRef.current;
      // Answers a restore removed are cleared on the server too.
      const clearing = [...clearedRef.current].filter((id) => !(id in a));
      await toeicService.saveAnswers(attemptId, { ...sendable(a), ...Object.fromEntries(clearing.map((id) => [id, null])) }, { markedQuestionIds: [...m], currentQuestionId: c ?? undefined });
      clearing.forEach((id) => clearedRef.current.delete(id));
    })();
    inFlightRef.current = request;
    try {
      await request;
      setSaveState("saved");
      try {
        localStorage.removeItem(draftKey(attemptId));
      } catch {
        // ignore
      }
    } catch (error) {
      setSaveState("error");
      throw error;
    } finally {
      if (inFlightRef.current === request) inFlightRef.current = null;
    }
  }, [attemptId, sendable]);
  const scheduleSave = useCallback(
    (delay = 600) => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = window.setTimeout(() => {
        saveTimerRef.current = null;
        void saveNow().catch(() => {
          saveTimerRef.current = window.setTimeout(() => void saveNow().catch(() => undefined), 4000);
        });
      }, delay);
    },
    [saveNow],
  );
  useEffect(
    () => () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    },
    [],
  );
  // Keep a local draft of every change until the server confirms it.
  useEffect(() => {
    if (!attempt || answers === null) return;
    writeJson(draftKey(attemptId), { answers, marked: [...marked], savedAt: new Date().toISOString() });
  }, [answers, marked, attempt, attemptId]);

  const onSelect = useCallback(
    (questionId: number, optionIndex: number) => {
      setAnswers((old) => ({ ...(old ?? persistedRef.current), [questionId]: optionIndex }));
      setCurrentQuestionId(questionId);
      scheduleSave();
    },
    [scheduleSave],
  );
  const onToggleMark = useCallback(
    (questionId: number) => {
      setAnswers((old) => old ?? persistedRef.current);
      setMarked((old) => {
        const next = new Set(old);
        if (next.has(questionId)) next.delete(questionId);
        else next.add(questionId);
        return next;
      });
      scheduleSave(200);
    },
    [scheduleSave],
  );

  // ---------- Manual save and restore ----------
  const flushSave = useCallback(async () => {
    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    if (inFlightRef.current) await inFlightRef.current.catch(() => undefined);
    await saveNow();
  }, [saveNow]);
  const manualSave = useMutation({
    mutationFn: flushSave,
    onSuccess: () => {
      const point: Checkpoint = { answers: { ...latestRef.current.answers }, marked: [...latestRef.current.marked], savedAt: new Date().toISOString() };
      writeJson(checkpointKey(attemptId), point);
      setCheckpoint(point);
      toast.success(`Đã lưu bài làm lúc ${timeOf(point.savedAt)}`);
    },
    onError: () => toast.error("Chưa lưu được lên máy chủ. Bản nháp vẫn được giữ trên máy này; hãy thử lại khi có mạng."),
  });
  const applyState = (state: Checkpoint) => {
    for (const id of Object.keys(latestRef.current.answers)) if (!(id in state.answers)) clearedRef.current.add(Number(id));
    setAnswers({ ...state.answers });
    setMarked(new Set(state.marked));
    scheduleSave(100);
  };
  const restore = () => {
    if (!checkpoint) return;
    if (sameState(currentAnswers, marked, checkpoint.answers, checkpoint.marked)) {
      toast("Bài làm đang giống bản đã lưu.");
      return;
    }
    setConfirmRestore(true);
  };

  // ---------- Current question from scroll; deliberate jumps only ----------
  useEffect(() => {
    if (!shownPart) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const hit = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        const id = hit ? Number((hit.target as HTMLElement).dataset.questionId) : null;
        if (id) setCurrentQuestionId(id);
      },
      { rootMargin: "-30% 0px -60% 0px" },
    );
    document.querySelectorAll("article[data-question-id]").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [shownPart]);
  const scrollToNumber = (number: number) => {
    const el = document.getElementById(`q-${number}`);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
    (el?.querySelector("input, button") as HTMLElement | null)?.focus({ preventScroll: true });
  };
  useEffect(() => {
    const number = pendingJumpRef.current;
    if (number === null) return;
    pendingJumpRef.current = null;
    window.requestAnimationFrame(() => scrollToNumber(number));
  }, [activePart, shownPart]);
  const jumpToQuestion = useCallback(
    (questionNumber: number) => {
      const part = numberToPart.get(questionNumber);
      if (!part) return;
      setShowDrawer(false);
      if (shownPart?.part === part) {
        window.requestAnimationFrame(() => scrollToNumber(questionNumber));
        return;
      }
      pendingJumpRef.current = questionNumber;
      setActivePart(part);
    },
    [numberToPart, shownPart?.part],
  );
  // Remember where the learner is, a little after they stop scrolling.
  const lastSavedCursorRef = useRef<number | null>(null);
  useEffect(() => {
    if (!attempt || attempt.status !== "IN_PROGRESS" || !currentQuestionId || lastSavedCursorRef.current === currentQuestionId) return;
    const timer = window.setTimeout(() => {
      lastSavedCursorRef.current = currentQuestionId;
      if (!saveTimerRef.current) void saveNow().catch(() => undefined);
    }, 2500);
    return () => window.clearTimeout(timer);
  }, [attempt, currentQuestionId, saveNow]);

  // ---------- Audio ----------
  const segments = useMemo(
    () => (masterReady ? playbackSegments(masterReady.timeline, masterReady.durationSeconds, selectedParts.length ? selectedParts : null) : []),
    [masterReady, selectedParts],
  );
  const playElement = useCallback(async () => {
    const el = audioRef.current;
    if (!el) return;
    try {
      await el.play();
      setAudioBlocked(false);
    } catch {
      setAudioBlocked(true);
    }
  }, []);
  const loadGroupClip = useCallback(
    async (group: ToeicQuestionGroup, autoPlay: boolean) => {
      const requestId = ++audioRequestRef.current;
      setAudioLoading(true);
      setAudioError(null);
      try {
        const blob = await toeicService.getGroupAudio(group.id, attemptId);
        if (requestId !== audioRequestRef.current) return;
        if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = URL.createObjectURL(blob);
        const el = audioRef.current;
        if (!el) return;
        el.src = blobUrlRef.current;
        setRealPosition(0);
        if (autoPlay) await playElement();
      } catch {
        if (requestId === audioRequestRef.current) setAudioError("Không tải được audio của nhóm câu này.");
      } finally {
        if (requestId === audioRequestRef.current) setAudioLoading(false);
      }
    },
    [attemptId, playElement],
  );
  useEffect(
    () => () => {
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
    },
    [],
  );
  // The master source is set once; Part switches never touch the element.
  useEffect(() => {
    const el = audioRef.current;
    if (!el || !masterSrc || el.dataset.masterSrc === masterSrc) return;
    el.dataset.masterSrc = masterSrc;
    el.src = masterSrc;
    el.load();
  }, [masterSrc]);
  // Legacy strict: the server's one-pass manifest drives the audio.
  const strictGroup = legacyStrict && section === "LISTENING" ? listeningGroups[groupCursor] : undefined;
  useEffect(() => {
    if (!strictGroup || attempt?.status !== "IN_PROGRESS") return;
    void loadGroupClip(strictGroup, true);
    // One load per manifest step.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [strictGroup?.id, attempt?.status]);
  const advanceStrict = useCallback(async () => {
    if (advancingRef.current) return;
    advancingRef.current = true;
    try {
      const next = await toeicService.advanceListening(attemptId);
      if (next.section === "READING") await queryClient.invalidateQueries({ queryKey: ["toeic-attempt", attemptId] });
      else setGroupCursor(next.listeningPosition ?? groupCursor + 1);
    } catch {
      setAudioError("Máy chủ chưa chuyển sang nhóm tiếp theo.");
    } finally {
      advancingRef.current = false;
    }
  }, [attemptId, groupCursor, queryClient]);

  const onTimeUpdate = (el: HTMLAudioElement) => {
    if (masterReady && segments.length) {
      const next = nextPlayable(segments, el.currentTime);
      if (next === null) {
        el.pause();
        el.currentTime = segments[segments.length - 1].end;
      } else if (next !== el.currentTime) el.currentTime = next;
    }
    setRealPosition(el.currentTime);
  };
  const onEnded = () => {
    setAudioPlaying(false);
    if (legacyStrict) {
      void advanceStrict();
      return;
    }
    if (!masterReady && groupCursor + 1 < listeningGroups.length) {
      setGroupCursor(groupCursor + 1);
      void loadGroupClip(listeningGroups[groupCursor + 1], true);
    }
  };
  const toggleAudio = () => {
    const el = audioRef.current;
    if (!el || legacyStrict) return;
    if (!masterReady && !el.src) {
      void loadGroupClip(listeningGroups[groupCursor], true);
      return;
    }
    if (masterReady && segments.length && el.currentTime < segments[0].start) el.currentTime = segments[0].start;
    if (el.paused) void playElement();
    else el.pause();
  };
  const seek = (seconds: number) => {
    const el = audioRef.current;
    if (!el || legacyStrict) return;
    el.currentTime = masterReady ? virtualToReal(segments, seconds) : Math.max(0, seconds);
    setRealPosition(el.currentTime);
  };
  const audioPosition = masterReady ? realToVirtual(segments, realPosition) : realPosition;
  const audioDuration = masterReady ? segmentsDuration(segments) : clipDuration;
  const hasListening = parts.some((p) => p.part <= 4);
  const showListeningBar = attempt?.status === "IN_PROGRESS" && hasListening && (!legacyStrict || section === "LISTENING");

  // ---------- Submit / cancel ----------
  const policy = resolveAssessmentPolicy({ kind: "TOEIC", mode: attempt?.mode });
  const { markTerminated } = useAssessmentAntiCheat({
    enabled: policy.enableAntiCheat && legacyStrict && attempt?.status === "IN_PROGRESS",
    onViolation: (eventType) => {
      const persisted = eventType === "CUT_ATTEMPT" ? "COPY_ATTEMPT" : eventType;
      void toeicService.recordIntegrityEvent(attempt!.id, persisted, currentQuestionId ?? undefined).catch(() => undefined);
    },
    preventClipboard: !policy.allowCopyPaste,
    preventContextMenu: !policy.allowContextMenu,
  });
  const leave = () => {
    markTerminated();
    audioRef.current?.pause();
    exitFullscreen();
    try {
      localStorage.removeItem(checkpointKey(attemptId));
      localStorage.removeItem(draftKey(attemptId));
    } catch {
      // ignore
    }
  };
  const submit = useMutation({
    mutationFn: async () => {
      await flushSave();
      return toeicService.submitAttempt(attemptId);
    },
    onSuccess: () => {
      leave();
      const query = [
        courseReturn ? `returnTo=${encodeURIComponent(courseReturn)}` : "",
        parentAttemptId ? `parentAttemptId=${parentAttemptId}` : "",
        parentComponentId ? `parentComponentId=${parentComponentId}` : "",
        parentAssessmentId ? `parentAssessmentId=${parentAssessmentId}` : "",
      ]
        .filter(Boolean)
        .join("&");
      router.push(`/toeic/results/${attemptId}${query ? `?${query}` : ""}`);
    },
  });
  const cancel = useMutation({
    mutationFn: () => toeicService.cancelAttempt(attemptId),
    onSuccess: () => {
      leave();
      router.push(courseReturn ?? "/exams");
    },
  });

  if (isLoading)
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <Loader2 className="animate-spin text-blue-600" />
      </div>
    );
  if (isError || !attempt || !parts.length || !shownPart)
    return <div className="mx-auto max-w-xl py-24 text-center text-slate-600">Không tải được lượt thi.</div>;

  const fullTest = attempt.mode === "FULL_TEST";
  const remaining =
    legacyStrict && section === "READING" && attempt.readingDeadline
      ? Math.max(0, (Date.parse(attempt.readingDeadline) - nowMs) / 1000)
      : attempt.deadline && nowMs
        ? Math.max(0, (Date.parse(attempt.deadline) - nowMs) / 1000)
        : attempt.durationSeconds;
  const scopeLabel = fullTest ? "Full Test" : selectedParts.length ? `Luyện tập Part ${selectedParts.join(", ")}` : "Luyện tập toàn bộ đề";
  const saveStatus =
    saveState === "saving"
      ? "Đang lưu…"
      : saveState === "error"
        ? "Chưa lưu được lên máy chủ, đang thử lại."
        : checkpoint
          ? `Bản lưu lúc ${timeOf(checkpoint.savedAt)}`
          : "Đáp án được tự động lưu.";

  const navigator = (
    <ToeicQuestionNavigator
      parts={parts}
      answers={currentAnswers}
      marked={marked}
      currentQuestionId={currentQuestionId}
      timerValue={formatMinutes(remaining)}
      saveStatus={saveStatus}
      saveError={saveState === "error"}
      saving={manualSave.isPending}
      restoreDisabled={!checkpoint}
      submitting={submit.isPending}
      onJumpQuestion={jumpToQuestion}
      onSubmit={() => setShowSubmitSummary(true)}
      onSave={() => manualSave.mutate()}
      onRestore={restore}
    />
  );

  return (
    <div className="min-h-dvh bg-white font-sans dark:bg-slate-950">
      <div className="sticky top-0 z-30">
        <PracticeHeader
          title={attempt.exam.title}
          category={fullTest ? "FULL TEST" : "LUYỆN TẬP"}
          activityLabel={scopeLabel}
          onExit={() => setShowExit(true)}
          exitLabel="Thoát"
          additionalActions={
            <>
              <button
                type="button"
                onClick={() => setShowDrawer(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs font-bold text-white hover:bg-slate-700 lg:hidden"
                aria-label="Mở bảng câu hỏi"
              >
                <ListOrdered size={14} /> {answeredCount}/{total}
              </button>
              {!isFullscreen && (
                <button type="button" onClick={enterFullscreen} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs font-bold text-slate-200 hover:text-white">
                  <Maximize2 size={14} />
                  <span className="hidden md:inline">Vào toàn màn hình</span>
                </button>
              )}
            </>
          }
        />
        {showListeningBar && (
          <div className="border-b border-slate-200 bg-white px-3 py-2 sm:px-5 dark:border-slate-800 dark:bg-slate-900">
            <ToeicListeningBar
              playing={audioPlaying}
              loading={audioLoading}
              position={audioPosition}
              duration={audioDuration}
              volume={volume}
              seekable={!legacyStrict}
              blocked={audioBlocked}
              error={audioError}
              note={
                legacyStrict
                  ? "Lượt thi này bắt đầu theo luật cũ: audio phát lần lượt từng nhóm câu."
                  : masterReady
                    ? null
                    : "Chưa có bản ghi phần Nghe liền mạch; đang phát audio từng nhóm câu theo thứ tự."
              }
              onToggle={toggleAudio}
              onSeek={seek}
              onVolume={(v) => {
                setVolume(v);
                if (audioRef.current) audioRef.current.volume = v;
              }}
              onRetry={() => {
                if (audioError) {
                  if (strictGroup) void loadGroupClip(strictGroup, true);
                  else if (masterReady) audioRef.current?.load();
                  else void loadGroupClip(listeningGroups[groupCursor], true);
                } else void playElement();
              }}
            />
          </div>
        )}
      </div>

      <div className="grid gap-5 px-3 py-4 sm:px-5 lg:grid-cols-[minmax(0,1fr)_220px]">
        <div className="min-w-0">
          {draftOffer && (
            <div className="mb-3 flex flex-wrap items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
              Có bản nháp chưa lưu lên máy chủ trên máy này (lúc {timeOf(draftOffer.savedAt)}).
              <button
                type="button"
                onClick={() => {
                  applyState(draftOffer);
                  setDraftOffer(null);
                }}
                className="rounded-md bg-amber-600 px-2.5 py-1 font-bold text-white hover:bg-amber-700"
              >
                Dùng bản nháp
              </button>
              <button
                type="button"
                onClick={() => {
                  setDraftOffer(null);
                  try {
                    localStorage.removeItem(draftKey(attemptId));
                  } catch {
                    // ignore
                  }
                }}
                className="rounded-md border border-amber-300 px-2.5 py-1 font-semibold"
              >
                Bỏ qua
              </button>
            </div>
          )}
          <div role="tablist" aria-label="Part" className="mb-3 flex flex-wrap gap-1.5">
            {parts.map((p) => (
              <button
                key={p.part}
                type="button"
                role="tab"
                aria-selected={shownPart.part === p.part}
                onClick={() => setActivePart(p.part)}
                className={`min-h-9 rounded-full px-4 text-sm font-semibold transition-colors ${shownPart.part === p.part ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"}`}
              >
                Part {p.part}
              </button>
            ))}
          </div>
          <div role="tabpanel" aria-label={`Part ${shownPart.part}`}>
            <ToeicExamPaper
              part={shownPart}
              answers={currentAnswers}
              marked={marked}
              lockedReason={lockedReason(shownPart.part)}
              onSelect={onSelect}
              onToggleMark={onToggleMark}
            />
          </div>
        </div>
        <aside className="hidden lg:block">
          <div className={`sticky ${showListeningBar ? "top-[7.5rem]" : "top-16"} h-[calc(100dvh-8.5rem)] rounded-md border border-slate-200 p-3 dark:border-slate-800`}>{navigator}</div>
        </aside>
      </div>

      {showTop && (
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          aria-label="Lên đầu trang"
          className="fixed bottom-6 left-1/2 z-30 inline-flex h-10 w-10 -translate-x-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
        >
          <ArrowUp size={18} />
        </button>
      )}

      <audio
        ref={audioRef}
        preload="metadata"
        onLoadedMetadata={(e) => setClipDuration(e.currentTarget.duration || 0)}
        onTimeUpdate={(e) => onTimeUpdate(e.currentTarget)}
        onPlay={() => setAudioPlaying(true)}
        onPause={() => setAudioPlaying(false)}
        onEnded={onEnded}
        onError={() => {
          if (masterReady) setAudioError("Không tải được bản ghi phần Nghe.");
        }}
        className="hidden"
      />

      {showDrawer && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-slate-950/60 lg:hidden">
          <button type="button" className="flex-1" onClick={() => setShowDrawer(false)} aria-label="Đóng bảng câu hỏi" />
          <div role="dialog" aria-modal="true" aria-label="Bảng câu hỏi" className="h-[80dvh] w-full rounded-t-2xl bg-white p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] dark:bg-slate-900">
            <div className="mb-2 flex justify-end">
              <button type="button" onClick={() => setShowDrawer(false)} aria-label="Đóng" className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
                <X size={20} />
              </button>
            </div>
            <div className="h-[calc(100%-3rem)]">{navigator}</div>
          </div>
        </div>
      )}

      {confirmRestore && checkpoint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div role="dialog" aria-modal="true" aria-labelledby="restore-title" className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <h2 id="restore-title" className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Khôi phục bản lưu lúc {timeOf(checkpoint.savedAt)}?
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">Các đáp án và đánh dấu đã thay đổi sau thời điểm đó sẽ bị thay bằng bản đã lưu.</p>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setConfirmRestore(false)} className="min-h-10 rounded-md border border-slate-200 px-4 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200">
                Hủy
              </button>
              <button
                type="button"
                onClick={() => {
                  applyState(checkpoint);
                  setConfirmRestore(false);
                  toast.success("Đã khôi phục bản lưu.");
                }}
                className="min-h-10 rounded-md bg-blue-600 px-4 text-sm font-bold text-white hover:bg-blue-700"
              >
                Khôi phục
              </button>
            </div>
          </div>
        </div>
      )}

      {showExit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div role="dialog" aria-modal="true" className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <AlertTriangle className="text-rose-600 dark:text-rose-400" />
            <h2 className="mt-3 text-xl font-bold text-slate-900 dark:text-slate-100">Thoát và hủy lượt thi?</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">Lượt thi đang làm dở sẽ bị hủy và các câu trả lời chưa nộp sẽ mất.</p>
            <div className="mt-6 flex flex-col-reverse justify-end gap-2.5 sm:flex-row">
              <button type="button" onClick={() => setShowExit(false)} className="min-h-11 rounded-md border border-slate-200 px-4 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
                Ở lại làm bài
              </button>
              <button type="button" onClick={() => cancel.mutate()} disabled={cancel.isPending} className="min-h-11 rounded-md bg-rose-600 px-4 text-sm font-bold text-white hover:bg-rose-700 disabled:opacity-60">
                {cancel.isPending ? "Đang hủy..." : "Hủy lượt thi"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showSubmitSummary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div role="dialog" aria-modal="true" aria-labelledby="toeic-submit-summary-title" className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <h2 id="toeic-submit-summary-title" className="text-xl font-bold text-slate-900 dark:text-slate-100">
              Nộp bài {scopeLabel}?
            </h2>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-md bg-blue-50 p-3 text-blue-800 dark:bg-blue-950/40 dark:text-blue-200">
                <p className="text-2xl font-bold">{answeredCount}</p>
                <p className="text-xs font-semibold">Đã trả lời</p>
              </div>
              <div className="rounded-md bg-slate-100 p-3 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                <p className="text-2xl font-bold">{total - answeredCount}</p>
                <p className="text-xs font-semibold">Chưa trả lời</p>
              </div>
              <div className="rounded-md bg-amber-50 p-3 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                <p className="text-2xl font-bold">{marked.size}</p>
                <p className="text-xs font-semibold">Đánh dấu review</p>
              </div>
            </div>
            {submit.isError && (
              <p className="mt-4 text-sm font-semibold text-rose-700 dark:text-rose-300" role="alert">
                Chưa nộp được bài. Kiểm tra kết nối rồi thử lại; đáp án vẫn được giữ.
              </p>
            )}
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setShowSubmitSummary(false)} className="min-h-11 rounded-md border border-slate-200 px-4 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
                Quay lại làm bài
              </button>
              <button type="button" onClick={() => submit.mutate()} disabled={submit.isPending} className="min-h-11 rounded-md bg-blue-600 px-4 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60">
                {submit.isPending ? "Đang nộp..." : "Xác nhận nộp bài"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
