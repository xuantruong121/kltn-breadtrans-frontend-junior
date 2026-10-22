export interface MarketItemData {
  id: string;
  name: string;
  category: "badge" | "avatar" | "boost" | "gift";
  price: number;
  icon: string;
  description: string;
  rarity: "common" | "rare" | "epic" | "legendary";
}

export const MARKET_ITEMS: MarketItemData[] = [
  {
    id: "streak-freeze",
    name: "Vé bảo vệ chuỗi học (Streak Freeze)",
    category: "boost",
    price: 250,
    icon: "/images/market/streak-freeze.svg",
    description: "Tự động kích hoạt giữ chuỗi học tập nếu bạn bận rộn bỏ lỡ 1 ngày.",
    rarity: "rare",
  },
  {
    id: "double-bread",
    name: "Thẻ nhân đôi Bánh Mì (24h Boost)",
    category: "boost",
    price: 200,
    icon: "/images/market/double-bread.svg",
    description: "Nhận gấp đôi số lượng Bánh Mì thưởng khi làm quiz và bài tập.",
    rarity: "epic",
  },
  {
    id: "badge-master",
    name: "Huy hiệu Bậc Thầy Từ Vựng",
    category: "badge",
    price: 150,
    icon: "/images/market/badge-master.svg",
    description: "Huy hiệu vinh danh học sinh chuyên cần vượt mốc 100 từ vựng.",
    rarity: "common",
  },
  {
    id: "badge-star",
    name: "Huy hiệu Ngôi Sao",
    category: "badge",
    price: 100,
    icon: "/images/market/badge-star.svg",
    description: "Huy hiệu vinh danh học viên tích cực học tập mỗi ngày.",
    rarity: "common",
  },
  {
    id: "frame-crown",
    name: "Khung avatar Vương Miện Quán Quân",
    category: "avatar",
    price: 450,
    icon: "/images/market/frame-crown.svg",
    description: "Khung avatar hoàng gia thể hiện vị thế top 1 bảng xếp hạng.",
    rarity: "legendary",
  },
  {
    id: "frame-orange",
    name: "Khung avatar Cam",
    category: "avatar",
    price: 180,
    icon: "/images/market/frame-orange.svg",
    description: "Khung avatar màu cam năng động phong cách BreadTrans.",
    rarity: "rare",
  },
  {
    id: "frame-cyber",
    name: "Khung avatar Cyber Tech",
    category: "avatar",
    price: 350,
    icon: "/images/market/frame-cyber.svg",
    description: "Hiệu ứng viền phát sáng Cyan phong cách công nghệ hiện đại.",
    rarity: "rare",
  },
  {
    id: "gift-notebook",
    name: "Sổ tay từ vựng BreadTrans",
    category: "gift",
    price: 1200,
    icon: "/images/market/gift-notebook.svg",
    description: "Quà hiện vật sổ tay ghi chú bìa cứng gửi bưu điện về tận nhà.",
    rarity: "epic",
  },
  {
    id: "gift-voucher",
    name: "Voucher đồ uống Phúc Long 30K",
    category: "gift",
    price: 2000,
    icon: "/images/market/gift-voucher.svg",
    description: "Đổi mã E-Voucher đồ uống giải lao sau các buổi học.",
    rarity: "legendary",
  },
  {
    id: "gift-plush",
    name: "Gấu bông Bánh Mì linh vật",
    category: "gift",
    price: 4500,
    icon: "/images/market/gift-plush.svg",
    description: "Gấu bông bánh mì siêu mềm mịn độc quyền từ BreadTrans.",
    rarity: "legendary",
  },
  {
    id: "gift-bottle",
    name: "Bình giữ nhiệt BreadTrans 500ml",
    category: "gift",
    price: 3500,
    icon: "/images/market/gift-bottle.svg",
    description: "Bình giữ nhiệt inox cao cấp giữ nóng lạnh suốt 12 tiếng.",
    rarity: "epic",
  },
  {
    id: "pet-bun",
    name: "Pet Bun đồng hành",
    category: "boost",
    price: 500,
    icon: "/images/market/pet-bun.svg",
    description: "Thú cưng Bun phiên bản đặc biệt đồng hành trong bài học.",
    rarity: "epic",
  },
];
