import axiosClient from "../axiosClient";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export const aiService = {
  chat: async (messages: ChatMessage[]): Promise<{ answer: string }> => {
    return await axiosClient.post("/ai/chat", { messages });
  },

  explainError: async (questionId: number, userAnswer: string): Promise<any> => {
    return await axiosClient.post(`/ai/explain-toeic-error/${questionId}`, { userAnswer });
  },
};
