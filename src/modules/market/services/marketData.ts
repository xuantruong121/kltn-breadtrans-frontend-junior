import { MarketItem, LeaderboardUser } from "../types";

export const MARKET_ITEMS: MarketItem[] = [
  {
    id: "item_super_streak",
    name: "Khiên Bảo Vệ Streak",
    category: "boost",
    price: 50,
    icon: "🛡️",
    description: "Giữ chuỗi ngày học nếu bạn vô tình bỏ lỡ 1 ngày.",
    rarity: "rare",
  },
  {
    id: "item_double_bread",
    name: "Nhân Đôi Bánh Mì (24h)",
    category: "boost",
    price: 80,
    icon: "⚡",
    description: "Nhận gấp 2 số Bánh Mì khi hoàn thành các bài học trong 24h.",
    rarity: "epic",
  },
  {
    id: "item_avatar_crown",
    name: "Vương Miện Quán Quân",
    category: "avatar",
    price: 150,
    icon: "👑",
    description: "Khung avatar lấp lánh khẳng định vị thế dẫn đầu.",
    rarity: "legendary",
  },
  {
    id: "item_badge_master",
    name: "Huy Hiệu Bậc Thầy Từ Vựng",
    category: "badge",
    price: 30,
    icon: "🏅",
    description: "Huy hiệu vinh danh học sinh chăm chỉ học Flashcard.",
    rarity: "common",
  },
  {
    id: "item_tea_voucher",
    name: "Voucher Trà Sữa 20K",
    category: "gift",
    price: 300,
    icon: "🧋",
    description: "Đổi điểm thưởng lấy voucher thưởng thực tế từ BreadTrans!",
    rarity: "legendary",
  },
  {
    id: "item_notebook",
    name: "Sổ Tay Học Từ Vựng Mini",
    category: "gift",
    price: 200,
    icon: "📔",
    description: "Quà tặng sổ tay dễ thương gửi về tận nhà cho học sinh xuất sắc.",
    rarity: "epic",
  },
];

export const MOCK_LEADERBOARD: LeaderboardUser[] = [
  { id: "u1", name: "Minh Anh (Junior)", avatar: "🦊", breads: 850, streak: 28, rank: 1 },
  { id: "u2", name: "Bảo Nam", avatar: "🐼", breads: 720, streak: 21, rank: 2 },
  { id: "u3", name: "Gia Hân", avatar: "🐰", breads: 640, streak: 19, rank: 3 },
  { id: "u4", name: "Tuấn Kiệt", avatar: "🦁", breads: 510, streak: 14, rank: 4 },
  { id: "u5", name: "Phương Linh", avatar: "🐱", breads: 430, streak: 12, rank: 5 },
];
