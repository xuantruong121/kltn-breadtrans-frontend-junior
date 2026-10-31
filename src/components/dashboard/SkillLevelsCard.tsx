"use client";

import { useState } from "react";

import { LevelLockDialog } from "@/components/practice/LevelLockDialog";
import { progressLine, type LevelLock } from "@/lib/learning-path/levelLock";
import { needsLevelChoice, type LearnerProfile } from "@/lib/learning-path/onboarding";
import {
  PRACTICE_SKILL_LABEL,
  PRACTICE_SKILL_ORDER,
  practiceLevelLabel,
} from "@/lib/learning-path/practiceLevel";

/** The level open in each skill and how far the next one is. Internal levels. */
export function SkillLevelsCard({ profile }: { profile: LearnerProfile | undefined }) {
  const [lock, setLock] = useState<LevelLock | null>(null);
  if (!profile || needsLevelChoice(profile)) return null;

  return (
    <section
      aria-labelledby="skill-levels-heading"
      className="rounded-2xl border border-slate-200 bg-white px-5 py-4 dark:border-slate-800 dark:bg-slate-900"
    >
      <h2 id="skill-levels-heading" className="text-base font-bold text-slate-900 dark:text-slate-100">
        Mức đã mở theo kỹ năng
      </h2>
      <ul className="mt-3 grid gap-x-6 gap-y-4 sm:grid-cols-2 xl:grid-cols-4">
        {PRACTICE_SKILL_ORDER.map((skill) => {
          const state = profile.skills.find((s) => s.skill === skill);
          if (!state) return null;
          return (
            <li key={skill} className="min-w-0">
              <p className="text-sm text-slate-600 dark:text-slate-400">{PRACTICE_SKILL_LABEL[skill]}</p>
              <p className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {practiceLevelLabel(state.unlockedLevel)}
              </p>
              {state.nextLevel ? (
                <>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {progressLine(skill, state.progress)}
                  </p>
                  <button
                    type="button"
                    onClick={() => setLock({ skill, level: state.nextLevel, requiredPlan: null })}
                    className="mt-1 inline-flex min-h-10 cursor-pointer items-center text-sm font-semibold text-blue-700 hover:text-blue-900 dark:text-blue-300"
                  >
                    Cách mở mức {practiceLevelLabel(state.nextLevel)}
                  </button>
                </>
              ) : (
                <p className="text-sm text-slate-600 dark:text-slate-400">Mức cao nhất</p>
              )}
            </li>
          );
        })}
      </ul>
      <LevelLockDialog lock={lock} onClose={() => setLock(null)} />
    </section>
  );
}
