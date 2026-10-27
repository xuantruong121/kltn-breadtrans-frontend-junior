"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, PlayCircle } from "lucide-react";

/**
 * One learner-facing detail shell for every TOEIC exam family.
 *
 * L&R is backed by ToeicExamSet and S&W / 4 Skills by ToeicAssessment, so each
 * previously had its own hand-written page and they drifted into two different
 * layouts. The markup here is lifted from the L&R page, which is the agreed
 * visual reference, and the type-specific data is injected instead of being
 * duplicated per page.
 *
 * The shell deliberately knows nothing about Parts, skills or components: it
 * renders whatever structure sections and summary rows it is given, so a skill
 * group never has to masquerade as a numbered TOEIC Part.
 */

export type ToeicStructureItem = {
  /** Row title, e.g. "Part 1: Mô tả hình ảnh" or "Speaking". */
  label: ReactNode;
  /** Right-aligned measure, e.g. "6 câu" or "11 nhiệm vụ". */
  measure?: ReactNode;
  /** Optional second line, e.g. a duration. */
  meta?: ReactNode;
};

export type ToeicStructureSection = {
  /** Omit for a flat list with no sub-heading. */
  heading?: string;
  /** Right-aligned total for the section. */
  measure?: ReactNode;
  items: ToeicStructureItem[];
};

export type ToeicSummaryRow = {
  label: string;
  value: ReactNode;
  /** Softer styling for secondary facts. */
  muted?: boolean;
};

export type ToeicExamDetailShellProps = {
  backHref: string;
  backLabel: string;
  badge: string;
  title: string;
  description: string;
  structureHeading: string;
  structureSubtitle?: string;
  structureBadge?: string;
  sections: ToeicStructureSection[];
  /** Omit when the description already carries the not-ETS statement. */
  disclaimer?: ReactNode;
  summaryHeading: string;
  summaryRows: ToeicSummaryRow[];
  /** Active-attempt hints, readiness warnings, access notes. */
  notices?: ReactNode;
  cta: {
    label: string;
    onClick: () => void;
    disabled?: boolean;
    pending?: boolean;
  };
  ctaError?: string | null;
};

export default function ToeicExamDetailShell({
  backHref,
  backLabel,
  badge,
  title,
  description,
  structureHeading,
  structureSubtitle,
  structureBadge,
  sections,
  disclaimer,
  summaryHeading,
  summaryRows,
  notices,
  cta,
  ctaError,
}: ToeicExamDetailShellProps) {
  return (
    <div className="w-full pb-8">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* CỘT CHÍNH: Tiêu đề, Mô tả, Cấu trúc đề thi, Quy chế */}
        <div className="lg:col-span-8 space-y-6">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Link
                href={backHref}
                className="inline-flex items-center gap-1.5 text-sm sm:text-base font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
              >
                <ArrowLeft size={16} /> {backLabel}
              </Link>
              <span className="inline-flex items-center rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 px-3 py-1 text-sm font-semibold text-slate-700 dark:text-slate-300">
                {badge}
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
              {title}
            </h1>

            <p className="text-base sm:text-lg leading-relaxed text-slate-700 dark:text-slate-300">
              {description}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
            <div className="border-b border-slate-100 dark:border-slate-800 px-5 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100">
                  {structureHeading}
                </h2>
                {structureSubtitle && (
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                    {structureSubtitle}
                  </p>
                )}
              </div>
              {structureBadge && (
                <span className="text-sm font-semibold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-md shrink-0 ml-3">
                  {structureBadge}
                </span>
              )}
            </div>

            {sections.map((section, sectionIndex) => (
              <div
                key={section.heading ?? `section-${sectionIndex}`}
                className={`p-5 space-y-3${
                  sectionIndex < sections.length - 1
                    ? " border-b border-slate-100 dark:border-slate-800"
                    : ""
                }`}
              >
                {(section.heading || section.measure) && (
                  <div className="flex items-center justify-between">
                    {section.heading && (
                      <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                        {section.heading}
                      </h3>
                    )}
                    {section.measure && (
                      <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                        {section.measure}
                      </span>
                    )}
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {section.items.map((item, itemIndex) => (
                    <div
                      key={itemIndex}
                      className="flex items-start justify-between rounded-lg border border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-800/30 px-4 py-3 text-base"
                    >
                      <span className="font-medium text-slate-800 dark:text-slate-200">
                        {item.label}
                        {item.meta && (
                          <span className="mt-0.5 block text-sm font-normal text-slate-500 dark:text-slate-400">
                            {item.meta}
                          </span>
                        )}
                      </span>
                      {item.measure && (
                        <span className="font-semibold text-slate-600 dark:text-slate-400 shrink-0 ml-2">
                          {item.measure}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {disclaimer && (
            <div className="rounded-xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/40 p-4 sm:p-5 text-sm sm:text-base leading-relaxed text-slate-600 dark:text-slate-400">
              {disclaimer}
            </div>
          )}
        </div>

        {/* CỘT PHẢI: Quy cách phòng thi + CTA */}
        <div className="lg:col-span-4 sticky top-6 space-y-4">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-xs space-y-5">
            {summaryRows.length > 0 && (
              <>
                <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                  <h2 className="text-sm sm:text-base font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                    {summaryHeading}
                  </h2>
                </div>

                <dl className="divide-y divide-slate-100 dark:divide-slate-800 text-sm sm:text-base">
                  {summaryRows.map((row) => (
                    <div
                      key={row.label}
                      className="flex items-start justify-between py-2.5"
                    >
                      <dt className="text-slate-500 dark:text-slate-400">
                        {row.label}
                      </dt>
                      <dd
                        className={`text-right ${
                          row.muted
                            ? "font-medium text-slate-700 dark:text-slate-300"
                            : "font-bold text-slate-900 dark:text-slate-100"
                        }`}
                      >
                        {row.value}
                      </dd>
                    </div>
                  ))}
                </dl>
              </>
            )}

            {notices}

            <div className="pt-1">
              <button
                type="button"
                onClick={cta.onClick}
                disabled={cta.disabled || cta.pending}
                className="w-full inline-flex h-12 cursor-pointer items-center justify-center gap-2 rounded-lg bg-slate-900 hover:bg-slate-800 active:scale-[0.99] px-4 text-sm sm:text-base font-bold text-white shadow-xs transition-colors disabled:bg-slate-100 disabled:text-slate-400 disabled:border disabled:border-slate-200 dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900 dark:disabled:bg-slate-800/80 dark:disabled:text-slate-500 dark:disabled:border-slate-700/60 disabled:cursor-not-allowed disabled:shadow-none"
              >
                {cta.pending ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : (
                  <PlayCircle size={18} />
                )}
                {cta.label}
              </button>
            </div>

            {ctaError && (
              <p
                role="alert"
                className="text-center text-sm font-semibold text-rose-600 dark:text-rose-400"
              >
                {ctaError}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
