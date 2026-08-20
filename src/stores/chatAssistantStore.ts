import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface AssistantMessage {
  id: string;
  role: 'user' | 'assistant' | 'admin' | 'system';
  content: string;
  senderName?: string;
  timestamp: number;
}

export interface StudentThread {
  studentId: string;
  studentName: string;
  studentEmail?: string;
  studentAvatar?: string;
  mode: 'AI' | 'HUMAN';
  messages: AssistantMessage[];
  unreadForAdmin: number;
  lastMessageTime: number;
}

interface ChatAssistantState {
  threads: Record<string, StudentThread>;
  activeStudentId: string; // ID học sinh đang được chọn (dành cho Admin)
  isOpen: boolean;
  adminView: 'list' | 'chat'; // Admin đang xem danh sách học sinh hay xem khung chat 1-1
  setIsOpen: (isOpen: boolean) => void;
  setAdminView: (view: 'list' | 'chat') => void;
  setActiveStudentId: (studentId: string) => void;
  setThreadMode: (studentId: string, mode: 'AI' | 'HUMAN', senderName?: string) => void;
  addMessageToThread: (
    studentId: string,
    studentMeta: { name: string; email?: string; avatar?: string },
    msg: Partial<AssistantMessage> & { role: 'user' | 'assistant' | 'admin' | 'system'; content: string }
  ) => void;
  clearThreadMessages: (studentId: string) => void;
  markThreadReadByAdmin: (studentId: string) => void;
}

const INITIAL_THREADS: Record<string, StudentThread> = {
  student_1: {
    studentId: 'student_1',
    studentName: 'Bảo Nam (Lớp 4A)',
    studentEmail: 'baonam@breadtrans.edu.vn',
    mode: 'AI',
    lastMessageTime: Date.now() - 1000 * 60 * 15,
    unreadForAdmin: 1,
    messages: [
      {
        id: 'msg-1',
        role: 'assistant',
        content: 'Chào Bảo Nam! Trợ Lý Bánh Mì có thể giúp gì cho bạn hôm nay? 🍞',
        senderName: 'Trợ Lý Bánh Mì 🍞',
        timestamp: Date.now() - 1000 * 60 * 20,
      },
      {
        id: 'msg-2',
        role: 'user',
        content: 'Thầy ơi cho em hỏi thì hiện tại hoàn thành khi nào dùng Since khi nào dùng For ạ?',
        senderName: 'Bảo Nam (Lớp 4A)',
        timestamp: Date.now() - 1000 * 60 * 15,
      },
    ],
  },
  student_2: {
    studentId: 'student_2',
    studentName: 'Minh Anh (Lớp 5B)',
    studentEmail: 'minhanh@breadtrans.edu.vn',
    mode: 'HUMAN',
    lastMessageTime: Date.now() - 1000 * 60 * 45,
    unreadForAdmin: 2,
    messages: [
      {
        id: 'msg-21',
        role: 'system',
        content: '👨‍🏫 Đã chuyển sang chế độ Hỗ Trợ Trực Tiếp với Thầy Cô.',
        timestamp: Date.now() - 1000 * 60 * 50,
      },
      {
        id: 'msg-22',
        role: 'user',
        content: 'Cô ơi bài tập Nói Unit 4 em nộp rồi nhưng chưa thấy chấm ạ?',
        senderName: 'Minh Anh (Lớp 5B)',
        timestamp: Date.now() - 1000 * 60 * 45,
      },
    ],
  },
  student_3: {
    studentId: 'student_3',
    studentName: 'Hoàng Long (Lớp 3C)',
    studentEmail: 'hoanglong@breadtrans.edu.vn',
    mode: 'AI',
    lastMessageTime: Date.now() - 1000 * 60 * 120,
    unreadForAdmin: 0,
    messages: [
      {
        id: 'msg-31',
        role: 'assistant',
        content: 'Chào Hoàng Long! Cùng luyện từ vựng tiếng Anh nhé! 🌟',
        senderName: 'Trợ Lý Bánh Mì 🍞',
        timestamp: Date.now() - 1000 * 60 * 130,
      },
      {
        id: 'msg-32',
        role: 'user',
        content: 'Con cá voi tiếng Anh đọc thế nào ạ?',
        senderName: 'Hoàng Long (Lớp 3C)',
        timestamp: Date.now() - 1000 * 60 * 125,
      },
      {
        id: 'msg-33',
        role: 'assistant',
        content: 'Con cá voi trong tiếng Anh là **whale** /weɪl/ bạn nhé! 🐳',
        senderName: 'Trợ Lý Bánh Mì 🍞',
        timestamp: Date.now() - 1000 * 60 * 120,
      },
    ],
  },
};

export const useChatAssistantStore = create<ChatAssistantState>()(
  persist(
    (set, get) => ({
      threads: INITIAL_THREADS,
      activeStudentId: 'student_1',
      isOpen: false,
      adminView: 'list', // Mặc định mở ra Admin xem danh sách hội thoại học sinh

      setIsOpen: (isOpen) => set({ isOpen }),
      setAdminView: (adminView) => set({ adminView }),
      setActiveStudentId: (activeStudentId) => {
        get().markThreadReadByAdmin(activeStudentId);
        set({ activeStudentId, adminView: 'chat' });
      },

      setThreadMode: (studentId, mode, senderName) => {
        const sysContent =
          mode === 'HUMAN'
            ? `👨‍🏫 ${senderName ? `[${senderName}]` : 'Ban Quản Trị / Thầy Cô'} đã chuyển sang chế độ TRỰC TIẾP HỖ TRỢ. Mọi câu hỏi của bạn sẽ được phản hồi bởi thầy cô!`
            : '🤖 Đã kích hoạt lại TRỢ LÝ AI. Bánh Mì Assistant sẽ tự động giải đáp mọi thắc mắc học tập ngay tức thì! 🍞✨';

        const sysMsg: AssistantMessage = {
          id: `sys-${Date.now()}`,
          role: 'system',
          content: sysContent,
          timestamp: Date.now(),
        };

        set((state) => {
          const currentThread = state.threads[studentId] || {
            studentId,
            studentName: 'Học viên',
            mode: 'AI',
            messages: [],
            unreadForAdmin: 0,
            lastMessageTime: Date.now(),
          };

          return {
            threads: {
              ...state.threads,
              [studentId]: {
                ...currentThread,
                mode,
                messages: [...currentThread.messages, sysMsg],
                lastMessageTime: Date.now(),
              },
            },
          };
        });
      },

      addMessageToThread: (studentId, studentMeta, msg) => {
        set((state) => {
          const currentThread = state.threads[studentId] || {
            studentId,
            studentName: studentMeta.name || 'Học viên',
            studentEmail: studentMeta.email,
            studentAvatar: studentMeta.avatar,
            mode: 'AI',
            messages: [
              {
                id: `init-${studentId}`,
                role: 'assistant',
                content: `Chào ${studentMeta.name || 'bạn'}! Mình là Trợ Lý Bánh Mì 🍞. Bạn có câu hỏi nào hôm nay không?`,
                senderName: 'Trợ Lý Bánh Mì 🍞',
                timestamp: Date.now() - 1000,
              },
            ],
            unreadForAdmin: 0,
            lastMessageTime: Date.now(),
          };

          const messageId = msg.id || `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
          const msgTimestamp = msg.timestamp || Date.now();

          // 🛡️ Kiểm tra chống trùng lặp tin nhắn (Deduplication)
          const isDuplicate = currentThread.messages.some((existing) => {
            if (msg.id && existing.id === msg.id) return true;
            if (
              existing.role === msg.role &&
              existing.content.trim() === msg.content.trim() &&
              Math.abs(existing.timestamp - msgTimestamp) < 3000
            ) {
              return true;
            }
            return false;
          });

          if (isDuplicate) {
            return state;
          }

          const newMsg: AssistantMessage = {
            ...msg,
            id: messageId,
            timestamp: msgTimestamp,
          };

          const isFromStudent = msg.role === 'user';

          return {
            threads: {
              ...state.threads,
              [studentId]: {
                ...currentThread,
                studentName: studentMeta.name || currentThread.studentName,
                studentEmail: studentMeta.email || currentThread.studentEmail,
                studentAvatar: studentMeta.avatar || currentThread.studentAvatar,
                messages: [...currentThread.messages, newMsg],
                unreadForAdmin: isFromStudent ? currentThread.unreadForAdmin + 1 : currentThread.unreadForAdmin,
                lastMessageTime: Date.now(),
              },
            },
          };
        });
      },

      clearThreadMessages: (studentId) => {
        set((state) => {
          const thread = state.threads[studentId];
          if (!thread) return state;

          return {
            threads: {
              ...state.threads,
              [studentId]: {
                ...thread,
                messages: [
                  {
                    id: `init-${Date.now()}`,
                    role: 'assistant',
                    content: 'Cuộc trò chuyện đã được làm mới. Hãy gửi câu hỏi bất kỳ cho Trợ Lý Bánh Mì nhé! 🍞',
                    senderName: 'Trợ Lý Bánh Mì 🍞',
                    timestamp: Date.now(),
                  },
                ],
                unreadForAdmin: 0,
                lastMessageTime: Date.now(),
              },
            },
          };
        });
      },

      markThreadReadByAdmin: (studentId) => {
        set((state) => {
          const thread = state.threads[studentId];
          if (!thread) return state;
          return {
            threads: {
              ...state.threads,
              [studentId]: {
                ...thread,
                unreadForAdmin: 0,
              },
            },
          };
        });
      },
    }),
    {
      name: 'breadtrans-multithread-chat-storage',
    }
  )
);
