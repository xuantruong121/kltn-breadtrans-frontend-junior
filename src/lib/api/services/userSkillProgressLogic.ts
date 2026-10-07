import type { SkillProgressSummary } from "./user.service";

export function skillScoreLabel(skill: SkillProgressSummary): string {
  return skill.normalizedScore == null
    ? "Chưa đủ dữ liệu"
    : `${skill.normalizedScore}/100`;
}

export function skillStatusLabel(skill: SkillProgressSummary): string {
  return skill.statusLabel?.trim() || "Chưa đủ dữ liệu";
}
