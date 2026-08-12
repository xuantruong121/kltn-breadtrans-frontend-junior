import { create } from "zustand";
import { persist } from "zustand/middleware";
import axiosClient from "@/lib/api/axiosClient";

function customDebounce(func: Function, wait: number) {
  let timeout: NodeJS.Timeout;
  return function executedFunction(...args: any[]) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

interface ToeicState {
  answers: Record<string, number>;
  attemptId: number | null;
  timeRemaining: number | null;
  
  setAttempt: (attemptId: number, timeRemaining: number) => void;
  setAnswer: (questionId: number, selectedIndex: number) => void;
  syncWithServer: () => Promise<void>;
  submitAttempt: () => Promise<void>;
  clearState: () => void;
}

// Create a debounced save function outside the store to ensure it's a singleton per session
const debouncedSave = customDebounce(async (attemptId: number, answers: Record<string, number>) => {
  if (!attemptId) return;
  try {
    await axiosClient.patch(`/toeic/attempts/${attemptId}/answers`, { answers });
    console.log("Auto-saved answers to server");
  } catch (error) {
    console.error("Failed to auto-save, fallback to localStorage only", error);
  }
}, 5000); // Debounce 5 seconds

export const useToeicStore = create<ToeicState>()(
  persist(
    (set, get) => ({
      answers: {},
      attemptId: null,
      timeRemaining: null,

      setAttempt: (attemptId, timeRemaining) => {
        set({ attemptId, timeRemaining });
      },

      setAnswer: (questionId, selectedIndex) => {
        set((state) => {
          const newAnswers = { ...state.answers, [questionId]: selectedIndex };
          
          // Trigger debounced auto-save
          if (state.attemptId) {
            debouncedSave(state.attemptId, newAnswers);
          }
          
          return { answers: newAnswers };
        });
      },

      syncWithServer: async () => {
        const { attemptId, answers } = get();
        if (!attemptId) return;
        try {
          await axiosClient.patch(`/toeic/attempts/${attemptId}/answers`, { answers });
          const res: any = await axiosClient.get(`/toeic/attempts/${attemptId}/remaining-time`);
          set({ timeRemaining: res.remaining });
        } catch (error) {
          console.error("Sync failed", error);
        }
      },

      submitAttempt: async () => {
        const { attemptId, answers } = get();
        if (!attemptId) return;
        
        // Final sync before submit
        await axiosClient.patch(`/toeic/attempts/${attemptId}/answers`, { answers });
        await axiosClient.post(`/toeic/attempts/${attemptId}/submit`);
        
        get().clearState();
      },

      clearState: () => {
        set({ answers: {}, attemptId: null, timeRemaining: null });
      }
    }),
    {
      name: "toeic-storage",
      // Only persist answers and attemptId, not timeRemaining (always fetch from server)
      partialize: (state) => ({ answers: state.answers, attemptId: state.attemptId }),
    }
  )
);
