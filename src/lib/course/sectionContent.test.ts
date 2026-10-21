import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  normalizeSectionContent,
  sectionToFormState,
  swapAt,
  toSectionContentPayload,
} from "./sectionContent.ts";

describe("normalizeSectionContent", () => {
  it("supports plain text, JSON strings and structured objects without exposing raw JSON", () => {
    assert.deepEqual(normalizeSectionContent("Hello").paragraphs, ["Hello"]);
    assert.deepEqual(
      normalizeSectionContent(
        '{"bullets":["Hi","Hello"],"paragraphs":["Greeting"]}',
      ),
      {
        text: "",
        paragraphs: ["Greeting"],
        bullets: ["Hi", "Hello"],
        examples: [],
        audioExamples: [],
      },
    );
    assert.equal(
      normalizeSectionContent({
        examples: [{ text: "Good morning", translation: "Chào buổi sáng" }],
      }).examples.length,
      1,
    );
  });

  it("falls back safely for malformed legacy JSON", () => {
    assert.deepEqual(normalizeSectionContent('{"bullets":'), {
      text: '{"bullets":',
      paragraphs: ['{"bullets":'],
      bullets: [],
      examples: [],
      audioExamples: [],
    });
  });

  it("parses canonical audioExamples, keeping only entries with term + audioUrl", () => {
    const normalized = normalizeSectionContent({
      audioExamples: [
        {
          term: "hello",
          ipa: "/həˈloʊ/",
          meaning: "Xin chào",
          audioUrl: "https://cdn.example.test/hello.mp3",
          accent: "Anh-Mỹ",
        },
        { term: "missing audio url" },
        { audioUrl: "https://cdn.example.test/no-term.mp3" },
        "not an object",
        null,
      ],
    });
    assert.deepEqual(normalized.audioExamples, [
      {
        term: "hello",
        ipa: "/həˈloʊ/",
        meaning: "Xin chào",
        audioUrl: "https://cdn.example.test/hello.mp3",
        accent: "Anh-Mỹ",
      },
    ]);
  });

  it("never throws on a malformed audioExamples entry or a non-array value", () => {
    assert.doesNotThrow(() =>
      normalizeSectionContent({ audioExamples: "not-an-array" }),
    );
    assert.deepEqual(
      normalizeSectionContent({ audioExamples: "not-an-array" }).audioExamples,
      [],
    );
    assert.deepEqual(
      normalizeSectionContent({ audioExamples: [] }).audioExamples,
      [],
    );
    assert.deepEqual(
      normalizeSectionContent({ audioExamples: [{ term: 42, audioUrl: null }] })
        .audioExamples,
      [],
    );
  });

  it("does not mutate the raw content object passed in", () => {
    const raw = {
      text: "x",
      audioExamples: [{ term: "hi", audioUrl: "https://x.test/hi.mp3" }],
    };
    const snapshot = JSON.stringify(raw);
    normalizeSectionContent(raw);
    assert.equal(JSON.stringify(raw), snapshot);
  });
});

describe("toSectionContentPayload", () => {
  it("builds the canonical write shape, trimming blanks and deriving text from the first paragraph", () => {
    const payload = toSectionContentPayload({
      paragraphs: [" Use the base verb form. ", "", "Add -s for he/she/it."],
      bullets: ["Subject + verb", " ", "Add -s for third person"],
      examples: [
        { text: " She works every day. ", translation: "Cô ấy làm việc mỗi ngày." },
        { text: "   " },
      ],
    });
    assert.deepEqual(payload, {
      text: "Use the base verb form.",
      paragraphs: ["Use the base verb form.", "Add -s for he/she/it."],
      bullets: ["Subject + verb", "Add -s for third person"],
      examples: [
        {
          text: "She works every day.",
          translation: "Cô ấy làm việc mỗi ngày.",
        },
      ],
      audioExamples: [],
    });
  });

  it("round-trips through normalizeSectionContent without losing structure", () => {
    const payload = toSectionContentPayload({
      paragraphs: ["Intro paragraph."],
      bullets: ["Point one"],
      examples: [{ label: "Example 1", text: "Good morning.", explanation: "Greeting." }],
    });
    const normalized = normalizeSectionContent(payload);
    assert.deepEqual(normalized, {
      text: "Intro paragraph.",
      paragraphs: ["Intro paragraph."],
      bullets: ["Point one"],
      examples: [
        {
          label: "Example 1",
          text: "Good morning.",
          translation: undefined,
          explanation: "Greeting.",
        },
      ],
      audioExamples: [],
    });
  });

  it("produces an empty-but-valid payload for a section with no content yet", () => {
    assert.deepEqual(
      toSectionContentPayload({ paragraphs: [], bullets: [], examples: [] }),
      { text: "", paragraphs: [], bullets: [], examples: [], audioExamples: [] },
    );
  });

  it("trims audio examples and drops entries without a term or audioUrl", () => {
    const payload = toSectionContentPayload({
      paragraphs: ["x"],
      bullets: [],
      examples: [],
      audioExamples: [
        {
          term: " hello ",
          ipa: " /həˈloʊ/ ",
          meaning: " Xin chào ",
          audioUrl: " https://cdn.example.test/hello.mp3 ",
          accent: " Anh-Mỹ ",
        },
        { term: "", audioUrl: "https://x.test/x.mp3" },
        { term: "no-url", audioUrl: "" },
      ],
    });
    assert.deepEqual(payload.audioExamples, [
      {
        term: "hello",
        audioUrl: "https://cdn.example.test/hello.mp3",
        ipa: "/həˈloʊ/",
        meaning: "Xin chào",
        accent: "Anh-Mỹ",
      },
    ]);
  });

  it("NEW_SECTION_CANONICAL_PAYLOAD_ONLY: a brand-new Section (no originalContent) never carries legacy/unknown keys", () => {
    const payload = toSectionContentPayload({
      paragraphs: ["x"],
      bullets: [],
      examples: [],
    });
    assert.deepEqual(Object.keys(payload).sort(), [
      "audioExamples",
      "bullets",
      "examples",
      "paragraphs",
      "text",
    ]);
  });

  it("SECTION_EXTENSION_FIELDS_PRESERVED: editing an existing Section preserves formulas/items/unknown keys untouched", () => {
    const original = {
      text: "Old text",
      paragraphs: ["Old text"],
      bullets: ["Old bullet"],
      formulas: ["S + V(s/es)"],
      items: [{ term: "go", meaning: "đi" }],
      legacyExtension: { note: "kept as-is" },
    };
    const payload = toSectionContentPayload(
      {
        paragraphs: ["New text"],
        bullets: ["New bullet"],
        examples: [],
      },
      original,
    );
    assert.deepEqual(payload.formulas, ["S + V(s/es)"]);
    assert.deepEqual(payload.items, [{ term: "go", meaning: "đi" }]);
    assert.deepEqual(payload.legacyExtension, { note: "kept as-is" });
    assert.deepEqual(payload.paragraphs, ["New text"]);
    assert.deepEqual(payload.bullets, ["New bullet"]);
    // the merge must not mutate the caller's original object
    assert.deepEqual(original.paragraphs, ["Old text"]);
  });

  it("preserves a per-item unmanaged field on audioExamples (real Course 12/Lesson 656 shape carries a legacy `source` field) through edit-save-reload", () => {
    const stored = {
      text: "x",
      paragraphs: ["x"],
      audioExamples: [
        {
          term: "think",
          ipa: "/θɪŋk/",
          meaning: "nghĩ; cho rằng",
          accent: "US",
          source: "BreadTrans managed vocabulary audio",
          audioUrl: "https://cdn.example.test/think.mp3",
        },
      ],
    };
    const form = sectionToFormState({ heading: "Ví dụ song ngữ", content: stored });
    assert.equal(form.audioExamples.length, 1);
    assert.deepEqual(form.audioExamples[0].extra, {
      source: "BreadTrans managed vocabulary audio",
    });
    // Admin edits only the term — the saved payload must still carry `source`.
    const edited = [
      { ...form.audioExamples[0], term: "think carefully" },
    ];
    const payload = toSectionContentPayload(
      { paragraphs: ["x"], bullets: [], examples: [], audioExamples: edited },
      stored,
    );
    assert.deepEqual(payload.audioExamples, [
      {
        source: "BreadTrans managed vocabulary audio",
        term: "think carefully",
        audioUrl: "https://cdn.example.test/think.mp3",
        ipa: "/θɪŋk/",
        meaning: "nghĩ; cho rằng",
        accent: "US",
      },
    ]);
  });

  it("preserves audioExamples on an existing Section when the Admin only edits text/bullets", () => {
    const original = {
      text: "Old text",
      paragraphs: ["Old text"],
      bullets: [],
      audioExamples: [
        { term: "hello", audioUrl: "https://cdn.example.test/hello.mp3" },
      ],
    };
    const payload = toSectionContentPayload(
      { paragraphs: ["Old text"], bullets: ["New bullet"], examples: [] },
      original,
    );
    // audioExamples is a CMS-managed field: the writer trusts `input`
    // completely for it (same contract as bullets/examples), so a caller
    // that re-seeds its form from sectionToFormState (as the real editor
    // does) must pass the existing audioExamples back through to keep them.
    const payloadWithAudioCarried = toSectionContentPayload(
      {
        paragraphs: ["Old text"],
        bullets: ["New bullet"],
        examples: [],
        audioExamples: original.audioExamples,
      },
      original,
    );
    assert.deepEqual(payload.audioExamples, []);
    assert.deepEqual(payloadWithAudioCarried.audioExamples, [
      { term: "hello", audioUrl: "https://cdn.example.test/hello.mp3" },
    ]);
  });

  it("a stale duplicate managed key on the original content is replaced, not merged, by the new canonical value", () => {
    const original = { text: "Old", paragraphs: ["Old"], bullets: ["Stale"] };
    const payload = toSectionContentPayload(
      { paragraphs: ["New"], bullets: ["Fresh"], examples: [] },
      original,
    );
    assert.deepEqual(payload.bullets, ["Fresh"]);
  });
});

describe("AI-applied round trip", () => {
  it("a rich AI-applied section (paragraphs/bullets/examples/audioExamples) survives sectionToFormState -> toSectionContentPayload -> normalize with no field loss", () => {
    const aiCandidateContent = {
      text: "Use the base verb form.",
      paragraphs: ["Use the base verb form.", "Add -s for he/she/it."],
      bullets: ["Subject + verb", "Add -s for third person"],
      examples: [
        {
          text: "She works every day.",
          translation: "Cô ấy làm việc mỗi ngày.",
          explanation: "Third-person -s.",
        },
      ],
      audioExamples: [
        {
          term: "works",
          ipa: "/wɜːrks/",
          meaning: "làm việc",
          audioUrl: "https://cdn.example.test/works.mp3",
        },
      ],
    };
    const form = sectionToFormState({
      type: "THEORY",
      heading: "Present simple",
      content: aiCandidateContent,
    });
    const saved = toSectionContentPayload(
      {
        paragraphs: form.text.split(/\n{2,}/),
        bullets: form.bullets,
        examples: form.examples,
        audioExamples: form.audioExamples,
      },
      aiCandidateContent,
    );
    const reloaded = normalizeSectionContent(saved);
    assert.deepEqual(reloaded.paragraphs, aiCandidateContent.paragraphs);
    assert.deepEqual(reloaded.bullets, aiCandidateContent.bullets);
    assert.equal(reloaded.examples.length, 1);
    assert.equal(reloaded.examples[0].translation, "Cô ấy làm việc mỗi ngày.");
    assert.equal(reloaded.examples[0].explanation, "Third-person -s.");
    assert.deepEqual(reloaded.audioExamples, [
      { ...aiCandidateContent.audioExamples[0], accent: undefined },
    ]);
  });
});

describe("sectionToFormState", () => {
  it("seeds the editor form from a stored section, splitting paragraphs back into editable text", () => {
    const form = sectionToFormState({
      type: "THEORY",
      heading: "Present simple",
      content: {
        text: "Use the base verb form.",
        paragraphs: ["Use the base verb form.", "Add -s for he/she/it."],
        bullets: ["Subject + verb", "Add -s for third person"],
        examples: [
          {
            text: "She works every day.",
            translation: "Cô ấy làm việc mỗi ngày.",
          },
        ],
      },
      isRequired: true,
    });
    assert.deepEqual(form, {
      type: "THEORY",
      heading: "Present simple",
      text: "Use the base verb form.\n\nAdd -s for he/she/it.",
      bullets: ["Subject + verb", "Add -s for third person"],
      examples: [
        {
          text: "She works every day.",
          translation: "Cô ấy làm việc mỗi ngày.",
          explanation: "",
        },
      ],
      audioExamples: [],
      isRequired: true,
    });
  });

  it("defaults type, isRequired and empty lists for a bare section", () => {
    const form = sectionToFormState({ heading: "Goal", content: null });
    assert.deepEqual(form, {
      type: "THEORY",
      heading: "Goal",
      text: "",
      bullets: [],
      examples: [],
      audioExamples: [],
      isRequired: true,
    });
  });

  it("treats isRequired: false as not required, and any other value as required", () => {
    assert.equal(
      sectionToFormState({ heading: "X", isRequired: false }).isRequired,
      false,
    );
    assert.equal(
      sectionToFormState({ heading: "X", isRequired: undefined }).isRequired,
      true,
    );
  });

  it("round-trips a rich AI-applied section without losing bullets or examples", () => {
    const stored = {
      type: "EXAMPLE",
      heading: "Everyday routines",
      content: toSectionContentPayload({
        paragraphs: ["Here are some routines."],
        bullets: [],
        examples: [
          { text: "He wakes up at six." },
          { text: "They commute by bus.", explanation: "Plural subject." },
        ],
      }),
      isRequired: true,
    };
    const form = sectionToFormState(stored);
    assert.equal(form.examples.length, 2);
    assert.deepEqual(form.examples[1], {
      text: "They commute by bus.",
      translation: "",
      explanation: "Plural subject.",
    });
  });

  it("seeds audioExamples with blank optional fields normalized to empty strings", () => {
    const form = sectionToFormState({
      heading: "Pronunciation",
      content: {
        audioExamples: [
          { term: "hello", audioUrl: "https://cdn.example.test/hello.mp3" },
        ],
      },
    });
    assert.deepEqual(form.audioExamples, [
      {
        term: "hello",
        ipa: "",
        meaning: "",
        audioUrl: "https://cdn.example.test/hello.mp3",
        accent: "",
      },
    ]);
  });
});

describe("swapAt", () => {
  it("swaps two items and leaves the rest untouched", () => {
    assert.deepEqual(swapAt(["a", "b", "c", "d"], 1, 3), ["a", "d", "c", "b"]);
  });

  it("does not mutate the original array", () => {
    const original = ["a", "b", "c"];
    const swapped = swapAt(original, 0, 2);
    assert.deepEqual(original, ["a", "b", "c"]);
    assert.deepEqual(swapped, ["c", "b", "a"]);
  });

  it("is a no-op when swapping an index with itself", () => {
    assert.deepEqual(swapAt(["a", "b"], 0, 0), ["a", "b"]);
  });
});
