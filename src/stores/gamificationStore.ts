import { create } from "zustand";
import { persist } from "zustand/middleware";

interface GamificationState {
  breads: number; // Số dư "bánh mì"
  streak: number; // Chuỗi ngày học
  exp: number; // Điểm kinh nghiệm
  level: number;
  unlockedItems: string[]; // ID các vật phẩm đã mua
  
  // Actions
  setBreads: (amount: number) => void;
  setStats: (stats: { breads?: number; streak?: number; exp?: number; level?: number }) => void;
  addBreads: (amount: number) => void;
  spendBreads: (amount: number) => boolean;
  addExp: (amount: number) => void;
  incrementStreak: () => void;
  unlockItem: (itemId: string) => void;
}

export const useGamificationStore = create<GamificationState>()(
  persist(
    (set, get) => ({
      breads: 0, // Giá trị khởi tạo mặc định cho học sinh mới là 0
      streak: 1,
      exp: 0,
      level: 1,
      unlockedItems: [],

      setBreads: (amount: number) => set({ breads: amount }),
      
      setStats: (stats) =>
        set((state) => ({
          breads: stats.breads !== undefined ? stats.breads : state.breads,
          streak: stats.streak !== undefined ? stats.streak : state.streak,
          exp: stats.exp !== undefined ? stats.exp : state.exp,
          level: stats.level !== undefined ? stats.level : state.level,
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

      addExp: (amount: number) => {
        set((state) => {
          const newExp = state.exp + amount;
          const newLevel = Math.floor(newExp / 200) + 1;
          return { exp: newExp, level: newLevel };
        });
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
