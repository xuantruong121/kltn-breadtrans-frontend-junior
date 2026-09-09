export type MarketProductCategory = "BOOST" | "BADGE" | "AVATAR_FRAME" | "PHYSICAL";
export type MarketProductRarity = "COMMON" | "RARE" | "EPIC" | "LEGENDARY";

export interface MarketProduct {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  category: MarketProductCategory | string;
  rarity: MarketProductRarity | string;
  price: number;
  imageUrl: string | null;
  stock: number;
  purchaseCount: number;
  isActive: boolean;
}

export interface MarketInventoryResponse {
  ownedProductIds: number[];
  ownedItemNames: string[];
  ownedSlugs: string[];
}

export interface MarketBalanceResponse {
  totalBanh: number;
}

export interface MarketOrder {
  id: number;
  userId: number;
  totalPrice: number;
  status: "PENDING" | "APPROVED" | "REJECTED" | "REFUNDED" | string;
  items: Array<{
    productId?: number;
    slug?: string;
    name?: string;
    price?: number;
    quantity?: number;
  }>;
  createdAt: string;
}

export interface LeaderboardUser {
  id: string | number;
  name: string;
  avatar: string;
  breads: number;
  streak: number;
  rank: number;
}
