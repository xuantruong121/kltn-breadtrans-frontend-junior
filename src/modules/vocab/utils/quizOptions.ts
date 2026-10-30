/**
 * The 4 meanings the "Trắc nghiệm" step offers for one word: the right one
 * and up to 3 from other words in the deck, then generic fallbacks when the
 * deck has fewer than 4 distinct meanings. Pure, so the admin preview shows
 * exactly what a learner gets.
 */

export const QUIZ_FALLBACK_MEANINGS = [
  "đồng ý, tán thành",
  "thực hiện, tiến hành",
  "thông báo, tuyên bố",
  "sắp xếp, lên kế hoạch",
  "phát triển, mở rộng",
  "hoàn thành, kết thúc",
];

export interface BuiltQuizOption {
  id: string;
  key: "1" | "2" | "3" | "4";
  text: string;
  isCorrect: boolean;
}

export function shuffleArray<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = result[i]!;
    result[i] = result[j]!;
    result[j] = temp;
  }
  return result;
}

export function buildQuizOptions(
  current: { id: number; meaning: string },
  words: Array<{ id: number; meaning: string }>,
  shuffle: <T>(arr: T[]) => T[] = shuffleArray,
): { options: BuiltQuizOption[]; fallbackCount: number } {
  const correctMeaning = current.meaning.trim();
  const others = shuffle(
    words.filter(
      (w) => w.id !== current.id && w.meaning.trim() !== correctMeaning,
    ),
  );
  const distractors: string[] = [];
  for (const w of others) {
    const meaning = w.meaning.trim();
    if (!distractors.includes(meaning)) distractors.push(meaning);
    if (distractors.length === 3) break;
  }
  const fromDeck = distractors.length;
  for (const fallback of QUIZ_FALLBACK_MEANINGS) {
    if (distractors.length >= 3) break;
    if (fallback !== correctMeaning && !distractors.includes(fallback))
      distractors.push(fallback);
  }
  const keys: Array<"1" | "2" | "3" | "4"> = ["1", "2", "3", "4"];
  const options = shuffle([
    { text: correctMeaning, isCorrect: true },
    ...distractors.map((text) => ({ text, isCorrect: false })),
  ]).map((option, index) => ({
    id: `${current.id}-${index}`,
    key: keys[index]!,
    ...option,
  }));
  return { options, fallbackCount: 3 - fromDeck };
}
