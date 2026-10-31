/**
 * Onboarding (F5): goal, career track, daily time, then level (diagnostic or
 * self-chosen). Option lists and the request body; no React, no I/O.
 */
import type { LevelProgress } from "./levelLock.ts";
import type { PracticeLevel, PracticeSkill } from "./practiceLevel.ts";

export type LearningGoal = "GENERAL" | "TOEIC_SCORE" | "WORK_COMMUNICATION" | "STUDY" | "TRAVEL";
export type LearningTrack =
  | "GENERAL"
  | "IT_SOFTWARE"
  | "OFFICE_BUSINESS"
  | "SALES_CUSTOMER_SERVICE"
  | "HOSPITALITY_TOURISM"
  | "STUDENT_ACADEMIC";
export type PlacementSource = "NONE" | "DIAGNOSTIC" | "SELF";

export type LearnerProfile = {
  track: LearningTrack;
  goal: LearningGoal;
  minutesPerDay: number;
  targetDate: string | null;
  selfLevel: PracticeLevel | null;
  placementLevel: PracticeLevel | null;
  placementSource: PlacementSource;
  onboarded: boolean;
  skills: Array<{
    skill: PracticeSkill;
    level: PracticeLevel | null;
    unlockedLevel: PracticeLevel | null;
    nextLevel: PracticeLevel | null;
    progress: LevelProgress;
    source: string;
  }>;
};

export type StarterRoadmap = {
  steps: Array<{
    key: string;
    title: string;
    why: string;
    minutes: number;
    route: string;
    done: boolean;
    locked: boolean;
  }>;
  done: number;
  total: number;
  nextKey: string | null;
};

export const GOAL_OPTIONS: Array<{ value: LearningGoal; label: string; description: string }> = [
  { value: "TOEIC_SCORE", label: "Đạt điểm TOEIC", description: "Luyện theo cấu trúc đề TOEIC Listening & Reading" },
  { value: "WORK_COMMUNICATION", label: "Giao tiếp công việc", description: "Email, họp, điện thoại, trao đổi với đồng nghiệp" },
  { value: "STUDY", label: "Học tập", description: "Đọc tài liệu, nghe bài giảng, viết bài" },
  { value: "TRAVEL", label: "Du lịch", description: "Đặt phòng, hỏi đường, gọi món" },
  { value: "GENERAL", label: "Tiếng Anh tổng quát", description: "Cải thiện đều cả bốn kỹ năng" },
];

export const TRACK_OPTIONS: Array<{ value: LearningTrack; label: string; description: string }> = [
  { value: "IT_SOFTWARE", label: "Công nghệ thông tin", description: "Phần mềm, kỹ thuật, sản phẩm số" },
  { value: "OFFICE_BUSINESS", label: "Văn phòng – Kinh doanh", description: "Hành chính, kế toán, nhân sự, quản lý" },
  { value: "SALES_CUSTOMER_SERVICE", label: "Bán hàng – CSKH", description: "Tư vấn, chăm sóc và hỗ trợ khách hàng" },
  { value: "HOSPITALITY_TOURISM", label: "Nhà hàng – Khách sạn – Du lịch", description: "Lễ tân, phục vụ, hướng dẫn viên" },
  { value: "STUDENT_ACADEMIC", label: "Sinh viên – Học thuật", description: "Học tập, nghiên cứu, thi chứng chỉ" },
  { value: "GENERAL", label: "Chưa xác định", description: "Bài luyện đa dạng chủ đề" },
];

export const MINUTE_OPTIONS = [10, 15, 20, 30, 45, 60];

export const LEVEL_OPTIONS: Array<{ value: PracticeLevel; label: string; description: string }> = [
  { value: "STARTER", label: "Mất gốc", description: "Bắt đầu lại từ phát âm, từ vựng và ngữ pháp nền tảng" },
  { value: "BASIC", label: "Cơ bản", description: "Hiểu câu ngắn, hội thoại đơn giản hằng ngày" },
  { value: "INTERMEDIATE", label: "Trung cấp", description: "Theo kịp hội thoại, đoạn văn công việc quen thuộc" },
  { value: "ADVANCED", label: "Nâng cao", description: "Đọc, nghe nội dung dài và phức tạp" },
];

export type OnboardingAnswers = {
  goal: LearningGoal | null;
  track: LearningTrack | null;
  minutesPerDay: number | null;
  targetDate: string;
  /** null = the learner will take the diagnostic instead. */
  selfLevel: PracticeLevel | null;
};

/** Session flag: the learner skipped onboarding, so the dashboard does not reopen it. */
export const ONBOARDING_SKIPPED_KEY = "bt-onboarding-skipped";

export const ONBOARDING_STEPS = ["goal", "track", "time", "level"] as const;
export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

export function canContinue(step: OnboardingStep, answers: OnboardingAnswers): boolean {
  if (step === "goal") return answers.goal !== null;
  if (step === "track") return answers.track !== null;
  if (step === "time") return answers.minutesPerDay !== null;
  return true;
}

/** Body for PUT /learning-path/profile. Unanswered questions keep their default. */
export function profilePayload(answers: OnboardingAnswers) {
  return {
    onboarded: true,
    ...(answers.goal ? { goal: answers.goal } : {}),
    ...(answers.track ? { track: answers.track } : {}),
    ...(answers.minutesPerDay ? { minutesPerDay: answers.minutesPerDay } : {}),
    ...(answers.targetDate ? { targetDate: answers.targetDate } : {}),
    ...(answers.selfLevel ? { selfLevel: answers.selfLevel } : {}),
  };
}

/** The dashboard sends a learner to onboarding once, unless they skipped it in this session. */
export function shouldOpenOnboarding(profile: Pick<LearnerProfile, "onboarded"> | undefined, skipped: boolean) {
  return Boolean(profile) && !profile!.onboarded && !skipped;
}

/** The dashboard asks for a level only when nothing placed the learner yet. */
/** Mất gốc, chosen or placed: the starter path is for this learner. */
export function isStarterLearner(
  profile: Pick<LearnerProfile, "placementSource" | "selfLevel" | "placementLevel"> | undefined,
): boolean {
  if (profile?.placementSource === "SELF") return profile.selfLevel === "STARTER";
  return profile?.placementSource === "DIAGNOSTIC" && profile.placementLevel === "STARTER";
}

export function needsLevelChoice(profile: Pick<LearnerProfile, "placementSource"> | undefined) {
  return profile?.placementSource === "NONE";
}
