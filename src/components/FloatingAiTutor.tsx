"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send, Bot, User, Loader2 } from "lucide-react";
import { aiService, ChatMessage } from "@/lib/api/services/ai.service";

export default function FloatingAiTutor() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: "Chào bạn! Mình là AI Gia sư. Mình có thể giúp gì cho bạn hôm nay?" }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: ChatMessage = { role: "user", content: input };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    try {
      const res = await aiService.chat(newMessages);
      setMessages([...newMessages, { role: "assistant", content: res.answer }]);
    } catch (error) {
      console.error(error);
      setMessages([...newMessages, { role: "assistant", content: "Xin lỗi, mình đang gặp chút trục trặc. Bạn thử lại sau nhé!" }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating Button */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 md:bottom-8 md:right-8 bg-junior-orange text-white p-4 rounded-full shadow-lg z-40 transition-transform ${isOpen ? 'scale-0' : 'scale-100'}`}
      >
        <MessageCircle size={32} />
      </motion.button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.8 }}
            className="fixed bottom-4 right-4 md:bottom-8 md:right-8 w-[90vw] max-w-sm md:w-96 bg-white rounded-3xl shadow-2xl z-50 border-4 border-slate-200 overflow-hidden flex flex-col h-[500px] max-h-[80vh]"
          >
            {/* Header */}
            <div className="bg-junior-orange p-4 flex items-center justify-between text-white">
              <div className="flex items-center gap-2 font-bold text-lg">
                <Bot size={24} /> AI Gia Sư
              </div>
              <button onClick={() => setIsOpen(false)} className="hover:bg-white/20 p-1 rounded-lg transition-colors">
                <X size={24} />
              </button>
            </div>

            {/* Chat History */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 bg-slate-50">
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex gap-2 max-w-[85%] ${msg.role === "user" ? "self-end flex-row-reverse" : "self-start"}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === "user" ? "bg-junior-blue text-white" : "bg-orange-200 text-junior-orange"}`}>
                    {msg.role === "user" ? <User size={16} /> : <Bot size={16} />}
                  </div>
                  <div className={`p-3 rounded-2xl text-sm ${msg.role === "user" ? "bg-junior-blue text-white rounded-tr-sm" : "bg-white border-2 border-slate-200 text-slate-700 rounded-tl-sm shadow-sm"}`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="self-start flex gap-2">
                  <div className="w-8 h-8 rounded-full bg-orange-200 text-junior-orange flex items-center justify-center">
                    <Bot size={16} />
                  </div>
                  <div className="p-3 bg-white border-2 border-slate-200 rounded-2xl rounded-tl-sm text-slate-400 flex items-center gap-1 shadow-sm">
                     <span className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" />
                     <span className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
                     <span className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: "0.4s" }} />
                  </div>
                </div>
              )}
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white border-t-2 border-slate-100 flex gap-2">
              <input 
                type="text" 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="Hỏi AI bất kỳ điều gì..."
                className="flex-1 bg-slate-100 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-junior-orange/50 transition-shadow"
              />
              <button 
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="bg-junior-orange text-white p-3 rounded-xl hover:bg-orange-600 disabled:opacity-50 transition-colors"
              >
                <Send size={20} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
