import type { MarketProduct } from "./types.ts";

export type ExchangeValidationResult =
  | { canOpenModal: true }
  | {
      canOpenModal: false;
      reason: "GUEST" | "OUT_OF_STOCK" | "INSUFFICIENT_BALANCE" | "INVALID_PRODUCT";
      message: string;
    };

/**
 * Validates whether a student can proceed to open the exchange confirmation modal.
 * Business rules:
 * 1. Guests cannot exchange directly (must open Auth Gate).
 * 2. Out of stock products cannot be exchanged.
 * 3. Cannot exchange if current balance is lower than product price.
 */
export function validateMarketExchange({
  isGuest,
  currentBalance,
  product,
}: {
  isGuest: boolean;
  currentBalance: number;
  product: MarketProduct | null | undefined;
}): ExchangeValidationResult {
  if (!product) {
    return {
      canOpenModal: false,
      reason: "INVALID_PRODUCT",
      message: "Vật phẩm không hợp lệ!",
    };
  }

  if (isGuest) {
    return {
      canOpenModal: false,
      reason: "GUEST",
      message: "Vui lòng đăng nhập để đổi vật phẩm!",
    };
  }

  if (product.stock <= 0) {
    return {
      canOpenModal: false,
      reason: "OUT_OF_STOCK",
      message: "Vật phẩm hiện tại đã hết hàng!",
    };
  }

  if (currentBalance < product.price) {
    return {
      canOpenModal: false,
      reason: "INSUFFICIENT_BALANCE",
      message: "Bạn không đủ số Bánh Mì để đổi vật phẩm này!",
    };
  }

  return { canOpenModal: true };
}

/**
 * Calculates remaining balance after an exchange.
 * Never allows negative return numbers in display.
 */
export function calculateRemainingBalance(currentBalance: number, price: number): number {
  return Math.max(0, currentBalance - price);
}

/**
 * Formats Bánh Mì number with Vietnamese locale format.
 */
export function formatBanhMi(amount: number): string {
  return (amount || 0).toLocaleString("vi-VN");
}

/**
 * Builds the canonical POST /market/orders payload for a single item exchange.
 */
export function buildMarketOrderPayload(product: MarketProduct) {
  return {
    items: [
      {
        id: product.id,
        slug: product.slug,
        quantity: 1,
      },
    ],
  };
}

const PHYSICAL_SLUGS = new Set(["gift-notebook", "gift-bottle", "gift-plush"]);

/**
 * Checks whether a product requires physical shipping information.
 */
export function requiresShippingForProduct(product: {
  slug?: string;
  fulfillmentType?: string;
  requiresShippingAddress?: boolean;
  category?: string;
} | null | undefined): boolean {
  if (!product) return false;
  return (
    product.fulfillmentType === "PHYSICAL" ||
    Boolean(product.requiresShippingAddress) ||
    product.category === "PHYSICAL" ||
    (Boolean(product.slug) && PHYSICAL_SLUGS.has(product.slug!))
  );
}

/**
 * Evaluates whether a shipping profile contains all required fields.
 */
export function isShippingComplete(profile: {
  recipientName?: string | null;
  phone?: string | null;
  recipientPhone?: string | null;
  provinceCode?: string | null;
  wardCode?: string | null;
  addressLine?: string | null;
  addressDetail?: string | null;
} | null | undefined): boolean {
  if (!profile) return false;
  const name = profile.recipientName?.trim();
  const phone = (profile.phone || profile.recipientPhone)?.trim();
  const province = profile.provinceCode?.trim();
  const ward = profile.wardCode?.trim();
  const address = (profile.addressLine || profile.addressDetail)?.trim();
  return Boolean(name && phone && province && ward && address);
}

