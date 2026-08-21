import { create } from "zustand";
import { persist } from "zustand/middleware";

interface GamificationState {
  breads: number; // Số dư "bánh mì"
  streak: number; // Chuỗi ngày học
  exp: number; // Điểm kinh nghiệm
  level: number;
  unlockedItems: string[]; // ID các vật phẩm đã mua
  equippedAvatarFrame: string | null; // ID khung avatar đang đeo
  equippedBadge: string | null; // ID huy hiệu đang đeo
  
  // Actions
  setBreads: (amount: number) => void;
  setStats: (stats: { breads?: number; streak?: number; exp?: number; level?: number }) => void;
  addBreads: (amount: number) => void;
  spendBreads: (amount: number) => boolean;
  addExp: (amount: number) => void;
  incrementStreak: () => void;
  unlockItem: (itemId: string) => void;
  equipAvatarFrame: (frameId: string | null) => void;
  equipBadge: (badgeId: string | null) => void;
}

export const useGamificationStore = create<GamificationState>()(
  persist(
    (set, get) => ({
      breads: 0, // Giá trị khởi tạo mặc định cho học sinh mới là 0
      streak: 1,
      exp: 0,
      level: 1,
      unlockedItems: [],
      equippedAvatarFrame: null,
      equippedBadge: null,

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
        set((state) => {
          const newUnlocked = state.unlockedItems.includes(itemId)
            ? state.unlockedItems
            : [...state.unlockedItems, itemId];
          
          let newFrame = state.equippedAvatarFrame;
          let newBadge = state.equippedBadge;

          if (itemId.startsWith("item_avatar_") && !newFrame) {
            newFrame = itemId;
          }
          if (itemId.startsWith("item_badge_") && !newBadge) {
            newBadge = itemId;
          }

          return {
            unlockedItems: newUnlocked,
            equippedAvatarFrame: newFrame,
            equippedBadge: newBadge,
          };
        });
      },

      equipAvatarFrame: (frameId: string | null) => set({ equippedAvatarFrame: frameId }),
      equipBadge: (badgeId: string | null) => set({ equippedBadge: badgeId }),
    }),
    {
      name: "breadtrans_gamification_storage",
    }
  )
);
