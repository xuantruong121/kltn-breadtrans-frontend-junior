export type WritingMode = "SENTENCE" | "SHORT_MESSAGE" | "EMAIL" | "OPINION";

export interface WritingGuidanceSection {
  title: string;
  stem: string;
}

export interface WritingModeInfo {
  id: WritingMode;
  label: string;
  objective: string;
  guidance: WritingGuidanceSection[];
}

export function resolveWritingMode(input: {
  taskType?: string | null;
  type?: string | null;
  title?: string | null;
}): WritingModeInfo {
  const taskType = `${input.taskType ?? ""} ${input.type ?? ""} ${input.title ?? ""}`.toUpperCase();
  if (taskType.includes("OPINION") || taskType.includes("ESSAY") || taskType.includes("QUAN ĐIỂM")) {
    return {
      id: "OPINION",
      label: "Nêu quan điểm",
      objective: "Trình bày quan điểm rõ ràng, có lý do và ví dụ hỗ trợ.",
      guidance: [
        { title: "Position", stem: "I believe that..." },
        { title: "Reason", stem: "One important reason is..." },
        { title: "Example", stem: "For example,..." },
        { title: "Conclusion", stem: "For these reasons,..." },
      ],
    };
  }
  if (taskType.includes("SHORT_MESSAGE") || taskType.includes("SHORT MESSAGE")) {
    return {
      id: "SHORT_MESSAGE",
      label: "Tin nhắn ngắn",
      objective: "Viết tin nhắn ngắn gọn, tự nhiên và phù hợp với người nhận.",
      guidance: [
        { title: "Opening", stem: "Hi ...," },
        { title: "Purpose", stem: "I am writing to let you know that..." },
        { title: "Details", stem: "I will ... at ..." },
        { title: "Closing", stem: "See you soon!" },
      ],
    };
  }
  if (taskType.includes("EMAIL") || taskType.includes("PART2")) {
    return {
      id: "EMAIL",
      label: "Email & tin nhắn",
      objective: "Viết phản hồi rõ ràng, đúng mục đích và phù hợp ngữ cảnh.",
      guidance: [
        { title: "Opening", stem: "I am writing regarding..." },
        { title: "Purpose", stem: "The reason for my message is..." },
        { title: "Request", stem: "Could you please...?" },
        { title: "Closing", stem: "Thank you for your help. Best regards,..." },
      ],
    };
  }
  return {
    id: "SENTENCE",
    label: "Viết câu",
    objective: "Tạo câu đúng ngữ pháp, dùng đúng từ khóa và phù hợp với ngữ cảnh.",
    guidance: [
      { title: "Subject", stem: "Start with the person or thing doing the action." },
      { title: "Structure", stem: "Subject + verb + object or complement." },
      { title: "Context", stem: "Use the required vocabulary in a complete sentence." },
    ],
  };
}

export function resolveWritingPlaceholder(input: {
  taskType?: string | null;
  type?: string | null;
  title?: string | null;
}): string {
  switch (resolveWritingMode(input).id) {
    case "SHORT_MESSAGE":
      return "Hi Alex, I am sorry that I will arrive late...";
    case "EMAIL":
      return "Dear Mr. Smith, I am writing to update you on our project status...";
    case "OPINION":
      return "In my opinion, ... because ... For example, ...";
    default:
      return "Write one complete sentence using the required words...";
  }
}

export function countWritingWords(value: string): number {
  return value.trim() ? value.trim().split(/\s+/u).length : 0;
}

export function normalizedWritingScore(score: number | null | undefined, maxScore: number | null | undefined): number | null {
  if (!Number.isFinite(score) || !Number.isFinite(maxScore) || Number(maxScore) <= 0) return null;
  return Math.round((Number(score) / Number(maxScore)) * 100);
}
