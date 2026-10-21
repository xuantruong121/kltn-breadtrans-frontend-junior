export type AudioExample = {
  term: string;
  ipa?: string;
  meaning?: string;
  audioUrl: string;
  accent?: string;
  /** Any other field the stored record carries (e.g. legacy `source`) that
   * the CMS doesn't surface as its own input — kept so it survives an
   * edit-save round trip instead of being silently dropped. */
  [key: string]: unknown;
};

export type NormalizedSectionContent = {
  text: string;
  paragraphs: string[];
  bullets: string[];
  examples: Array<{
    label?: string;
    text: string;
    translation?: string;
    explanation?: string;
  }>;
  audioExamples: AudioExample[];
};

/** Content keys the CMS editor reads/writes. Everything else in a Section's
 * stored JSON (formulas, items, any other legacy/extension field) is left
 * untouched by the writer — see toSectionContentPayload. */
const MANAGED_CONTENT_KEYS = [
  "text",
  "paragraphs",
  "bullets",
  "examples",
  "audioExamples",
] as const;

const strings = (value: unknown): string[] =>
  Array.isArray(value)
    ? value
        .filter(
          (item): item is string =>
            typeof item === "string" && item.trim().length > 0,
        )
        .map((item) => item.trim())
    : [];

function parseAudioExamples(value: unknown): AudioExample[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const record = item as Record<string, unknown>;
    const term = typeof record.term === "string" ? record.term.trim() : "";
    const audioUrl =
      typeof record.audioUrl === "string" ? record.audioUrl.trim() : "";
    if (!term || !audioUrl) return [];
    const rest = { ...record };
    for (const key of ["term", "ipa", "meaning", "audioUrl", "accent"])
      delete rest[key];
    return [
      {
        ...rest,
        term,
        audioUrl,
        ipa: typeof record.ipa === "string" ? record.ipa.trim() : undefined,
        meaning:
          typeof record.meaning === "string" ? record.meaning.trim() : undefined,
        accent:
          typeof record.accent === "string" ? record.accent.trim() : undefined,
      },
    ];
  });
}

/** Parses a Section's raw `content` into a plain object without throwing,
 * without mutating the input, and without exposing raw JSON. Returns `{}` for
 * anything that isn't (or doesn't parse to) a plain object. */
function toPlainObject(raw: unknown): Record<string, unknown> {
  let value = raw;
  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {
      return {};
    }
  }
  return value && typeof value === "object" && !Array.isArray(value)
    ? { ...(value as Record<string, unknown>) }
    : {};
}

export function normalizeSectionContent(
  raw: unknown,
): NormalizedSectionContent {
  let value = raw;
  if (typeof value === "string") {
    const trimmed = value.trim();
    try {
      value = JSON.parse(trimmed);
    } catch {
      return {
        text: trimmed,
        paragraphs: trimmed ? [trimmed] : [],
        bullets: [],
        examples: [],
        audioExamples: [],
      };
    }
  }
  if (!value || typeof value !== "object" || Array.isArray(value))
    return {
      text: "",
      paragraphs: [],
      bullets: [],
      examples: [],
      audioExamples: [],
    };
  const content = value as Record<string, unknown>;
  const text = typeof content.text === "string" ? content.text.trim() : "";
  const paragraphs = strings(content.paragraphs);
  const bullets = strings(content.bullets);
  const examples = Array.isArray(content.examples)
    ? content.examples.flatMap((item) => {
        if (typeof item === "string" && item.trim())
          return [{ text: item.trim() }];
        if (!item || typeof item !== "object") return [];
        const record = item as Record<string, unknown>;
        const exampleText =
          typeof record.text === "string"
            ? record.text
            : typeof record.example === "string"
              ? record.example
              : "";
        return exampleText.trim()
          ? [
              {
                label:
                  typeof record.label === "string"
                    ? record.label.trim()
                    : undefined,
                text: exampleText.trim(),
                translation:
                  typeof record.translation === "string"
                    ? record.translation.trim()
                    : undefined,
                explanation:
                  typeof record.explanation === "string"
                    ? record.explanation.trim()
                    : undefined,
              },
            ]
          : [];
      })
    : [];
  return {
    text,
    paragraphs: paragraphs.length ? paragraphs : text ? [text] : [],
    bullets,
    examples,
    audioExamples: parseAudioExamples(content.audioExamples),
  };
}

/** Single canonical write format for a Course Section's `content` JSON.
 *
 * - New Section (no `originalContent`): writes ONLY the canonical fields the
 *   CMS manages — no inherited/legacy keys.
 * - Existing Section (`originalContent` passed): the canonical fields
 *   overwrite their old values, but any other key already on the stored
 *   content (formulas, items, any legacy/extension field) is preserved
 *   untouched. Never mutates `originalContent`. */
export function toSectionContentPayload(
  input: {
    paragraphs: string[];
    bullets: string[];
    examples: Array<{
      label?: string;
      text: string;
      translation?: string;
      explanation?: string;
    }>;
    audioExamples?: Array<{
      term: string;
      ipa?: string;
      meaning?: string;
      audioUrl: string;
      accent?: string;
      /** Unmanaged fields from the original record (e.g. legacy `source`),
       * carried through untouched instead of dropped on save. */
      extra?: Record<string, unknown>;
    }>;
  },
  originalContent?: unknown,
): Record<string, unknown> {
  const paragraphs = input.paragraphs
    .map((value) => value.trim())
    .filter(Boolean);
  const bullets = input.bullets.map((value) => value.trim()).filter(Boolean);
  const examples = input.examples
    .filter((example) => example.text.trim())
    .map((example) => ({
      ...(example.label?.trim() ? { label: example.label.trim() } : {}),
      text: example.text.trim(),
      ...(example.translation?.trim()
        ? { translation: example.translation.trim() }
        : {}),
      ...(example.explanation?.trim()
        ? { explanation: example.explanation.trim() }
        : {}),
    }));
  const audioExamples = (input.audioExamples ?? [])
    .filter((item) => item.term.trim() && item.audioUrl.trim())
    .map((item) => ({
      ...(item.extra ?? {}),
      term: item.term.trim(),
      audioUrl: item.audioUrl.trim(),
      ...(item.ipa?.trim() ? { ipa: item.ipa.trim() } : {}),
      ...(item.meaning?.trim() ? { meaning: item.meaning.trim() } : {}),
      ...(item.accent?.trim() ? { accent: item.accent.trim() } : {}),
    }));
  const text = paragraphs[0] ?? "";
  const managed = { text, paragraphs, bullets, examples, audioExamples };
  if (originalContent === undefined) return managed;
  const base = toPlainObject(originalContent);
  for (const key of MANAGED_CONTENT_KEYS) delete base[key];
  return { ...base, ...managed };
}

export type SectionEditorForm = {
  type: string;
  heading: string;
  text: string;
  bullets: string[];
  examples: Array<{ text: string; translation: string; explanation: string }>;
  audioExamples: Array<{
    term: string;
    ipa: string;
    meaning: string;
    audioUrl: string;
    accent: string;
    extra?: Record<string, unknown>;
  }>;
  isRequired: boolean;
};

/** Seeds the section editor drawer's form state from a stored Course
 * Section (Admin "Sửa") or from an applied AI candidate — both read through
 * the same normalizer so the drawer never sees raw JSON. */
export function sectionToFormState(section: {
  type?: string;
  heading?: string;
  content?: unknown;
  isRequired?: boolean;
}): SectionEditorForm {
  const content = normalizeSectionContent(section.content);
  return {
    type: section.type || "THEORY",
    heading: section.heading || "",
    text: content.paragraphs.join("\n\n"),
    bullets: content.bullets,
    examples: content.examples.map((example) => ({
      text: example.text,
      translation: example.translation || "",
      explanation: example.explanation || "",
    })),
    audioExamples: content.audioExamples.map((item) => {
      const { term, ipa, meaning, audioUrl, accent, ...extra } = item;
      return {
        term,
        ipa: ipa || "",
        meaning: meaning || "",
        audioUrl,
        accent: accent || "",
        ...(Object.keys(extra).length ? { extra } : {}),
      };
    }),
    isRequired: section.isRequired !== false,
  };
}

/** Swaps two items of a list in place order (used by the section editor's
 * bullet/example/audio-example reorder controls). */
export function swapAt<T>(list: T[], a: number, b: number): T[] {
  const next = [...list];
  [next[a], next[b]] = [next[b], next[a]];
  return next;
}
