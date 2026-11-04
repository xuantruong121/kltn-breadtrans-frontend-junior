import type { PracticeWritingDetail } from "@/lib/api/services/writing.service";

/**
 * Fixed, hand-written sample results shown on a locked Speaking or Writing
 * item, so a learner sees what grading gives before buying. Not produced by
 * any grader and not about the learner: the UI labels them "Bài mẫu".
 * Scores are BreadTrans practice scores, never an official exam result.
 */
export const SAMPLE_WRITING = {
  prompt: "Write an email to your manager asking to move Friday's meeting to Monday.",
  answer:
    "Dear Ms. Lan, I am writing to ask if we can move the Friday meeting to Monday morning. I have a client visit on Friday afternoon and I will not be in the office. Is 9 a.m. on Monday OK for you? Best regards, Minh",
  score: 8,
  maxScore: 10,
  detail: {
    rubricVersion: "PRACTICE_WRITING_V1",
    criteria: [
      {
        key: "task",
        label: "Hoàn thành yêu cầu",
        score: 3,
        max: 3,
        comment: "Nêu rõ việc muốn dời lịch, lý do và đề xuất thời gian mới.",
      },
      {
        key: "organization",
        label: "Bố cục email",
        score: 2,
        max: 2,
        comment: "Có lời chào, nội dung chính và lời kết phù hợp với email công việc.",
      },
      {
        key: "language",
        label: "Ngữ pháp & Từ vựng",
        score: 3,
        max: 5,
        comment: "Câu rõ ràng; nên dùng cách hỏi lịch sự hơn với cấp trên.",
      },
    ],
    strengths: ["Lý do dời lịch cụ thể", "Đề xuất giờ mới rõ ràng"],
    corrections: [
      {
        original: "Is 9 a.m. on Monday OK for you?",
        corrected: "Would 9 a.m. on Monday work for you?",
        explanation: "Với cấp trên, \"Would … work for you?\" lịch sự hơn \"Is … OK?\".",
      },
    ],
    wordCount: 45,
    wordRange: [40, 80],
    keywords: [
      { keyword: "meeting", present: true },
      { keyword: "Monday", present: true },
    ],
  } satisfies PracticeWritingDetail,
};

export const SAMPLE_SPEAKING = {
  prompt: "Describe your morning routine on a working day.",
  transcript:
    "I usually wake up at six. After that I have breakfast with my family and I take the bus to work. It takes about thirty minutes.",
  overallScore: 7.5,
  criteria: [
    { label: "Độ chính xác", value: 82 },
    { label: "Độ trôi chảy", value: 74 },
    { label: "Độ đầy đủ", value: 90 },
    { label: "Ngữ điệu", value: 68 },
  ],
  feedback:
    "Phát âm rõ phần lớn các từ. Ngắt nghỉ còn hơi đều; nhấn mạnh từ khoá như \"six\", \"bus\" để câu tự nhiên hơn.",
  words: [
    { word: "usually", score: 58, tip: "Âm /ʒ/ ở giữa từ: /ˈjuː.ʒu.ə.li/." },
    { word: "thirty", score: 64, tip: "Âm /θ/ đầu từ: đặt lưỡi giữa hai răng." },
  ],
};
