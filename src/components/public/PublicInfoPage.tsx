import Link from "next/link";
import { ArrowLeft, ChevronRight, type LucideIcon } from "lucide-react";

type InfoSection = {
  title: string;
  body: string;
};

type PublicInfoPageProps = {
  eyebrow: string;
  title: string;
  description: string;
  icon: LucideIcon;
  sections: InfoSection[];
  cta?: { label: string; href: string };
};

export function PublicInfoPage({
  eyebrow,
  title,
  description,
  icon: Icon,
  sections,
  cta,
}: PublicInfoPageProps) {
  return (
    <section className="bg-[radial-gradient(circle_at_top,_#fff7ed_0,_#fbfaf8_38rem)] py-12 sm:py-16">
      <div className="mx-auto w-full max-w-4xl px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="mb-8 inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 shadow-sm transition-colors hover:border-amber-300 hover:bg-amber-50 hover:text-amber-900"
        >
          <ArrowLeft size={17} aria-hidden="true" />
          Về trang chủ
        </Link>

        <header className="rounded-[2rem] border border-amber-100 bg-white p-7 shadow-card sm:p-10">
          <div className="mb-5 flex size-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-800">
            <Icon size={25} aria-hidden="true" />
          </div>
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-amber-700">{eyebrow}</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">{title}</h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">{description}</p>
        </header>

        <div className="mt-6 space-y-4">
          {sections.map((section) => (
            <article key={section.title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft sm:p-7">
              <h2 className="text-lg font-extrabold text-slate-900">{section.title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{section.body}</p>
            </article>
          ))}
        </div>

        {cta && (
          <Link
            href={cta.href}
            className="mt-8 inline-flex min-h-12 items-center gap-2 rounded-xl bg-amber-600 px-5 text-sm font-extrabold text-white shadow-sm transition-colors hover:bg-amber-700"
          >
            {cta.label}
            <ChevronRight size={18} aria-hidden="true" />
          </Link>
        )}
      </div>
    </section>
  );
}
