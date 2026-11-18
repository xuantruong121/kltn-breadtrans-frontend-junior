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
  equippedAvatarFrame: string | null; // ID khung avatar đang đeo
  equippedBadge: string | null; // ID huy hiệu đang đeo
  
  // Actions
  setBreads: (amount: number) => void;
  setStats: (stats: { breads?: number; streak?: number; streakFreezes?: number; exp?: number; totalXp?: number }) => void;
  addBreads: (amount: number) => void;
  spendBreads: (amount: number) => boolean;
  incrementStreak: () => void;
  unlockItem: (itemId: string) => void;
  equipAvatarFrame: (frameId: string | null) => void;
  equipBadge: (badgeId: string | null) => void;
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
      equippedAvatarFrame: null,
      equippedBadge: null,

      reset: () =>
        set({
          breads: 0,
          streak: 0,
          streakFreezes: 0,
          exp: 0,
          totalXp: null,
          unlockedItems: [],
          equippedAvatarFrame: null,
          equippedBadge: null,
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
