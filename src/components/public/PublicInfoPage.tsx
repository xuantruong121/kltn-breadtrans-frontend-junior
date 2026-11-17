type InfoSection = {
  title: string;
  body: string;
  /** Anchor for links such as /privacy#xoa-tai-khoan; defaults to muc-<n>. */
  id?: string;
  /** Optional bullet points under the paragraph. */
  items?: string[];
};

type PublicInfoPageProps = {
  /** The document's own name, e.g. "Điều khoản sử dụng". */
  title: string;
  description: string;
  /** "Cập nhật ngày …" under the description. */
  updated?: string;
  sections: InfoSection[];
  /** A closing line with a link, e.g. the support address. */
  contact?: { label: string; linkText: string; href: string };
};

/**
 * A plain text page for the terms and the privacy policy, in the style of
 * /help (owner 2026-11-17: no icon tile, eyebrow, slogan or card stack).
 */
export function PublicInfoPage({ title, description, updated, sections, contact }: PublicInfoPageProps) {
  const items = sections.map((section, index) => ({
    ...section,
    number: index + 1,
    anchor: section.id ?? `muc-${index + 1}`,
  }));

  return (
    <div className="min-h-[calc(100dvh-5rem)] bg-slate-50 px-4 py-10 dark:bg-slate-950 sm:px-6 sm:py-14">
      <div className="mx-auto max-w-5xl">
        <header className="max-w-3xl border-b border-slate-200 pb-7 dark:border-slate-800 sm:pb-8">
          <h1 className="text-3xl font-bold tracking-tight text-slate-950 dark:text-slate-100 sm:text-4xl">{title}</h1>
          <p className="mt-3 text-base leading-7 text-slate-600 dark:text-slate-400">{description}</p>
          {updated ? (
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">Cập nhật ngày {updated}</p>
          ) : null}
        </header>

        <div className="mt-8 lg:grid lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-12">
          <nav aria-label="Mục lục" className="mb-8 lg:mb-0">
            <div className="border-y border-slate-200 py-4 dark:border-slate-800 lg:sticky lg:top-24 lg:border-0 lg:py-0">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Mục lục</p>
              <ol className="mt-2 space-y-1.5 text-sm">
                {items.map((section) => (
                  <li key={section.anchor}>
                    <a
                      href={`#${section.anchor}`}
                      className="text-slate-600 hover:text-slate-950 hover:underline dark:text-slate-400 dark:hover:text-slate-100"
                    >
                      {section.number}. {section.title}
                    </a>
                  </li>
                ))}
              </ol>
            </div>
          </nav>

          <article className="max-w-3xl">
            {items.map((section) => (
              <section
                key={section.anchor}
                id={section.anchor}
                className="scroll-mt-24 border-b border-slate-200 py-7 first:pt-0 last:border-0 dark:border-slate-800"
              >
                <h2 className="text-xl font-semibold text-slate-950 dark:text-slate-100">
                  {section.number}. {section.title}
                </h2>
                <p className="mt-3 text-base leading-7 text-slate-700 dark:text-slate-300">{section.body}</p>
                {section.items?.length ? (
                  <ul className="mt-3 list-disc space-y-2 pl-5 text-base leading-7 text-slate-700 dark:text-slate-300">
                    {section.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                ) : null}
              </section>
            ))}

            {contact ? (
              <p className="pt-7 text-base text-slate-700 dark:text-slate-300">
                {contact.label}{" "}
                <a
                  href={contact.href}
                  className="font-semibold text-amber-700 underline underline-offset-2 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-300"
                >
                  {contact.linkText}
                </a>
              </p>
            ) : null}
          </article>
        </div>
      </div>
    </div>
  );
}
