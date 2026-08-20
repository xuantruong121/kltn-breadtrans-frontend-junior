import axiosClient from "../axiosClient";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export const aiService = {
  chat: async (messages: ChatMessage[]): Promise<{ answer: string }> => {
    const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
    const prompt = lastUserMsg?.content || messages[messages.length - 1]?.content || "";
    const res: any = await axiosClient.post("/ai/chat", { prompt, messages });
    const replyText =
      res?.answer ||
      res?.reply ||
      res?.data?.answer ||
      res?.data?.reply ||
      (typeof res === "string" ? res : "Xin lỗi, mình chưa có câu trả lời phù hợp.");
    return { answer: replyText };
  },

  explainError: async (questionId: number, userAnswer: string): Promise<any> => {
    return await axiosClient.post(`/ai/explain-toeic-error/${questionId}`, { userAnswer });
  },
};
