import { create } from 'zustand';

export interface AssistantMessage {
  id: string | number;
  clientMessageId?: string;
  role: 'user' | 'assistant' | 'admin' | 'system';
  content: string;
  senderName?: string;
  timestamp: number;
  pending?: boolean;
}

export interface StudentThread {
  conversationId?: number;
  studentId: string;
  studentName: string;
  studentEmail?: string;
  studentAvatar?: string;
  mode: 'AI' | 'HUMAN';
  messages: AssistantMessage[];
  unreadForAdmin: number;
  lastMessageTime: number;
  loadedFromBackend?: boolean;
}

interface ChatAssistantState {
  threads: Record<string, StudentThread>;
  activeStudentId: string; // ID học sinh đang được chọn (dành cho Admin)
  isOpen: boolean;
  adminView: 'list' | 'chat';
  isLoading: boolean;
  setIsOpen: (isOpen: boolean) => void;
  setAdminView: (view: 'list' | 'chat') => void;
  setActiveStudentId: (studentId: string) => void;
  setIsLoading: (isLoading: boolean) => void;
  setThreadMode: (studentId: string, mode: 'AI' | 'HUMAN', senderName?: string) => void;
  loadThreadFromBackend: (
    studentId: string,
    conversationId: number,
    studentMeta: { name: string; email?: string; avatar?: string },
    mode: 'AI' | 'HUMAN',
    messages: AssistantMessage[],
    unreadCount?: number,
  ) => void;
  addMessageToThread: (
    studentId: string,
    studentMeta: { name: string; email?: string; avatar?: string },
    msg: Partial<AssistantMessage> & { role: 'user' | 'assistant' | 'admin' | 'system'; content: string }
  ) => void;
  markThreadReadByAdmin: (studentId: string) => void;
}

export const useChatAssistantStore = create<ChatAssistantState>()((set, get) => ({
  threads: {},
  activeStudentId: '',
  isOpen: false,
  adminView: 'list',
  isLoading: false,

  setIsOpen: (isOpen) => set({ isOpen }),
  setAdminView: (adminView) => set({ adminView }),
  setIsLoading: (isLoading) => set({ isLoading }),

  setActiveStudentId: (activeStudentId) => {
    get().markThreadReadByAdmin(activeStudentId);
    set({ activeStudentId, adminView: 'chat' });
  },

  setThreadMode: (studentId, mode, senderName) => {
    set((state) => {
      const currentThread = state.threads[studentId];
      if (!currentThread) return state;

      const sysContent =
        mode === 'HUMAN'
          ? `${senderName ? `[${senderName}]` : 'Ban Quản Trị / Thầy Cô'} đã chuyển sang chế độ hỗ trợ trực tiếp. Mọi câu hỏi của bạn sẽ được phản hồi bởi thầy cô!`
          : 'Đã kích hoạt lại chế độ phản hồi tự động. Hệ thống sẽ tự động hỗ trợ giải đáp thắc mắc học tập của bạn!';

      const sysMsg: AssistantMessage = {
        id: `sys-${Date.now()}`,
        role: 'system',
        content: sysContent,
        timestamp: Date.now(),
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

  loadThreadFromBackend: (studentId, conversationId, studentMeta, mode, messages, unreadCount = 0) => {
    set((state) => ({
      threads: {
        ...state.threads,
        [studentId]: {
          conversationId,
          studentId,
          studentName: studentMeta.name,
          studentEmail: studentMeta.email,
          studentAvatar: studentMeta.avatar,
          mode,
          messages,
          unreadForAdmin: unreadCount,
          lastMessageTime: messages.length > 0 ? messages[messages.length - 1].timestamp : Date.now(),
          loadedFromBackend: true,
        },
      },
    }));
  },

  addMessageToThread: (studentId, studentMeta, msg) => {
    set((state) => {
      const currentThread = state.threads[studentId] || {
        studentId,
        studentName: studentMeta.name || 'Học viên',
        studentEmail: studentMeta.email,
        studentAvatar: studentMeta.avatar,
        mode: 'AI',
        messages: [],
        unreadForAdmin: 0,
        lastMessageTime: Date.now(),
        loadedFromBackend: false,
      };

      const messageId = msg.id || `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const msgTimestamp = msg.timestamp || Date.now();

      // Deduplication: prevent duplicate messages by id or matching clientMessageId/content within 3s
      const isDuplicate = currentThread.messages.some((existing) => {
        if (msg.id && existing.id === msg.id) return true;
        if (msg.clientMessageId && existing.clientMessageId === msg.clientMessageId) return true;
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
        // If it was a pending message getting reconciled with confirmed DB id
        if (msg.id !== undefined && msg.clientMessageId) {
          const confirmedId = msg.id;
          const updatedMessages: AssistantMessage[] = currentThread.messages.map((m) =>
            m.clientMessageId === msg.clientMessageId ? { ...m, id: confirmedId, pending: false } : m
          );
          return {
            threads: {
              ...state.threads,
              [studentId]: {
                ...currentThread,
                messages: updatedMessages,
              },
            },
          };
        }
        return state;
      }

      const newMsg: AssistantMessage = {
        id: messageId,
        clientMessageId: msg.clientMessageId,
        role: msg.role,
        content: msg.content,
        senderName: msg.senderName,
        timestamp: msgTimestamp,
        pending: msg.pending,
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
}));
