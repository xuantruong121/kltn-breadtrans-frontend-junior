/**
 * What "Lấy phiên âm" does with the external dictionary's answer (owner
 * 2026-11-28). It fills only the boxes that are empty, and says in words what
 * it did: the old button said "Đã điền phiên âm" even when it had filled
 * nothing, and gave no hint that a UK phonetics was only the dictionary's one
 * general phonetics. Pure, for the Node test runner.
 */
export type PhoneticsAnswer = {
  found: boolean;
  /** Both dictionaries failed to answer: not the same as "no phonetics". */
  unavailable: boolean;
  ipaUs: string | null;
  ipaUk: string | null;
  usIsShared: boolean;
  ukIsShared: boolean;
  audioUs: string | null;
  audioUk: string | null;
  /** The AI answers when the public dictionary does not in time; its phonetics is a suggestion. */
  source?: "DICTIONARY" | "AI" | null;
};

export type PhoneticsFields = {
  ipaUs: string;
  ipaUk: string;
  audioUs: string;
  audioUk: string;
};

export type PhoneticsOutcome = {
  next: PhoneticsFields;
  kind: "success" | "info" | "error";
  message: string;
};

const clean = (value: string | null | undefined) => String(value ?? "").trim();

export function fillFromPhonetics(current: PhoneticsFields, answer: PhoneticsAnswer): PhoneticsOutcome {
  if (answer.unavailable) {
    return {
      next: current,
      kind: "error",
      message: "Chưa tra được từ điển lúc này. Thử lại sau, hoặc bấm Gợi ý bằng AI.",
    };
  }
  const ipaUs = clean(answer.ipaUs);
  const ipaUk = clean(answer.ipaUk);
  if (!answer.found || (!ipaUs && !ipaUk)) {
    return {
      next: current,
      kind: "error",
      message: "Từ điển chưa có phiên âm cho từ này. Thử bấm Gợi ý bằng AI.",
    };
  }

  const fillUs = !clean(current.ipaUs) && Boolean(ipaUs);
  const fillUk = !clean(current.ipaUk) && Boolean(ipaUk);
  const audioUs = clean(answer.audioUs);
  const audioUk = clean(answer.audioUk);
  const fillAudioUs = !clean(current.audioUs) && Boolean(audioUs);
  const fillAudioUk = !clean(current.audioUk) && Boolean(audioUk);
  const next: PhoneticsFields = {
    ipaUs: fillUs ? ipaUs : current.ipaUs,
    ipaUk: fillUk ? ipaUk : current.ipaUk,
    audioUs: fillAudioUs ? audioUs : current.audioUs,
    audioUk: fillAudioUk ? audioUk : current.audioUk,
  };

  if (!fillUs && !fillUk && !fillAudioUs && !fillAudioUk) {
    const said = [ipaUs && `US ${ipaUs}`, ipaUk && `UK ${ipaUk}`].filter(Boolean).join(", ");
    return {
      next,
      kind: "info",
      message: `Từ điển có ${said}. Các ô đã có chữ nên giữ nguyên.`,
    };
  }

  const accents = [fillUs && "US", fillUk && "UK"].filter(Boolean) as string[];
  const sharedAccents = [fillUs && answer.usIsShared && "US", fillUk && answer.ukIsShared && "UK"].filter(Boolean) as string[];
  const parts: string[] = [];
  if (accents.length) parts.push(`Đã điền phiên âm ${accents.join(" và ")}.`);
  if (accents.length && answer.source === "AI") {
    parts.push("Từ điển ngoài chưa trả lời kịp nên phiên âm này do AI gợi ý: kiểm lại trước khi lưu.");
  }
  if (sharedAccents.length) {
    parts.push(
      `Từ điển chỉ có một phiên âm chung, đã dùng cho ${sharedAccents.join(" và ")}: kiểm lại trước khi lưu.`,
    );
  }
  if (fillAudioUs || fillAudioUk) parts.push("Đã điền cả audio.");
  else if (!audioUs && !audioUk && !clean(current.audioUs) && !clean(current.audioUk)) {
    parts.push("Từ điển không có audio dùng được: học viên sẽ nghe giọng máy của trình duyệt.");
  }
  return { next, kind: "success", message: parts.join(" ") };
}

/** The phonetics the bulk fill saves for a word: trimmed, empty when the dictionary had none. */
export function bulkPhonetics(answer: PhoneticsAnswer | null | undefined): { ipaUs: string; ipaUk: string } {
  if (!answer || answer.unavailable || !answer.found) return { ipaUs: "", ipaUk: "" };
  return { ipaUs: clean(answer.ipaUs), ipaUk: clean(answer.ipaUk) };
}
