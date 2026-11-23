import type { ReactNode } from "react";

/**
 * The white app card every landing fragment sits in (owner feedback #3 and
 * #4). The fragment is a real piece of the app, so it is set in the app's
 * font, Quicksand (layout.tsx exposes --font-quicksand on body; .landing
 * itself uses Be Vietnam Pro), and in the app's own light and dark colours.
 * `data-ui` marks it as app UI for the design inspector. It is a size
 * container, so a fragment lays out by the card's width, not the screen's.
 */
export function FragmentCard({
  ui,
  className = "",
  children,
}: {
  ui: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      data-ui={ui}
      className={`@container flex w-full flex-col rounded-3xl bg-white font-medium leading-normal text-slate-800 [font-family:var(--font-quicksand),ui-sans-serif,system-ui,sans-serif] dark:bg-slate-900 dark:text-slate-100 ${className}`}
    >
      {children}
    </div>
  );
}

/** The title row of a fragment: what it is on the left, where it sits on the right. */
export function FragmentHeader({ title, meta, lang }: { title: string; meta: string; lang?: string }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
      <span lang={lang} className="text-[16px] font-bold">
        {title}
      </span>
      <span className="text-[13px] font-bold text-slate-500 dark:text-slate-400">{meta}</span>
    </div>
  );
}
