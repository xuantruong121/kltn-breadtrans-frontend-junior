/**
 * "Hội thoại": a quiz has one conversation, copied into every multiple-choice
 * question, as every published dialogue quiz stores it. The shared recording
 * is made from those copies. The editor edits the conversation once; a save
 * writes it into each question. Until a question exists it is kept on the
 * quiz, in bilingualContent.draftTranscript. Pure: no I/O, unit-tested.
 */
import { isTranscriptHolder } from "./skillCmsStatus.ts";

export type DialogueTurn = {
  speaker: string;
  text: string;
  translation: string;
  /** Kept from the stored turn, so every copy stays identical. */
  voiceKey?: string;
  speakerId?: string;
};

type StoredQuestion = { id?: number; type?: string; content?: any };

/** The quiz metadata key that holds the conversation while no question carries it. */
export const DIALOGUE_DRAFT_KEY = "draftTranscript";

const isObject = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);

const text = (value: unknown) => String(value ?? "").trim();

export const emptyTurn = (): DialogueTurn => ({ speaker: "", text: "", translation: "" });

/**
 * Stored transcript turns, reduced to the fields the CMS accepts. A question
 * that copies them stays identical to the quiz transcript, so the audio
 * builder dedupes it into the same recording.
 */
export function transcriptForSave(segments: unknown): Array<Record<string, string>> {
  if (!Array.isArray(segments)) return [];
  return segments.flatMap((segment: any) => {
    const speaker = text(segment?.speaker);
    const words = text(segment?.text);
    if (!speaker || !words) return [];
    const turn: Record<string, string> = { speaker, text: words };
    for (const key of ["translation", "voiceKey", "speakerId"]) {
      const value = text(segment?.[key]);
      if (value) turn[key] = value;
    }
    return [turn];
  });
}

const carriesTurns = (question: StoredQuestion) =>
  Array.isArray(question.content?.transcriptSegments) && question.content.transcriptSegments.length > 0;

/**
 * Where a quiz's conversation is read from: a legacy turns question first,
 * then the first question that carries turns, then the draft on the quiz.
 */
export function dialogueSource(questions: StoredQuestion[] = [], metadata?: unknown) {
  const source =
    questions.find((question) => isTranscriptHolder(question) && carriesTurns(question)) ??
    questions.find(carriesTurns);
  const draft = isObject(metadata) ? metadata[DIALOGUE_DRAFT_KEY] : undefined;
  return {
    segments: (source ? source.content.transcriptSegments : Array.isArray(draft) ? draft : []) as unknown[],
    accent: source?.content?.accent === "UK" ? "UK" : "US",
  };
}

/** The editor rows for stored turns; one empty row when there are none. */
export function dialogueTurns(segments: unknown): DialogueTurn[] {
  const rows = (Array.isArray(segments) ? segments : []).filter(isObject).map((segment) => {
    const row: DialogueTurn = {
      speaker: String(segment.speaker ?? segment.speakerId ?? ""),
      text: String(segment.text ?? ""),
      translation: String(segment.translation ?? ""),
    };
    if (text(segment.voiceKey)) row.voiceKey = text(segment.voiceKey);
    if (text(segment.speakerId)) row.speakerId = text(segment.speakerId);
    return row;
  });
  return rows.length ? rows : [emptyTurn()];
}

/** A renamed speaker no longer has the old speaker's voice. */
export const renameSpeaker = (turn: DialogueTurn, speaker: string): DialogueTurn => ({
  speaker,
  text: turn.text,
  translation: turn.translation,
});

/** Why the conversation cannot play yet, or null. */
export function dialogueTurnsProblem(turns: Array<{ speaker: string; text: string }>): string | null {
  const filled = turns.filter((turn) => turn.speaker.trim() && turn.text.trim());
  return filled.length >= 2 && new Set(filled.map((turn) => turn.speaker.trim())).size >= 2
    ? null
    : "Lời thoại cần ít nhất 2 lượt lời của 2 người nói.";
}

/**
 * The conversation as every question stores it. A turn without a voice takes
 * the one its speaker had, as the server's merge does on a saved question, so
 * a new question's copy matches the others and the recording reads the
 * conversation once.
 */
export function dialogueForSave(turns: DialogueTurn[], stored: unknown): Array<Record<string, string>> {
  const old = (Array.isArray(stored) ? stored : []).filter(isObject);
  return transcriptForSave(turns).map((turn, index) => {
    const same =
      (old[index]?.speaker === turn.speaker ? old[index] : undefined) ??
      old.find((segment) => segment.speaker === turn.speaker);
    const carried: Record<string, string> = {};
    for (const key of ["voiceKey", "speakerId"]) {
      const value = text(same?.[key]);
      if (!turn[key] && value) carried[key] = value;
    }
    return { ...turn, ...carried };
  });
}

/** The fields a question carries for the conversation. */
export const dialogueQuestionContent = (conversation: Array<Record<string, string>>) => ({
  transcriptSegments: conversation,
  audioText: conversation.map((turn) => turn.text).join(" "),
});

/** The fields the recording tells copies apart by. */
const turnsKey = (segments: unknown) =>
  JSON.stringify(
    transcriptForSave(segments).map((turn) => [
      turn.speaker,
      turn.speakerId ?? "",
      turn.voiceKey ?? "",
      turn.text,
      turn.translation ?? "",
    ]),
  );

/**
 * What a save in "Hội thoại" writes. A question without turns always gets
 * the conversation; one with other turns gets it when the admin edited the
 * conversation, or when a legacy turns question holds it. A save that touched
 * nothing rewrites nothing. The legacy turns question goes, except on a quiz
 * with attempts, where the server refuses to delete a question.
 */
export function dialogueSavePlan(input: {
  questions: StoredQuestion[];
  conversation: Array<Record<string, string>>;
  edited: boolean;
  hasAttempts: boolean;
}) {
  const holders = input.questions.filter(isTranscriptHolder);
  const target = turnsKey(input.conversation);
  const update = input.questions
    .filter(
      (question) =>
        question.type === "MULTIPLE_CHOICE" &&
        turnsKey(question.content?.transcriptSegments) !== target &&
        (!carriesTurns(question) || input.edited || holders.length > 0),
    )
    .map((question) => question.id)
    .filter((id): id is number => typeof id === "number");
  const remove = input.hasAttempts
    ? []
    : holders.map((holder) => holder.id).filter((id): id is number => typeof id === "number");
  return { update, remove };
}

/** The quiz metadata on a save: it holds the conversation only while no question does. */
export function dialogueMetadata(
  metadata: Record<string, unknown>,
  conversation: Array<Record<string, string>>,
  carriedByQuestions: boolean,
) {
  const next = { ...metadata };
  delete next[DIALOGUE_DRAFT_KEY];
  if (!carriedByQuestions && conversation.length) next[DIALOGUE_DRAFT_KEY] = conversation;
  return next;
}
