import { create } from "zustand";
import { persist } from "zustand/middleware";

interface GamificationState {
  breads: number; // Số dư "bánh mì"
  streak: number; // Chuỗi ngày học
  streakFreezes: number; // Khiên giữ chuỗi đang có
  exp: number; // XP của tuần này (bảng xếp hạng tuần)
  /** Tổng XP từ trước tới nay; cấp độ tính từ số này (lib/gamification/xpLevel.ts). Null khi chưa tải. */
  totalXp: number | null;
  unlockedItems: string[]; // ID các vật phẩm đã mua
  // The worn frame and badge live on the profile now (lib/avatar/useCosmetics).
  
  // Actions
  setBreads: (amount: number) => void;
  setStats: (stats: { breads?: number; streak?: number; streakFreezes?: number; exp?: number; totalXp?: number }) => void;
  addBreads: (amount: number) => void;
  spendBreads: (amount: number) => boolean;
  incrementStreak: () => void;
  unlockItem: (itemId: string) => void;
  reset: () => void;
}

export const useGamificationStore = create<GamificationState>()(
  persist(
    (set, get) => ({
      breads: 0, // Giá trị khởi tạo mặc định cho học sinh mới là 0
      // 0 until /users/stats arrives: a new or broken streak is never shown as 1.
      streak: 0,
      streakFreezes: 0,
      exp: 0,
      totalXp: null,
      unlockedItems: [],

      reset: () =>
        set({
          breads: 0,
          streak: 0,
          streakFreezes: 0,
          exp: 0,
          totalXp: null,
          unlockedItems: [],
        }),

      setBreads: (amount: number) => set({ breads: amount }),
      
      setStats: (stats) =>
        set((state) => ({
          breads: stats.breads !== undefined ? stats.breads : state.breads,
          streak: stats.streak !== undefined ? stats.streak : state.streak,
          streakFreezes: stats.streakFreezes !== undefined ? stats.streakFreezes : state.streakFreezes,
          exp: stats.exp !== undefined ? stats.exp : state.exp,
          totalXp: stats.totalXp !== undefined ? stats.totalXp : state.totalXp,
        })),

      addBreads: (amount: number) => set((state) => ({ breads: state.breads + amount })),
      
      spendBreads: (amount: number) => {
        const current = get().breads;
        if (current >= amount) {
          set({ breads: current - amount });
          return true;
        }
        return false;
      },

      incrementStreak: () => set((state) => ({ streak: state.streak + 1 })),

      unlockItem: (itemId: string) => {
        set((state) => ({
          unlockedItems: state.unlockedItems.includes(itemId)
            ? state.unlockedItems
            : [...state.unlockedItems, itemId],
        }));
      },
    }),
    {
      name: "breadtrans_gamification_storage",
    }
  )
);
