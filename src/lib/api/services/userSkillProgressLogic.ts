import type { SkillProgressSummary } from "./user.service";

export function skillScoreLabel(skill: SkillProgressSummary): string {
  return skill.normalizedScore == null
    ? "Chưa đủ dữ liệu"
    : `${skill.normalizedScore}/100`;
}

export function skillStatusLabel(skill: SkillProgressSummary): string {
  return skill.statusLabel?.trim() || "Chưa đủ dữ liệu";
}

const DIMENSION_LABEL_MAP: Record<string, string> = {
  accuracyScore: "Độ chính xác",
  fluencyScore: "Độ lưu loát",
  completenessScore: "Độ hoàn thiện câu",
  prosodyScore: "Ngữ điệu",
  pronunciationScore: "Phát âm",
  MULTIPLE_CHOICE: "Trắc nghiệm",
  DICTATION: "Chép chính tả",
  FILL_IN_BLANK: "Điền từ",
  CONVERSATION: "Hội thoại",
  SHORT_TALK: "Bài nói ngắn",
  VOCABULARY: "Từ vựng",
  GRAMMAR: "Ngữ pháp",
  MAIN_IDEA: "Ý chính",
  DETAIL: "Chi tiết",
  INFERENCE: "Suy luận",
  TONE_ATTITUDE: "Thái độ tác giả",
  TEXT_STRUCTURE: "Bố cục bài đọc",
};

export function formatSkillDimension(dimension?: string | null): string {
  if (!dimension) return "";
  const trimmed = dimension.trim();
  return DIMENSION_LABEL_MAP[trimmed] || trimmed;
}
