"use client";

import { use, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Loader2, Mic } from "lucide-react";
import toast from "react-hot-toast";
import axiosClient from "@/lib/api/axiosClient";
import type { ToeicQuestionGroup } from "@/lib/api/services/toeic.service";
import { PracticeHeader } from "@/components/practice/PracticeHeader";
import { ToeicExamPaper } from "@/components/toeic/paper/ToeicExamPaper";
import { ToeicListeningBar } from "@/components/toeic/paper/ToeicListeningBar";
import { ToeicQuestionNavigator } from "@/components/toeic/paper/ToeicQuestionNavigator";
import { SpeakingPaper, WritingPaper } from "@/components/toeic/assessment/ExamPaperViews";
import { buildPaperParts } from "@/lib/toeic/examPaper";
import { SPEAKING_GROUPS, WRITING_GROUPS, groupLabel, type RoomGroup } from "@/lib/toeic/assessmentRoom";

type PreviewGroup = ToeicQuestionGroup & { audioSrc: string | null };

type SpeakingTask = {
  id: number;
  order: number;
  targetText: string;
  imageUrl?: string | null;
  stimulusText?: string | null;
};

type WritingTask = {
  id: number;
  order: number;
  prompt?: string | null;
  imageUrl?: string | null;
  keywords?: string[];
};

type PreviewMaster = {
  url: string;
  durationSeconds: number;
  timeline: Array<{ kind: string; part?: number; start: number }>;
};

type LearnerPreviewDto = {
  examId: number;
  title: string;
  master: PreviewMaster | null;
  lr: { groups: PreviewGroup[] } | null;
  speaking: SpeakingTask[] | null;
  writing: WritingTask[] | null;
};

type Section = "LR" | "SPEAKING" | "WRITING";

/** The same tabs a learner sees in the exam room. */
function PreviewGroups({
  groups,
  children,
}: {
  groups: readonly RoomGroup[];
  children: (group: RoomGroup) => ReactNode;
}) {
  const [active, setActive] = useState(0);
  const group = groups[active];
  return (
    <div className="px-3 py-4 sm:px-5">
      <div role="tablist" aria-label="Nhóm câu" className="flex gap-1.5 overflow-x-auto pb-1">
        {groups.map((g, index) => (
          <button
            key={g.from}
            type="button"
            role="tab"
            aria-selected={index === active}
            onClick={() => setActive(index)}
            className={`min-h-9 shrink-0 rounded-full px-3.5 text-sm font-semibold transition-colors ${
              index === active
                ? "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300"
                : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            }`}
          >
            {groupLabel(g)}
          </button>
        ))}
      </div>
      <p className="mb-3 mt-3 text-sm font-semibold text-slate-700 dark:text-slate-300">{group.title}</p>
      {children(group)}
    </div>
  );
}

const SECTION_LABELS: Record<Section, string> = {
  LR: "Listening & Reading",
  SPEAKING: "Speaking",
  WRITING: "Writing",
};

const PREVIEW_ONLY = "Đây là bản xem trước nên bài làm không được lưu hay nộp.";

export default function ExamLearnerPreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: rawId } = use(params);
  const examId = Number(rawId);
  const router = useRouter();
  const [section, setSection] = useState<Section>("LR");
  const [activePart, setActivePart] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [marked, setMarked] = useState<Set<number>>(() => new Set());
  const [currentQuestionId, setCurrentQuestionId] = useState<number | null>(null);

  const [clipIndex, setClipIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [audioError, setAudioError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const keepPlaying = useRef(false);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-exam-learner-preview", examId],
    queryFn: async () =>
      (await axiosClient.get(
        `/admin/exams/${examId}/learner-preview`,
      )) as unknown as LearnerPreviewDto,
    enabled: Number.isInteger(examId),
  });

  const parts = useMemo(() => buildPaperParts(data?.lr?.groups ?? []), [data]);
  const clips = useMemo(
    () => parts.flatMap((p) => p.groups).filter((g) => g.audioSrc),
    [parts],
  );
  const shownPart = parts.find((p) => p.part === activePart) ?? parts[0];
  const master = data?.master ?? null;
  const clip = clips[clipIndex];
  const showBar = section === "LR" && shownPart?.section === "LISTENING";
  const hasSpeaking = Boolean(data?.speaking?.length);
  const hasWriting = Boolean(data?.writing?.length);
  const sections: Section[] = [
    ...(parts.length ? (["LR"] as const) : []),
    ...(hasSpeaking ? (["SPEAKING"] as const) : []),
    ...(hasWriting ? (["WRITING"] as const) : []),
  ];
  const shownSection = sections.includes(section) ? section : sections[0];

  // A Listening Part starts from its first clip; other Parts stop the audio.
  const openPart = useCallback(
    (part: number) => {
      setActivePart(part);
      if (master) {
        // The learner's recording is one file: a Part is a place in it.
        const start = master.timeline.find(
          (entry) => entry.kind === "DIRECTIONS" && entry.part === part,
        )?.start;
        if (start === undefined) audioRef.current?.pause();
        else if (audioRef.current) audioRef.current.currentTime = start;
        return;
      }
      const first = clips.findIndex((g) => g.part === part);
      if (first < 0) {
        audioRef.current?.pause();
        return;
      }
      keepPlaying.current = playing;
      setClipIndex(first);
    },
    [clips, master, playing],
  );

  useEffect(() => {
    const element = audioRef.current;
    if (!element || !keepPlaying.current) return;
    keepPlaying.current = false;
    void element.play().catch(() => setPlaying(false));
  }, [clipIndex]);

  const toggleAudio = () => {
    const element = audioRef.current;
    if (!element) return;
    setAudioError(null);
    if (element.paused) void element.play().catch(() => setPlaying(false));
    else element.pause();
  };

  const jumpTo = (questionNumber: number) => {
    const part = parts.find(
      (p) => questionNumber >= p.firstNumber && questionNumber <= p.lastNumber,
    );
    if (!part) return;
    setSection("LR");
    if (part.part !== shownPart?.part) openPart(part.part);
    window.setTimeout(() => {
      document
        .getElementById(`q-${questionNumber}`)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  };

  const onSelect = useCallback((questionId: number, optionIndex: number) => {
    setCurrentQuestionId(questionId);
    setAnswers((prev) => ({ ...prev, [questionId]: optionIndex }));
  }, []);

  const onToggleMark = useCallback((questionId: number) => {
    setMarked((prev) => {
      const next = new Set(prev);
      if (next.has(questionId)) next.delete(questionId);
      else next.add(questionId);
      return next;
    });
  }, []);

  const backToExam = useCallback(() => {
    router.push(`/admin/exams?exam=${examId}`);
  }, [router, examId]);

  if (isLoading || !data) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-white dark:bg-slate-950">
        <Loader2 className="animate-spin text-slate-500" size={28} />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-white font-sans dark:bg-slate-950">
      <div className="sticky top-0 z-30">
        <PracticeHeader
          title={data.title}
          category="XEM TRƯỚC"
          activityLabel="Không lưu lượt làm"
          onExit={backToExam}
          exitLabel="Thoát xem trước"
        />
        {sections.length > 1 && (
          <div
            role="tablist"
            aria-label="Phần thi"
            className="flex flex-wrap gap-1.5 border-b border-slate-200 bg-white px-3 py-2 sm:px-5 dark:border-slate-800 dark:bg-slate-900"
          >
            {sections.map((item) => (
              <button
                key={item}
                type="button"
                role="tab"
                aria-selected={shownSection === item}
                onClick={() => setSection(item)}
                className={`min-h-9 rounded-lg px-3 text-sm font-semibold ${shownSection === item ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"}`}
              >
                {SECTION_LABELS[item]}
              </button>
            ))}
          </div>
        )}
        {showBar && (
          <div className="border-b border-slate-200 bg-white px-3 py-2 sm:px-5 dark:border-slate-800 dark:bg-slate-900">
            <ToeicListeningBar
              playing={playing}
              loading={false}
              position={position}
              duration={duration}
              volume={volume}
              seekable
              blocked={false}
              error={audioError}
              note={
                master
                  ? null
                  : "Chưa dựng audio liền mạch, đang phát từng nhóm câu. Hệ thống tự dựng khi xuất bản."
              }
              onToggle={toggleAudio}
              onSeek={(seconds) => {
                if (audioRef.current) audioRef.current.currentTime = seconds;
              }}
              onVolume={(value) => {
                setVolume(value);
                if (audioRef.current) audioRef.current.volume = value;
              }}
              onRetry={() => {
                setAudioError(null);
                audioRef.current?.load();
              }}
            />
          </div>
        )}
      </div>

      {shownSection === "LR" && shownPart && (
        <div className="grid gap-5 px-3 py-4 sm:px-5 lg:grid-cols-[minmax(0,1fr)_220px]">
          <div className="min-w-0">
            <div
              role="tablist"
              aria-label="Part"
              className="mb-3 flex flex-wrap gap-1.5"
            >
              {parts.map((p) => (
                <button
                  key={p.part}
                  type="button"
                  role="tab"
                  aria-selected={shownPart.part === p.part}
                  onClick={() => openPart(p.part)}
                  className={`min-h-9 rounded-full px-4 text-sm font-semibold transition-colors ${shownPart.part === p.part ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200"}`}
                >
                  Part {p.part}
                </button>
              ))}
            </div>
            <div role="tabpanel" aria-label={`Part ${shownPart.part}`}>
              <ToeicExamPaper
                part={shownPart}
                answers={answers}
                marked={marked}
                lockedReason={null}
                onSelect={onSelect}
                onToggleMark={onToggleMark}
                editHrefFor={(number) =>
                  `/admin/exams?exam=${examId}&q=${number}`
                }
              />
            </div>
          </div>
          <aside className="hidden lg:block">
            <div className="sticky top-40 h-[calc(100dvh-11rem)]">
              <ToeicQuestionNavigator
                parts={parts}
                answers={answers}
                marked={marked}
                currentQuestionId={currentQuestionId}
                timerValue="120:00"
                saveStatus={PREVIEW_ONLY}
                saveError={false}
                saving={false}
                restoreDisabled
                submitting={false}
                onJumpQuestion={jumpTo}
                onSubmit={() => toast(PREVIEW_ONLY)}
                onSave={() => toast(PREVIEW_ONLY)}
                onRestore={() => undefined}
              />
            </div>
          </aside>
        </div>
      )}

      {shownSection === "SPEAKING" && (
        <PreviewGroups key="SPEAKING" groups={SPEAKING_GROUPS}>
          {(group) => (
            <SpeakingPaper
              tasks={(data.speaking ?? [])
                .filter((task) => task.order >= group.from && task.order <= group.to)
                .map((task) => ({ id: task.id, number: task.order, text: task.targetText, imageUrl: task.imageUrl, stimulusText: task.stimulusText }))}
              renderAnswer={() => (
                <span className="inline-flex min-h-11 items-center gap-2 rounded-md bg-amber-500 px-4 text-sm font-bold uppercase text-white opacity-60">
                  <Mic size={16} aria-hidden="true" /> Thu âm
                </span>
              )}
            />
          )}
        </PreviewGroups>
      )}

      {shownSection === "WRITING" && (
        <PreviewGroups key="WRITING" groups={WRITING_GROUPS}>
          {(group) => (
            <WritingPaper
              tasks={(data.writing ?? [])
                .filter((task) => task.order >= group.from && task.order <= group.to)
                .map((task) => ({ id: task.id, number: task.order, prompt: task.prompt ?? "", imageUrl: task.imageUrl, keywords: task.keywords }))}
              renderAnswer={(task) => (
                <textarea
                  disabled
                  rows={task.number <= 5 ? 4 : 14}
                  aria-label={`Ô viết câu ${task.number}`}
                  className="w-full rounded-md border border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-900"
                />
              )}
            />
          )}
        </PreviewGroups>
      )}

      <audio
        ref={audioRef}
        src={master?.url ?? clip?.audioSrc ?? undefined}
        preload="metadata"
        onLoadedMetadata={(event) => {
          setDuration(event.currentTarget.duration || 0);
          setPosition(0);
        }}
        onTimeUpdate={(event) => setPosition(event.currentTarget.currentTime)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          if (master || clipIndex + 1 >= clips.length) return;
          keepPlaying.current = true;
          setClipIndex(clipIndex + 1);
        }}
        onError={() => {
          if (master || clip) setAudioError("Không tải được audio phần Nghe.");
        }}
        className="hidden"
      />
    </div>
  );
}
