/**
 * Vietnamese learner-facing titles for published practice content.
 *
 * Keyed by stable identity (quiz id, Speaking practice set key, grammar topic
 * id), never by title text: the stored English title, ids, routes, answer
 * keys and history stay as they are. The CEFR suffix is generated from the
 * API's `cefrLevel`, the same level that decides access, so the title cannot
 * disagree with the label or the lock. Content without an entry keeps its
 * stored title. Learning prompts, dictation targets and writing keywords are
 * English and are never translated here.
 */
import { parseCefrLevel, CEFR_ORDER } from "../practice/catalogFilters.ts";

/** Listening, Reading and Writing practice quizzes. */
const QUIZ_TITLES: Record<number, string> = {
  // Listening — comprehension
  1: "Giao tiếp hằng ngày",
  5: "Hội thoại nơi công sở",
  9: "Tiếng Anh thiết yếu hằng ngày",
  10: "Du lịch và dịch vụ",
  11: "Công việc và cuộc họp",
  12: "Suy luận ý định người nói",
  // Listening — dictation and dialogue
  23: "Nghe chép: tin nhắn hằng ngày",
  24: "Nghe chép: du lịch và chỉ đường",
  25: "Nghe chép: cập nhật công việc",
  26: "Hội thoại: gọi món tại quán cà phê",
  27: "Hội thoại: lên kế hoạch dự án",
  28: "Hội thoại: hỗ trợ khách hàng",
  // Reading
  2: "Thông báo và tin nhắn",
  13: "Văn bản đời thường",
  6: "Tài liệu công việc",
  14: "Tiếng Anh thực tế",
  15: "Công việc và báo cáo",
  16: "Phân tích và suy luận",
  // Writing
  3: "Viết câu theo tình huống",
  4: "Viết email công việc",
  7: "Viết email xử lý vấn đề",
  17: "Viết tin nhắn và email ngắn",
  18: "Viết thư giao tiếp công việc",
  19: "Viết bài lập luận và đề xuất giải pháp",
};

/** Speaking practice sets, by their stable set key. */
const SPEAKING_SET_TITLES: Record<string, string> = {
  "practice-read-aloud-a1-a2": "Đọc thành tiếng câu đời thường",
  "practice-read-aloud-b1-b2": "Đọc thành tiếng trong công việc",
  "practice-question-response-a2": "Trả lời câu hỏi đời sống",
  "practice-question-response-b1-b2": "Trả lời câu hỏi học tập và công việc",
  "practice-describe-picture-b1": "Mô tả tranh",
  "practice-information-response-b1-b2": "Trả lời dựa trên thông tin",
  "practice-opinion-b1-b2": "Trình bày quan điểm",
  "practice-opinion-c1": "Bảo vệ quan điểm về vấn đề xã hội",
  "practice-pronunciation-b1": "Nền tảng phát âm",
};

export type GrammarCategory = "WORD_CLASS" | "VERB" | "OTHER";

export const GRAMMAR_CATEGORY_LABEL: Record<GrammarCategory, string> = {
  WORD_CLASS: "Từ loại",
  VERB: "Động từ",
  OTHER: "Ngữ pháp khác",
};

export const GRAMMAR_CATEGORY_ORDER: GrammarCategory[] = ["WORD_CLASS", "VERB", "OTHER"];

/** Grammar topics: Vietnamese title and the part of grammar it teaches. */
const GRAMMAR_TOPICS: Record<number, { title: string; category: GrammarCategory }> = {
  13: { title: "Thì hiện tại đơn và trạng từ tần suất", category: "VERB" },
  14: { title: "Thì quá khứ đơn và trạng từ thời gian", category: "VERB" },
  3: { title: "Thì hiện tại hoàn thành", category: "VERB" },
  4: { title: "Các cách diễn đạt tương lai", category: "VERB" },
  5: { title: "Các loại từ trong câu", category: "WORD_CLASS" },
  6: { title: "Động từ khuyết thiếu và lời đề nghị lịch sự", category: "VERB" },
  7: { title: "Câu bị động", category: "VERB" },
  8: { title: "So sánh và lượng từ", category: "WORD_CLASS" },
  9: { title: "Câu điều kiện", category: "OTHER" },
  10: { title: "Mệnh đề quan hệ", category: "OTHER" },
  11: { title: "Danh động từ và động từ nguyên mẫu", category: "VERB" },
  // Links clauses and sentences (although / however / therefore): clause
  // level, like conditionals and relative clauses.
  12: { title: "Từ nối và liên kết ý", category: "OTHER" },
};

function withLevel(title: string, cefrLevel?: string | null): string {
  const range = parseCefrLevel(cefrLevel);
  if (!range) return title;
  const span =
    range.min === range.max
      ? CEFR_ORDER[range.min]
      : `${CEFR_ORDER[range.min]}–${CEFR_ORDER[range.max]}`;
  return `${title} (${span})`;
}

/** "Viết email công việc (B1)"; the stored title when there is no entry. */
export function quizDisplayTitle(
  id: number | null | undefined,
  storedTitle: string,
  cefrLevel?: string | null,
): string {
  const title = id == null ? undefined : QUIZ_TITLES[id];
  // Detail endpoints send no cefrLevel; the stored title carries the same
  // authored tag the API reads for standalone practice.
  return title
    ? withLevel(title, cefrLevel === undefined ? storedTitle : cefrLevel)
    : storedTitle;
}

export function speakingSetDisplayTitle(
  key: string | null | undefined,
  storedTitle: string,
  cefrLevel?: string | null,
): string {
  const title = key ? SPEAKING_SET_TITLES[key] : undefined;
  return title ? withLevel(title, cefrLevel) : storedTitle;
}

export function grammarDisplayTitle(id: number, storedTitle: string): string {
  return GRAMMAR_TOPICS[id]?.title ?? storedTitle;
}

/** Topics without an entry are grouped under "Ngữ pháp khác". */
export function grammarCategory(id: number): GrammarCategory {
  return GRAMMAR_TOPICS[id]?.category ?? "OTHER";
}
