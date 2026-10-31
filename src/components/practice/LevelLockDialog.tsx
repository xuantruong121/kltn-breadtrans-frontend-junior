"use client";

import { useRef, useSyncExternalStore, type MouseEventHandler } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Lock } from "lucide-react";

import { useModalAccessibility } from "@/hooks/useModalAccessibility";
import { learningPathService } from "@/lib/api/services/learningPath.service";
import {
  formatRetryAt,
  gateClosedMessage,
  gateHref,
  progressLine,
  progressRule,
  type LevelLock,
} from "@/lib/learning-path/levelLock";
import { PRACTICE_LEVEL_LABEL, PRACTICE_SKILL_LABEL, practiceLevelLabel } from "@/lib/learning-path/practiceLevel";
import { plansHrefFor } from "@/modules/subscription/practicePlan";

const emptySubscribe = () => () => {};

/** The call to action of a card whose level is not open yet. */
export function LevelLockButton({
  onClick,
  ariaLabel,
  label = "Chưa mở mức",
}: {
  onClick: MouseEventHandler<HTMLButtonElement>;
  ariaLabel: string;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className="inline-flex min-h-9 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3.5 text-sm font-semibold text-amber-900 transition-colors hover:bg-amber-100 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-amber-500 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200 dark:hover:bg-amber-900/50"
    >
      <Lock className="size-3.5" aria-hidden="true" />
      <span>{label}</span>
    </button>
  );
}

/** Says where the learner stands and the ways to open the next level. */
function LevelLockBody({ lock, secondary, titleId }: { lock: LevelLock; secondary: React.ReactNode; titleId?: string }) {
  const { data: profile } = useQuery({
    queryKey: ["learning-path-profile"],
    queryFn: learningPathService.getProfile,
    staleTime: 60_000,
  });
  const { data: gate, isError: gateFailed } = useQuery({
    queryKey: ["learning-path-gate", lock.skill],
    queryFn: () => learningPathService.getGate(lock.skill),
  });
  const skill = profile?.skills.find((s) => s.skill === lock.skill);
  const target = gate?.targetLevel ?? skill?.nextLevel ?? null;
  const label = lock.level ? PRACTICE_LEVEL_LABEL[lock.level] : practiceLevelLabel(target);
  const canStartGate = Boolean(gate?.available && (!gate.retryAt || gate.openAttemptId));

  return (
    <>
      <Lock className="size-6 text-amber-600 dark:text-amber-400" aria-hidden="true" />
      <h2 id={titleId} className="mt-3 text-lg font-bold text-slate-900 sm:text-xl dark:text-slate-100">
        Chưa mở mức {label}
      </h2>
      <p className="mt-1.5 text-sm text-slate-700 sm:text-base dark:text-slate-300">
        {PRACTICE_SKILL_LABEL[lock.skill]}: bạn đang mở tới mức {practiceLevelLabel(skill?.unlockedLevel)}.
        {target && lock.level && target !== lock.level
          ? ` Mức ${label} mở sau mức ${PRACTICE_LEVEL_LABEL[target]}.`
          : ""}
      </p>

      <dl className="mt-4 divide-y divide-slate-200 border-y border-slate-200 text-sm dark:divide-slate-800 dark:border-slate-800">
        <div className="py-3">
          <dt className="font-semibold text-slate-900 dark:text-slate-100">Luyện ở mức hiện tại</dt>
          <dd className="mt-0.5 text-slate-600 dark:text-slate-400">
            {skill ? (
              <>
                Đã có {progressLine(lock.skill, skill.progress)}. Cần {progressRule(lock.skill, skill.progress)}.
              </>
            ) : (
              "Đang tải tiến độ của bạn."
            )}
          </dd>
        </div>
        <div className="py-3">
          <dt className="font-semibold text-slate-900 dark:text-slate-100">Bài mở khóa</dt>
          <dd className="mt-0.5 text-slate-600 dark:text-slate-400">
            {gateFailed
              ? "Chưa tải được thông tin bài mở khóa."
              : !gate
                ? "Đang kiểm tra bài mở khóa."
                : !gate.available
                  ? gateClosedMessage(gate.reason)
                  : gate.retryAt && !gate.openAttemptId
                    ? `Bạn làm lại được từ ${formatRetryAt(gate.retryAt)}.`
                    : `${gate.questionCount} câu, đạt từ ${gate.passPercent}%. Miễn phí.`}
          </dd>
        </div>
        {lock.requiredPlan && (
          <div className="py-3">
            <dt className="font-semibold text-slate-900 dark:text-slate-100">Gói</dt>
            <dd className="mt-0.5 text-slate-600 dark:text-slate-400">
              Bài này còn cần gói {lock.requiredPlan}, kể cả khi đã mở mức.{" "}
              <Link href={plansHrefFor(lock.requiredPlan)} className="font-semibold text-blue-700 underline dark:text-blue-300">
                Xem gói {lock.requiredPlan}
              </Link>
            </dd>
          </div>
        )}
      </dl>

      <div className="mt-5 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
        {secondary}
        {canStartGate && (
          <Link
            href={gateHref(lock.skill)}
            className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white transition hover:bg-blue-700"
          >
            {gate?.openAttemptId ? "Làm tiếp bài mở khóa" : "Làm bài mở khóa"}
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        )}
      </div>
    </>
  );
}

const SECONDARY =
  "inline-flex min-h-11 cursor-pointer items-center justify-center rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800";

/** Opened from a locked card. A plan paywall sells; this one explains. */
export function LevelLockDialog({ lock, onClose }: { lock: LevelLock | null; onClose: () => void }) {
  const modalRef = useRef<HTMLDivElement>(null);
  const isReady = useSyncExternalStore(emptySubscribe, () => true, () => false);
  useModalAccessibility({ isOpen: Boolean(lock), onClose, modalRef });
  if (!lock || !isReady) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/50 p-4 sm:items-center"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="level-lock-title"
        className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-lg sm:p-6 dark:border-slate-800 dark:bg-slate-900"
      >
        <LevelLockBody
          lock={lock}
          titleId="level-lock-title"
          secondary={
            <button type="button" onClick={onClose} className={SECONDARY}>
              Để sau
            </button>
          }
        />
      </div>
    </div>,
    document.body,
  );
}

/** Shown instead of an exercise opened directly at a level not open yet. */
export function LevelLockedScreen({ lock, backHref }: { lock: LevelLock; backHref: string }) {
  return (
    <div className="fixed inset-0 z-[45] flex h-dvh w-screen items-center justify-center overflow-y-auto bg-slate-50 p-4 sm:p-6 dark:bg-slate-950">
      <div className="w-full max-w-md rounded-2xl border border-amber-200 bg-white p-5 shadow-lg sm:p-6 dark:border-amber-800/80 dark:bg-slate-900">
        <LevelLockBody
          lock={lock}
          secondary={
            <Link href={backHref} className={SECONDARY}>
              Quay lại danh sách
            </Link>
          }
        />
      </div>
    </div>
  );
}
