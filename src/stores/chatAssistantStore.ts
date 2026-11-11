import { create } from 'zustand';
import { mergeServerMessages } from "@/lib/chat/threadSync";

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
  hasMoreHistory?: boolean;
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
  setThreadMode: (studentId: string, mode: 'AI' | 'HUMAN', systemMessage?: string) => void;
  loadThreadFromBackend: (
    studentId: string,
    conversationId: number,
    studentMeta: { name: string; email?: string; avatar?: string },
    mode: 'AI' | 'HUMAN',
    messages: AssistantMessage[],
    unreadCount?: number,
    hasMoreHistory?: boolean,
  ) => void;
  prependMessagesToThread: (
    studentId: string,
    olderMessages: AssistantMessage[],
  ) => void;
  setThreadHasMore: (studentId: string, hasMore: boolean) => void;
  /** Adds what the server holds and the thread does not, and takes the server's mode, without a system line. */
  syncThreadFromServer: (
    studentId: string,
    mode: 'AI' | 'HUMAN',
    serverMessages: AssistantMessage[],
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

  setThreadMode: (studentId, mode, systemMessage) => {
    set((state) => {
      const currentThread = state.threads[studentId];
      // The switch arrives twice for whoever made it (their own click and the
      // server's event); the second one must not add a second line.
      if (!currentThread || currentThread.mode === mode) return state;

      const sysContent =
        systemMessage ||
        (mode === 'HUMAN'
          ? 'Quản trị viên đã tham gia trò chuyện. Trợ lý AI tạm dừng trả lời.'
          : 'Trợ lý AI tiếp tục trả lời trong cuộc trò chuyện này.');

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

  loadThreadFromBackend: (studentId, conversationId, studentMeta, mode, messages, unreadCount = 0, hasMoreHistory = false) => {
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
          hasMoreHistory,
        },
      },
    }));
  },

  prependMessagesToThread: (studentId, olderMessages) => {
    set((state) => {
      const currentThread = state.threads[studentId];
      if (!currentThread) return state;

      const existingIds = new Set(
        currentThread.messages.map((m) => String(m.clientMessageId || m.id))
      );
      const uniqueOlder = olderMessages.filter(
        (m) => !existingIds.has(String(m.clientMessageId || m.id))
      );

      if (uniqueOlder.length === 0) return state;

      return {
        threads: {
          ...state.threads,
          [studentId]: {
            ...currentThread,
            messages: [...uniqueOlder, ...currentThread.messages],
          },
        },
      };
    });
  },

  syncThreadFromServer: (studentId, mode, serverMessages) => {
    set((state) => {
      const currentThread = state.threads[studentId];
      if (!currentThread) return state;
      const messages = mergeServerMessages(currentThread.messages, serverMessages);
      if (messages === currentThread.messages && currentThread.mode === mode) return state;
      return {
        threads: {
          ...state.threads,
          [studentId]: {
            ...currentThread,
            mode,
            messages,
            lastMessageTime: messages.length > 0 ? messages[messages.length - 1].timestamp : currentThread.lastMessageTime,
          },
        },
      };
    });
  },

  setThreadHasMore: (studentId, hasMore) => {
    set((state) => {
      const currentThread = state.threads[studentId];
      if (!currentThread) return state;
      return {
        threads: {
          ...state.threads,
          [studentId]: {
            ...currentThread,
            hasMoreHistory: hasMore,
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
