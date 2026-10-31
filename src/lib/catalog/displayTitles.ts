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
  // Listening — dialogue drafts published 2026-10-31
  47: "Hội thoại: họp nhanh nhóm phần mềm",
  48: "Hội thoại: đặt mua văn phòng phẩm",
  49: "Hội thoại: giải thích chính sách hoàn tiền",
  50: "Hội thoại: đặt tour tham quan thành phố",
  51: "Hội thoại: mượn sách ở thư viện trường",
  52: "Hội thoại: mua sắm ở siêu thị",
  53: "Hội thoại: cài đặt laptop mới",
  54: "Hội thoại: chào đón đồng nghiệp mới",
  55: "Hội thoại: chọn laptop phù hợp",
  56: "Hội thoại: gọi món ở nhà hàng",
  57: "Hội thoại: tham gia nhóm học nâng cao",
  58: "Hội thoại: đi khám bác sĩ chuyên khoa",
  // Reading
  59: "Đặt mua văn phòng phẩm",
  60: "Chính sách hoàn tiền của cửa hàng",
  61: "Đặt tour tham quan thành phố",
  62: "Mượn sách ở thư viện trường",
  63: "Mua sắm ở siêu thị",
  64: "Cài đặt laptop làm việc mới",
  65: "Chào đón đồng nghiệp mới",
  66: "Chọn máy ảnh phù hợp",
  67: "Gọi món ở nhà hàng",
  68: "Tham gia nhóm học",
  69: "Buổi khám bệnh thời hiện đại",
  70: "Họp nhanh Agile hằng ngày",
  // Writing
  71: "Đặt tour tham quan thành phố",
  72: "Xin gia hạn sách thư viện",
  73: "Nhắn tin khi đi siêu thị",
  74: "Nhờ cài đặt laptop ở công ty",
  75: "Chào mừng đồng nghiệp mới",
  76: "Tư vấn sản phẩm cho khách hàng",
  77: "Đặt đồ ăn ở nhà hàng",
  78: "Xin tham gia nhóm học",
  79: "Quan điểm về khám bệnh trực tuyến",
  80: "Quan điểm về họp nhanh hằng ngày",
  81: "Đề xuất đặt mua văn phòng phẩm",
  82: "Đề xuất sửa chính sách hoàn tiền",
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
  "speaking-ef26e3ce-b162-4087-9911-4db95657fe28": "Giải thích chính sách hoàn tiền",
  "speaking-aa8ab0a3-3329-438c-aed0-8acf45ee2cc4": "Đặt tour tham quan thành phố",
  "speaking-d611b13e-8c4d-4bca-85f7-8072b5378b49": "Mượn sách ở thư viện trường",
  "speaking-4ff951dc-c58c-4f8a-957b-8c1af450d96b": "Mua sắm ở siêu thị",
  "speaking-472353d0-6498-4434-a745-60e672bc06b9": "Cài đặt laptop ở công ty",
  "speaking-e28bbe61-796f-447a-89f6-cc55b9820336": "Chào đón đồng nghiệp mới",
  "speaking-e18cd96f-79e3-4f12-b8ec-75ef1969fc93": "Tư vấn sản phẩm cho khách hàng",
  "speaking-2fb80c15-47b0-493c-92e3-d24945ddf624": "Gọi món ở nhà hàng",
  "speaking-b92c14ac-cbea-48ac-9fc0-fd5b2f900de6": "Tham gia nhóm học",
  "speaking-722e96f8-3df7-469e-9d4c-f67084411620": "Đi khám bác sĩ",
  "speaking-6acce615-1011-4788-a689-6b477cd773ca": "Họp nhanh nhóm phần mềm",
  "speaking-bfc65dc4-53b5-4225-92b0-97120bd434ce": "Quản lý mua văn phòng phẩm",
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

/** A recommendation names a speaking set only through the `set` in its route. */
export function recommendationDisplayTitle(item: {
  contentType: string;
  contentId: number;
  title: string;
  route: string;
}): string {
  if (item.contentType === "QUIZ") return quizDisplayTitle(item.contentId, item.title);
  if (item.contentType === "SPEAKING_SET") {
    const key = new URLSearchParams(item.route.split("?")[1] ?? "").get("set");
    return speakingSetDisplayTitle(key, item.title);
  }
  return item.title;
}

export function grammarDisplayTitle(id: number, storedTitle: string): string {
  return GRAMMAR_TOPICS[id]?.title ?? storedTitle;
}

/** Topics without an entry are grouped under "Ngữ pháp khác". */
export function grammarCategory(id: number): GrammarCategory {
  return GRAMMAR_TOPICS[id]?.category ?? "OTHER";
}
