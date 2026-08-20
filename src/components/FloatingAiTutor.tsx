"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  MessageCircle, 
  X, 
  Send, 
  Bot, 
  User, 
  RotateCcw, 
  GraduationCap,
  ChevronLeft,
  Search,
  UserCheck,
  Inbox
} from "lucide-react";
import { usePathname } from "next/navigation";
import { aiService } from "@/lib/api/services/ai.service";
import { useAuthStore } from "@/stores/authStore";
import { useChatAssistantStore, StudentThread } from "@/stores/chatAssistantStore";
import { useSocket } from "@/lib/providers/SocketProvider";

// 🌟 Component parse và format Markdown sạch đẹp (tránh lộ kí tự ***, **, gạch đầu dòng, chuẩn màu tương phản)
function FormattedMessage({ content, isWhiteText = false }: { content: string; isWhiteText?: boolean }) {
  const formattedElements = useMemo(() => {
    if (!content) return null;

    let text = content;
    // Dọn dẹp các ký tự asterisks bị lỗi hoặc lặp nhiều lần (*** -> **)
    text = text.replace(/\*\*\*+/g, "**");

    const lines = text.split("\n");
    const elements: React.ReactNode[] = [];

    lines.forEach((line, lineIdx) => {
      const trimmed = line.trim();
      if (!trimmed) {
        elements.push(<div key={`empty-${lineIdx}`} className="h-1.5" />);
        return;
      }

      // Nhận diện Header ### hoặc ##
      const isHeader = trimmed.startsWith("### ") || trimmed.startsWith("## ");
      const rawTextWithoutHeader = isHeader ? trimmed.replace(/^#+\s*/, "") : trimmed;

      // Nhận diện Bullet points (*, -, •)
      const isBullet = rawTextWithoutHeader.startsWith("* ") || rawTextWithoutHeader.startsWith("- ") || rawTextWithoutHeader.startsWith("• ");
      const rawLine = isBullet ? rawTextWithoutHeader.substring(2).trim() : rawTextWithoutHeader;

      // Parse inline **in đậm** và *in nghiêng*
      const parts: React.ReactNode[] = [];
      const regex = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;
      let lastIndex = 0;
      let match;

      while ((match = regex.exec(rawLine)) !== null) {
        if (match.index > lastIndex) {
          parts.push(rawLine.substring(lastIndex, match.index));
        }
        const token = match[0];
        if (token.startsWith("**") && token.endsWith("**")) {
          parts.push(
            <strong key={`b-${match.index}`} className={`font-black ${isWhiteText ? "text-white underline decoration-white/30" : "text-slate-900"}`}>
              {token.slice(2, -2)}
            </strong>
          );
        } else if (token.startsWith("*") && token.endsWith("*")) {
          parts.push(
            <em key={`i-${match.index}`} className={`italic font-medium ${isWhiteText ? "text-amber-100" : "text-slate-700"}`}>
              {token.slice(1, -1)}
            </em>
          );
        }
        lastIndex = regex.lastIndex;
      }

      if (lastIndex < rawLine.length) {
        parts.push(rawLine.substring(lastIndex));
      }

      if (isHeader) {
        elements.push(
          <h4 key={`header-${lineIdx}`} className={`font-black text-sm mt-2 mb-1 flex items-center gap-1 ${isWhiteText ? "text-amber-200" : "text-junior-orange"}`}>
            ✨ {parts}
          </h4>
        );
      } else if (isBullet) {
        elements.push(
          <div key={`line-${lineIdx}`} className="flex items-start gap-2 ml-1 my-1">
            <span className={`font-black mt-0.5 text-xs ${isWhiteText ? "text-amber-200" : "text-junior-orange"}`}>●</span>
            <div className={`flex-1 leading-relaxed ${isWhiteText ? "text-white font-medium" : "text-slate-800"}`}>{parts}</div>
          </div>
        );
      } else {
        elements.push(
          <p key={`line-${lineIdx}`} className={`leading-relaxed my-0.5 ${isWhiteText ? "text-white font-medium" : "text-slate-800"}`}>
            {parts}
          </p>
        );
      }
    });

    return elements;
  }, [content, isWhiteText]);

  return <div className="space-y-0.5 text-[13.5px]">{formattedElements}</div>;
}

export default function FloatingAiTutor() {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const { 
    threads,
    activeStudentId,
    isOpen,
    adminView,
    setIsOpen,
    setAdminView,
    setActiveStudentId,
    setThreadMode,
    addMessageToThread,
    clearThreadMessages,
  } = useChatAssistantStore();

  const [input, setInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { socket } = useSocket();

  const isAdminOrTeacher = user?.role === "ADMIN" || user?.role === "TEACHER";
  const currentDisplayName = user?.profile?.name || user?.email?.split("@")[0] || "Người dùng";

  // ID của học sinh đang trò chuyện
  const studentThreadId = isAdminOrTeacher
    ? activeStudentId || "student_1"
    : user?.id
    ? `student_${user.id}`
    : "student_guest";

  const studentMetadata = useMemo(() => ({
    name: user?.profile?.name || user?.email?.split("@")[0] || "Học viên",
    email: user?.email,
    avatar: user?.profile?.avatar,
  }), [user?.profile?.name, user?.email, user?.profile?.avatar]);

  const currentThread: StudentThread = useMemo(() => {
    return (
      threads[studentThreadId] || {
        studentId: studentThreadId,
        studentName: studentMetadata.name,
        studentEmail: studentMetadata.email,
        studentAvatar: studentMetadata.avatar,
        mode: "AI",
        messages: [
          {
            id: "default-init",
            role: "assistant",
            content: `Chào ${studentMetadata.name}! Mình là Trợ Lý Bánh Mì 🍞. Bạn có câu hỏi nào hôm nay không?`,
            senderName: "Trợ Lý Bánh Mì 🍞",
            timestamp: 0,
          },
        ],
        unreadForAdmin: 0,
        lastMessageTime: 0,
      }
    );
  }, [threads, studentThreadId, studentMetadata]);

  // Tổng số tin nhắn chưa đọc cho Admin
  const totalUnreadCount = useMemo(() => {
    return Object.values(threads).reduce((acc, t) => acc + (t.unreadForAdmin || 0), 0);
  }, [threads]);

  // Lọc danh sách học sinh theo ô tìm kiếm
  const filteredThreads = useMemo(() => {
    const list = Object.values(threads).sort((a, b) => b.lastMessageTime - a.lastMessageTime);
    if (!searchTerm.trim()) return list;
    const term = searchTerm.toLowerCase();
    return list.filter(
      (t) =>
        t.studentName.toLowerCase().includes(term) ||
        (t.studentEmail && t.studentEmail.toLowerCase().includes(term))
    );
  }, [threads, searchTerm]);

  // Ẩn Trợ lý khi học viên đang trong phòng thi hoặc bài tập chuyên sâu
  const isHiddenPath = 
    pathname.match(/^\/practice\/[^\/]+\/.+/) || 
    pathname.includes("/lessons/");

  // Tự động cuộn xuống dưới cùng khi mở cửa sổ chat hoặc có tin nhắn mới
  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior });
    }
  };

  useEffect(() => {
    if (isOpen && (!isAdminOrTeacher || adminView === "chat")) {
      const timer = setTimeout(() => scrollToBottom("auto"), 80);
      return () => clearTimeout(timer);
    }
  }, [isOpen, adminView, studentThreadId, isAdminOrTeacher]);

  useEffect(() => {
    if (isOpen && (!isAdminOrTeacher || adminView === "chat")) {
      scrollToBottom("smooth");
    }
  }, [currentThread?.messages, isLoading, isOpen, adminView, isAdminOrTeacher]);

  if (isHiddenPath) return null;

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const messageText = input.trim();
    setInput("");

    // 1. Nếu là ADMIN / TEACHER đang trả lời trong thread của học sinh:
    if (isAdminOrTeacher) {
      const adminMsg = {
        role: "admin" as const,
        senderName: `${currentDisplayName} (${user?.role === "ADMIN" ? "Quản Trị Viên" : "Giáo Viên"})`,
        content: messageText,
      };

      addMessageToThread(
        studentThreadId,
        { name: currentThread.studentName, email: currentThread.studentEmail },
        adminMsg
      );

      // Bắn sự kiện Socket Real-time cho học sinh
      socket?.emit("chat:sendMessage", {
        studentId: studentThreadId,
        studentName: currentThread.studentName,
        studentEmail: currentThread.studentEmail,
        message: adminMsg,
        fromRole: user?.role || "ADMIN",
        targetUserId: Number(studentThreadId.replace("student_", "")) || undefined,
      });

      return;
    }

    // 2. Nếu là HỌC VIÊN gửi câu hỏi:
    const studentMsg = {
      role: "user" as const,
      senderName: currentDisplayName,
      content: messageText,
    };

    addMessageToThread(studentThreadId, studentMetadata, studentMsg);

    // Bắn sự kiện Socket Real-time cho Admin
    socket?.emit("chat:sendMessage", {
      studentId: studentThreadId,
      studentName: currentDisplayName,
      studentEmail: user?.email,
      studentAvatar: user?.profile?.avatar,
      message: studentMsg,
      fromRole: "STUDENT",
      targetUserId: user?.id,
    });

    // Nếu học sinh đang ở chế độ HUMAN MODE -> không gọi AI
    if (currentThread.mode === "HUMAN") {
      setIsLoading(false);
      return;
    }

    // 3. Chế độ AI (AI MODE) -> Gọi Gemini AI
    setIsLoading(true);
    try {
      const aiPayload = currentThread.messages
        .filter((m) => m.role === "user" || m.role === "assistant")
        .concat({ id: "temp", role: "user", content: messageText, timestamp: Date.now() })
        .map((m) => ({
          role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
          content: m.content,
        }));

      const res = await aiService.chat(aiPayload);
      const aiMsg = {
        role: "assistant" as const,
        senderName: "Trợ Lý Bánh Mì 🍞",
        content: res.answer || "Bánh Mì đã nhận được câu hỏi rồi nhé!",
      };
      addMessageToThread(studentThreadId, studentMetadata, aiMsg);

      // Đồng bộ câu trả lời của AI tới Admin qua socket
      socket?.emit("chat:sendMessage", {
        studentId: studentThreadId,
        studentName: currentDisplayName,
        message: aiMsg,
        fromRole: "STUDENT",
        targetUserId: user?.id,
      });
    } catch (error) {
      console.error(error);
      addMessageToThread(studentThreadId, studentMetadata, {
        role: "assistant",
        senderName: "Trợ Lý Bánh Mì 🍞",
        content: "Bánh Mì đang gặp chút trục trặc nhỏ. Bạn thử hỏi lại câu khác nhé! 🍞",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleMode = () => {
    const nextMode = currentThread.mode === "AI" ? "HUMAN" : "AI";
    setThreadMode(studentThreadId, nextMode, currentDisplayName);

    // Bắn sự kiện Socket Real-time thay đổi Mode
    socket?.emit("chat:toggleMode", {
      studentId: studentThreadId,
      mode: nextMode,
      adminName: currentDisplayName,
      targetUserId: Number(studentThreadId.replace("student_", "")) || undefined,
    });
  };

  const handleQuickQuestion = (question: string) => {
    setInput(question);
  };

  return (
    <>
      {/* 🔘 NÚT NỔI FLOATING BUTTON */}
      <motion.button
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.92 }}
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-24 right-4 md:bottom-8 md:right-8 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white p-4 rounded-full shadow-xl hover:shadow-2xl z-40 transition-all border-2 border-white flex items-center justify-center cursor-pointer ${
          isOpen ? "scale-0 pointer-events-none" : "scale-100"
        }`}
        title={isAdminOrTeacher ? "Mở Trung Tâm Tin Nhắn Học Viên" : "Mở Trợ Lý Bánh Mì"}
      >
        <div className="relative">
          <MessageCircle size={28} />
          {isAdminOrTeacher ? (
            totalUnreadCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-rose-500 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-white animate-pulse">
                {totalUnreadCount}
              </span>
            )
          ) : (
            currentThread.unreadForAdmin > 0 && (
              <span className="absolute -top-2 -right-2 bg-rose-500 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-white animate-pulse" />
            )
          )}
        </div>
      </motion.button>

      {/* 💬 CỬA SỔ CHAT WINDOW */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-4 right-4 md:bottom-8 md:right-8 w-[92vw] max-w-sm md:w-[420px] bg-white rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.2)] z-50 border-4 border-slate-200 overflow-hidden flex flex-col h-[570px] max-h-[85vh]"
          >
            {/* ======================================================== */}
            {/* 1. MÀN HÌNH DANH SÁCH HỌC SINH (DÀNH CHO ADMIN/TEACHER) */}
            {/* ======================================================== */}
            {isAdminOrTeacher && adminView === "list" ? (
              <div className="flex flex-col h-full bg-slate-50">
                {/* Header Inbox */}
                <div className="bg-gradient-to-r from-orange-500 to-amber-500 p-4 text-white shrink-0 shadow-md">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5 font-black text-base">
                      <div className="w-9 h-9 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-xl shadow-inner">
                        💬
                      </div>
                      <div>
                        <h3 className="leading-tight">Hộp Thư Học Viên</h3>
                        <p className="text-[11px] font-bold text-amber-100">
                          {filteredThreads.length} cuộc trò chuyện • {totalUnreadCount} tin chưa đọc
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => setIsOpen(false)}
                      className="hover:bg-white/20 p-1.5 rounded-xl transition-colors text-white cursor-pointer"
                    >
                      <X size={20} />
                    </button>
                  </div>

                  {/* Search Bar */}
                  <div className="mt-3 relative">
                    <Search size={14} className="absolute left-3 top-2.5 text-amber-200" />
                    <input
                      type="text"
                      placeholder="Tìm theo tên học sinh, lớp..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full bg-black/15 text-white placeholder:text-amber-100/70 text-xs font-bold rounded-xl pl-8 pr-3 py-2 outline-none focus:bg-black/25 transition-all border border-white/20"
                    />
                  </div>
                </div>

                {/* Danh Sách Các Cuộc Trò Chuyện Học Sinh */}
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {filteredThreads.length > 0 ? (
                    filteredThreads.map((thread) => {
                      const lastMsg = thread.messages[thread.messages.length - 1];
                      const isHumanMode = thread.mode === "HUMAN";

                      return (
                        <div
                          key={thread.studentId}
                          onClick={() => setActiveStudentId(thread.studentId)}
                          className="bg-white hover:bg-orange-50/60 p-3 rounded-2xl border-2 border-slate-200 hover:border-orange-300 transition-all cursor-pointer shadow-2xs flex items-start gap-3 relative group"
                        >
                          {/* Avatar */}
                          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-500 to-indigo-600 text-white font-black flex items-center justify-center shrink-0 shadow-xs">
                            {thread.studentName.charAt(0).toUpperCase()}
                          </div>

                          {/* Info & Snippet */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <h4 className="font-extrabold text-slate-800 text-xs truncate">
                                {thread.studentName}
                              </h4>
                              <span className="text-[10px] font-bold text-slate-400 shrink-0">
                                {new Date(thread.lastMessageTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>

                            <p className="text-xs font-semibold text-slate-500 truncate mt-0.5">
                              {lastMsg ? lastMsg.content : "Chưa có tin nhắn"}
                            </p>

                            <div className="flex items-center gap-1.5 mt-1.5">
                              <span
                                className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                                  isHumanMode
                                    ? "bg-blue-100 text-blue-800 border-blue-200"
                                    : "bg-emerald-100 text-emerald-800 border-emerald-200"
                                }`}
                              >
                                {isHumanMode ? "👨‍🏫 Trực Tiếp" : "🤖 AI"}
                              </span>

                              {thread.studentEmail && (
                                <span className="text-[10px] font-bold text-slate-400 truncate">
                                  {thread.studentEmail}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Unread Badge */}
                          {thread.unreadForAdmin > 0 && (
                            <span className="bg-rose-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full shrink-0 shadow-2xs">
                              {thread.unreadForAdmin}
                            </span>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-16 text-slate-400 space-y-2">
                      <Inbox size={32} className="mx-auto text-slate-300" />
                      <p className="text-xs font-bold">Không tìm thấy học sinh nào.</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* ======================================================== */
              /* 2. MÀN HÌNH CHAT 1-1 (VỚI HỌC SINH HOẶC DÀNH CHO HỌC SINH) */
              /* ======================================================== */
              <div className="flex flex-col h-full">
                {/* Header Chat */}
                <div className="bg-gradient-to-r from-orange-500 to-amber-500 p-4 text-white flex flex-col gap-2 shrink-0 shadow-md">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      {/* Nút quay lại danh sách nếu là Admin */}
                      {isAdminOrTeacher && (
                        <button
                          onClick={() => setAdminView("list")}
                          className="hover:bg-white/20 p-1.5 rounded-xl transition-colors text-white mr-0.5 cursor-pointer"
                          title="Quay lại danh sách học sinh"
                        >
                          <ChevronLeft size={22} />
                        </button>
                      )}

                      <div className="w-9 h-9 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-xl shadow-inner">
                        {isAdminOrTeacher ? "🎓" : "🍞"}
                      </div>
                      <div>
                        <h3 className="font-black text-sm leading-tight truncate max-w-[200px]">
                          {isAdminOrTeacher ? currentThread.studentName : "Trợ Lý Bánh Mì"}
                        </h3>
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-100">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              currentThread.mode === "AI" ? "bg-emerald-400 animate-ping" : "bg-blue-300"
                            }`}
                          />
                          <span>
                            {currentThread.mode === "AI" ? "AI Đang Tự Động Trả Lời" : "Tư Vấn Trực Tiếp"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => clearThreadMessages(studentThreadId)}
                        className="hover:bg-white/20 p-1.5 rounded-xl transition-colors text-amber-100 hover:text-white cursor-pointer"
                        title="Xóa lịch sử cuộc trò chuyện này"
                      >
                        <RotateCcw size={16} />
                      </button>
                      <button
                        onClick={() => setIsOpen(false)}
                        className="hover:bg-white/20 p-1.5 rounded-xl transition-colors text-white cursor-pointer"
                        title="Đóng cửa sổ"
                      >
                        <X size={20} />
                      </button>
                    </div>
                  </div>

                  {/* Thanh điều khiển Chế độ dành cho Admin trên từng học sinh */}
                  {isAdminOrTeacher ? (
                    <div className="bg-white/15 backdrop-blur-xs rounded-xl p-2 flex items-center justify-between text-xs font-bold mt-1 border border-white/20">
                      <span className="text-[11px]">
                        {currentThread.mode === "AI" ? "🤖 Học sinh đang chat với AI" : "👨‍🏫 Bạn đang chat trực tiếp"}
                      </span>
                      <button
                        onClick={handleToggleMode}
                        className={`px-3 py-1 rounded-lg font-black text-[11px] flex items-center gap-1 transition-all cursor-pointer shadow-sm ${
                          currentThread.mode === "AI"
                            ? "bg-amber-100 text-amber-900 hover:bg-white"
                            : "bg-emerald-400 text-emerald-950 hover:bg-emerald-300"
                        }`}
                      >
                        {currentThread.mode === "AI" ? "Chuyển Sang Trực Tiếp" : "Bật Lại AI"}
                      </button>
                    </div>
                  ) : (
                    currentThread.mode === "HUMAN" && (
                      <div className="bg-blue-600/40 border border-blue-300/40 rounded-xl px-2.5 py-1 text-[11px] font-bold text-blue-100 flex items-center gap-1.5">
                        <UserCheck size={14} /> Thầy Cô / Quản Trị Viên đang trực tiếp hỗ trợ bạn.
                      </div>
                    )
                  )}
                </div>

                {/* Khung Tin Nhắn */}
                <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3.5 bg-slate-50 scroll-smooth">
                  {currentThread.messages.map((msg) => {
                    if (msg.role === "system") {
                      return (
                        <div key={msg.id} className="self-center my-1 max-w-[90%]">
                          <div className="bg-amber-100/80 border border-amber-300/80 text-amber-900 text-xs font-bold px-3 py-2 rounded-2xl text-center shadow-2xs">
                            {msg.content}
                          </div>
                        </div>
                      );
                    }

                    // Nếu người đang xem là Admin:
                    //   Tin nhắn của học sinh (user) nằm bên trái (self-start).
                    //   Tin nhắn của Admin (admin) nằm bên phải (self-end).
                    // Nếu người đang xem là Học sinh:
                    //   Tin nhắn của học sinh (user) nằm bên phải (self-end).
                    //   Tin nhắn của AI / Admin nằm bên trái (self-start).
                    const isRightBubble = isAdminOrTeacher
                      ? msg.role === "admin"
                      : msg.role === "user";

                    const isStudentMsg = msg.role === "user";
                    const isAdminMsg = msg.role === "admin";

                    return (
                      <div
                        key={msg.id}
                        className={`flex gap-2 max-w-[88%] ${isRightBubble ? "self-end flex-row-reverse" : "self-start"}`}
                      >
                        {/* Avatar */}
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-1 shadow-2xs font-bold text-xs ${
                            isStudentMsg
                              ? "bg-blue-500 text-white"
                              : isAdminMsg
                              ? "bg-emerald-600 text-white"
                              : "bg-orange-500 text-white"
                          }`}
                        >
                          {isStudentMsg ? (
                            <User size={14} />
                          ) : isAdminMsg ? (
                            <GraduationCap size={14} />
                          ) : (
                            <Bot size={14} />
                          )}
                        </div>

                        {/* Message Bubble */}
                        <div className="flex flex-col gap-1 max-w-full">
                          {msg.senderName && !isRightBubble && (
                            <span className="text-[11px] font-black text-slate-500 ml-1">
                              {msg.senderName}
                            </span>
                          )}
                          <div
                            className={`p-3.5 rounded-2xl break-words shadow-2xs ${
                              isRightBubble
                                ? isStudentMsg
                                  ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-tr-xs shadow-md border border-blue-400"
                                  : "bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-tr-xs shadow-md border border-emerald-500"
                                : isAdminMsg
                                ? "bg-emerald-50/95 border-2 border-emerald-300 text-emerald-950 rounded-tl-xs shadow-xs"
                                : "bg-white border-2 border-slate-200 text-slate-800 rounded-tl-xs shadow-xs"
                            }`}
                          >
                            <FormattedMessage content={msg.content} isWhiteText={isRightBubble} />
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Typing Indicator */}
                  {isLoading && (
                    <div className="self-start flex gap-2">
                      <div className="w-7 h-7 rounded-full bg-orange-500 text-white flex items-center justify-center shrink-0 mt-1">
                        <Bot size={14} />
                      </div>
                      <div className="p-3 bg-white border-2 border-slate-200 rounded-2xl rounded-tl-xs text-slate-400 flex items-center gap-1.5 shadow-2xs">
                        <span className="text-xs font-bold text-slate-500 mr-1">Bánh Mì đang soạn câu trả lời</span>
                        <span className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-bounce" />
                        <span className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
                        <span className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: "0.4s" }} />
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} className="h-1" />
                </div>

                {/* Quick Chips (Dành cho học sinh) */}
                {!isAdminOrTeacher && currentThread.messages.length <= 2 && (
                  <div className="px-4 py-2 bg-slate-100/70 border-t border-slate-200 flex items-center gap-1.5 overflow-x-auto text-[11px] shrink-0 no-scrollbar">
                    <span className="text-slate-400 font-bold shrink-0">Gợi ý:</span>
                    <button
                      onClick={() => handleQuickQuestion("Giải thích thì hiện tại đơn")}
                      className="px-2.5 py-1 bg-white hover:bg-orange-50 hover:text-orange-600 text-slate-600 border border-slate-200 rounded-lg font-bold shrink-0 transition-colors cursor-pointer"
                    >
                      Thì Hiện Tại Đơn
                    </button>
                    <button
                      onClick={() => handleQuickQuestion("Mẹo học từ vựng nhớ lâu")}
                      className="px-2.5 py-1 bg-white hover:bg-orange-50 hover:text-orange-600 text-slate-600 border border-slate-200 rounded-lg font-bold shrink-0 transition-colors cursor-pointer"
                    >
                      Mẹo Nhớ Từ Vựng
                    </button>
                    <button
                      onClick={() => handleQuickQuestion("Phân biệt 'since' và 'for'")}
                      className="px-2.5 py-1 bg-white hover:bg-orange-50 hover:text-orange-600 text-slate-600 border border-slate-200 rounded-lg font-bold shrink-0 transition-colors cursor-pointer"
                    >
                      Since vs For
                    </button>
                  </div>
                )}

                {/* Input Area */}
                <div className="p-3.5 bg-white border-t-2 border-slate-100 flex items-center gap-2 shrink-0">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSend()}
                    placeholder={
                      isAdminOrTeacher
                        ? currentThread.mode === "HUMAN"
                          ? `Trả lời ${currentThread.studentName}...`
                          : "Hỏi AI hoặc chuyển sang Trực Tiếp để chat..."
                        : currentThread.mode === "HUMAN"
                        ? "Nhập tin nhắn gửi đến Thầy Cô..."
                        : "Hỏi Trợ Lý Bánh Mì bất kỳ điều gì..."
                    }
                    className="flex-1 bg-slate-100 rounded-2xl px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-orange-400/50 transition-all border border-slate-200"
                  />
                  <button
                    onClick={handleSend}
                    disabled={!input.trim() || isLoading}
                    className="bg-gradient-to-r from-orange-500 to-amber-500 text-white p-3 rounded-2xl hover:brightness-110 disabled:opacity-40 transition-all shadow-sm cursor-pointer shrink-0"
                    title="Gửi tin nhắn"
                  >
                    <Send size={18} />
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
