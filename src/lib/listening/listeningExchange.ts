/**
 * "Nghe hiểu (câu ngắn)" items may be a short exchange between two people
 * (owner 2026-11-22). The CMS "Câu nghe" field marks each turn with a speaker
 * label at the start of a line; the question then stores the turns as
 * content.transcriptSegments, in the shape a dialogue uses, and its clip is
 * read in one voice per speaker. Pure: no React, no network.
 */

export type ExchangeTurn = {
  speaker: string;
  text: string;
  /** Set for Man / Woman so the voice matches the label. */
  voiceKey?: string;
};

/** The labels a turn may start with, case-insensitive, and what they store. */
const LABELS: Record<string, { speaker: string; voiceKey?: string }> = {
  a: { speaker: "A" },
  b: { speaker: "B" },
  man: { speaker: "Man", voiceKey: "male-01" },
  nam: { speaker: "Man", voiceKey: "male-01" },
  woman: { speaker: "Woman", voiceKey: "female-01" },
  "nữ": { speaker: "Woman", voiceKey: "female-01" },
};

const LABEL_LINE = /^(a|b|man|woman|nam|nữ)\s*:\s*(.*)$/iu;

/**
 * The turns of an exchange, or null when the text is a single sentence: two
 * or more turns from at least two speakers make an exchange. A line without
 * a label continues the turn above it; text before the first label means the
 * whole text is one sentence.
 */
export function parseListeningExchange(value: string): ExchangeTurn[] | null {
  const turns: ExchangeTurn[] = [];
  for (const raw of value.normalize("NFC").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const match = LABEL_LINE.exec(line);
    if (match) {
      const label = LABELS[match[1].toLocaleLowerCase("vi-VN")];
      const text = match[2].trim();
      turns.push(
        label.voiceKey
          ? { speaker: label.speaker, text, voiceKey: label.voiceKey }
          : { speaker: label.speaker, text },
      );
    } else if (turns.length) {
      const last = turns[turns.length - 1];
      last.text = last.text ? `${last.text} ${line}` : line;
    } else {
      return null;
    }
  }
  const spoken = turns.filter((turn) => turn.text);
  return spoken.length >= 2 && new Set(spoken.map((turn) => turn.speaker)).size >= 2
    ? spoken
    : null;
}

type StoredTurn = { speaker: string; text: string; translation?: string };

/**
 * Stored turns that make an exchange (two or more, at least two speakers),
 * or [] for anything else: what a learner sees as "A: …" / "B: …".
 */
export function exchangeTurnsOf(value: unknown): StoredTurn[] {
  if (!Array.isArray(value)) return [];
  const turns = value.flatMap((segment): StoredTurn[] => {
    const speaker = typeof segment?.speaker === "string" ? segment.speaker.trim() : "";
    const text = typeof segment?.text === "string" ? segment.text.trim() : "";
    if (!speaker || !text) return [];
    const translation =
      typeof segment?.translation === "string" ? segment.translation.trim() : "";
    return [translation ? { speaker, text, translation } : { speaker, text }];
  });
  return turns.length >= 2 && new Set(turns.map((turn) => turn.speaker)).size >= 2
    ? turns
    : [];
}

/**
 * Stored turns written back as the "Câu nghe" field ("A: …" per line), when
 * they read back as the same exchange; null otherwise (a single sentence, or
 * turns the field cannot write, such as a dialogue's "Customer").
 */
export function listeningExchangeText(segments: unknown): string | null {
  const turns = exchangeTurnsOf(segments);
  if (!turns.length) return null;
  const text = turns.map((turn) => `${turn.speaker}: ${turn.text}`).join("\n");
  return parseListeningExchange(text)?.length === turns.length ? text : null;
}

/**
 * What a "Câu nghe" field saves. An exchange: its turns, and audioText as
 * their text joined without labels (search, the mistakes notebook and older
 * readers use audioText). A single sentence: audioText alone, as before;
 * when the question was an exchange, an empty turn list clears its turns.
 */
export function comprehensionSpokenContent(
  fieldText: string,
  storedSegments?: unknown,
): { audioText: string; transcriptSegments?: ExchangeTurn[] } {
  const turns = parseListeningExchange(fieldText);
  if (turns)
    return {
      audioText: turns.map((turn) => turn.text).join(" "),
      transcriptSegments: turns,
    };
  return listeningExchangeText(storedSegments)
    ? { audioText: fieldText.trim(), transcriptSegments: [] }
    : { audioText: fieldText.trim() };
}
