/** Pure helpers for the grammar topic editor. */

export const GRAMMAR_LEVELS = [
  { value: "BEGINNER", label: "Cơ bản" },
  { value: "INTERMEDIATE", label: "Trung cấp" },
  { value: "ADVANCED", label: "Nâng cao" },
] as const;

export const grammarLevelLabel = (value?: string | null) =>
  GRAMMAR_LEVELS.find((level) => level.value === value)?.label ?? value ?? "";

/**
 * The video id from a YouTube link (watch, youtu.be, embed, shorts) or a
 * bare 11-character id; "" when the input is neither.
 */
export function youtubeIdFrom(input: string): string {
  const value = input.trim();
  if (!value) return "";
  const match =
    /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/.exec(
      value,
    );
  if (match) return match[1];
  return /^[\w-]{11}$/.test(value) ? value : "";
}

export const OPTION_LETTERS = ["A", "B", "C", "D"];

export type GrammarDraft = {
  question: string;
  options: string[];
  correctIndex: number;
  explanation?: string | null;
  /** Why each wrong option is wrong, aligned with options. */
  optionExplanations?: Array<string | null> | null;
};

/** Same rule as the server: a prompt, exactly 4 distinct options, an answer. */
export function questionProblems(q: {
  question: string;
  options: string[];
  correctIndex: number | null;
}): string[] {
  const problems: string[] = [];
  if (!q.question.trim()) problems.push("Thiếu đề bài");
  if (q.options.length !== 4)
    problems.push(`Cần đúng 4 đáp án (đang có ${q.options.length})`);
  const texts = q.options.map((o) => o.trim().toLocaleLowerCase("vi"));
  if (texts.some((t) => !t)) problems.push("Có đáp án để trống");
  const filledTexts = texts.filter(Boolean);
  if (new Set(filledTexts).size < filledTexts.length)
    problems.push("Có hai đáp án giống nhau");
  if (
    q.correctIndex === null ||
    !Number.isInteger(q.correctIndex) ||
    q.correctIndex < 0 ||
    q.correctIndex >= q.options.length
  )
    problems.push("Chưa chọn đáp án đúng");
  return problems;
}

/** Wrong options that have a "why it is wrong" note. */
export const rationaleCount = (q: GrammarDraft) =>
  (q.optionExplanations ?? []).filter(
    (note, index) => index !== q.correctIndex && String(note ?? "").trim(),
  ).length;

export type ChecklistItem = {
  label: string;
  done: boolean;
  /** Advisory items never block publishing. */
  optional?: boolean;
};

const filled = (v?: string | null) => String(v ?? "").trim() !== "";

/** The publish preflight (required) plus explanation gaps (advisory). */
export function grammarChecklist(topic: {
  title: string;
  description: string;
  questions: GrammarDraft[];
}): ChecklistItem[] {
  const n = topic.questions.length;
  const explained = topic.questions.filter((q) => filled(q.explanation)).length;
  const withRationale = topic.questions.filter(
    (q) => rationaleCount(q) === 3,
  ).length;
  const items: ChecklistItem[] = [
    { label: "Có tên chủ đề", done: filled(topic.title) },
    { label: "Có phần lý thuyết", done: filled(topic.description) },
    { label: "Có ít nhất 1 câu hỏi", done: n > 0 },
  ];
  if (n)
    items.push(
      {
        label: "Mỗi câu có 4 phương án khác nhau và đáp án đúng",
        done: topic.questions.every((q) => !questionProblems(q).length),
      },
      {
        label: `Giải thích ${explained}/${n} câu`,
        done: explained === n,
        optional: true,
      },
      {
        label: `Lý do sai đủ 3 phương án ${withRationale}/${n} câu`,
        done: withRationale === n,
        optional: true,
      },
    );
  return items;
}

/** Why publishing is not possible yet, or null when it is. */
export function publishBlocker(
  checklist: ChecklistItem[],
  unsaved: boolean,
): string | null {
  if (unsaved) return "Lưu thay đổi trước khi xuất bản.";
  const missing = checklist.filter((item) => !item.optional && !item.done);
  return missing.length
    ? `Còn thiếu: ${missing.map((item) => item.label.toLowerCase()).join("; ")}.`
    : null;
}

export type PastedQuestion = GrammarDraft & {
  /** 1-based number of the pasted block, for messages. */
  block: number;
  problems: string[];
  duplicate: boolean;
};

export const GRAMMAR_PASTE_SAMPLE = `The technician ____ the printer yesterday afternoon.
*A. repaired
B. repairs # Hiện tại đơn, không hợp với "yesterday"
C. repair # Động từ nguyên mẫu, chưa chia thì
D. repairing # V-ing cần trợ động từ
Giải thích: "yesterday" là mốc quá khứ nên dùng quá khứ đơn (V2/V-ed).

She ____ to work by bus every day.
A. go
*B. goes
C. going
D. gone
Giải thích: Chủ ngữ ngôi thứ ba số ít, thì hiện tại đơn: thêm -es.`;

const EXPLANATION_LINE = /^(giải thích|giai thich|explanation|gt)\s*[:：]\s*/i;
const ANSWER_LINE = /^(đáp án|dap an|answer)\s*[:：]\s*\(?([A-Da-d1-4])\)?\s*$/i;
const OPTION_LABEL = /^\(?([A-Da-d])[.)]\s+/;

const letterIndex = (raw: string) => {
  const value = raw.trim().toUpperCase();
  const byLetter = OPTION_LETTERS.indexOf(value);
  if (byLetter >= 0) return byLetter;
  const byNumber = Number(value);
  return Number.isInteger(byNumber) && byNumber >= 1 && byNumber <= 4
    ? byNumber - 1
    : -1;
};

const stripNumbering = (line: string) =>
  line.replace(/^\s*(?:câu\s*)?\d+\s*[.):]\s*/i, "").trim();

/** One option line: "*B. text # why wrong", "= text", "(c) text". */
function parseOptionLine(raw: string) {
  let line = raw.trim();
  let correct = false;
  if (/^[*=]/.test(line)) {
    correct = true;
    line = line.slice(1).trim();
  } else if (/^[~-]\s/.test(line)) {
    line = line.slice(1).trim();
  }
  line = line.replace(OPTION_LABEL, "");
  if (/\s\*$/.test(line)) {
    correct = true;
    line = line.slice(0, -1).trim();
  }
  const hash = line.indexOf(" # ");
  const text = (hash >= 0 ? line.slice(0, hash) : line).trim();
  const note = hash >= 0 ? line.slice(hash + 3).trim() : "";
  return { text, note, correct };
}

function finish(
  draft: GrammarDraft,
  block: number,
  extra: string[] = [],
): Omit<PastedQuestion, "duplicate"> {
  const notes = draft.optionExplanations ?? [];
  const optionExplanations = notes.some(Boolean)
    ? draft.options.map((_, i) =>
        i === draft.correctIndex ? null : notes[i] || null,
      )
    : null;
  return {
    ...draft,
    optionExplanations,
    block,
    problems: [...extra, ...questionProblems(draft)],
  };
}

/** A GIFT-like block: prompt, 4 option lines, optional explanation. */
function parseBlock(lines: string[], block: number) {
  const [first, ...rest] = lines;
  const options: string[] = [];
  const notes: string[] = [];
  const explanation: string[] = [];
  const extra: string[] = [];
  let correctIndex = -1;
  let marked = 0;
  let inExplanation = false;
  for (const line of rest) {
    if (EXPLANATION_LINE.test(line)) {
      inExplanation = true;
      explanation.push(line.replace(EXPLANATION_LINE, ""));
      continue;
    }
    if (inExplanation) {
      explanation.push(line.trim());
      continue;
    }
    const answer = ANSWER_LINE.exec(line.trim());
    if (answer) {
      correctIndex = letterIndex(answer[2]);
      marked += 1;
      continue;
    }
    const option = parseOptionLine(line);
    if (option.correct) {
      correctIndex = options.length;
      marked += 1;
    }
    options.push(option.text);
    notes.push(option.note);
  }
  if (marked > 1) extra.push("Đánh dấu nhiều hơn 1 đáp án đúng");
  return finish(
    {
      question: stripNumbering(first),
      options,
      correctIndex,
      explanation: explanation.join(" ").trim() || null,
      optionExplanations: notes,
    },
    block,
    extra,
  );
}

/** A spreadsheet row: question, A, B, C, D, answer (A–D or 1–4), explanation. */
function parseRow(line: string, block: number) {
  const cells = line.split("\t").map((cell) => cell.trim());
  const [question = "", a = "", b = "", c = "", d = "", answer = "", ...why] =
    cells;
  return finish(
    {
      question: stripNumbering(question),
      options: [a, b, c, d],
      correctIndex: letterIndex(answer),
      explanation: why.join(" ").trim() || null,
    },
    block,
  );
}

/**
 * Questions pasted as text. Two shapes: blocks separated by a blank line
 * (prompt, then options; `*` or `=` marks the answer, `# …` after an option
 * says why it is wrong, "Giải thích:" starts the explanation), or
 * spreadsheet rows with Tab-separated cells. Each result lists its problems
 * and whether its prompt repeats an existing or earlier question.
 */
export function parseGrammarPaste(
  text: string,
  existingPrompts: string[] = [],
): PastedQuestion[] {
  const key = (prompt: string) =>
    prompt.trim().toLocaleLowerCase("vi").replace(/\s+/g, " ");
  const seen = new Set(existingPrompts.map(key));
  const blocks = text
    .replace(/\r\n/g, "\n")
    .split(/\n\s*\n/)
    .map((chunk) =>
      chunk
        .split("\n")
        .map((line) => line.trimEnd())
        .filter((line) => line.trim()),
    )
    .filter((lines) => lines.length);
  const parsed: Array<Omit<PastedQuestion, "duplicate">> = [];
  for (const lines of blocks) {
    if (lines.every((line) => line.includes("\t")))
      lines.forEach((line) => parsed.push(parseRow(line, parsed.length + 1)));
    else parsed.push(parseBlock(lines, parsed.length + 1));
  }
  return parsed.map((row) => {
    const duplicate = seen.has(key(row.question));
    seen.add(key(row.question));
    return { ...row, duplicate };
  });
}
