export interface MarketItem {
  id: string;
  name: string;
  category: "badge" | "avatar" | "boost" | "gift";
  price: number; // in breads 🍞
  icon: string;
  description: string;
  rarity: "common" | "rare" | "epic" | "legendary";
}

export interface LeaderboardUser {
  id: string;
  name: string;
  avatar: string;
  breads: number;
  streak: number;
  rank: number;
}
