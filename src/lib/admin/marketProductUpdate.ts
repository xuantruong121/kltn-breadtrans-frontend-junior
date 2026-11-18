import type {
  CreateMarketProductPayload,
  UpdateMarketProductPayload,
} from "../api/services/admin-market.service.ts";

/**
 * The body of "Lưu" in the gift edit form. The stock goes only when the
 * admin changed it, with the stock the form loaded: the server refuses it
 * (409) if a learner bought or was refunded since, instead of writing the old
 * number back (audit R9, 2026-11-18).
 */
export function marketProductUpdateBody(
  form: CreateMarketProductPayload,
  loadedStock: number,
): UpdateMarketProductPayload {
  const stock = Number(form.stock);
  const body: UpdateMarketProductPayload = {
    name: form.name.trim(),
    slug: form.slug?.trim() || undefined,
    description: form.description?.trim() || undefined,
    category: form.category,
    rarity: form.rarity,
    price: Number(form.price),
    imageUrl: form.imageUrl?.trim() || undefined,
    order: Number(form.order) || 0,
    isActive: form.isActive,
    fulfillmentType: form.fulfillmentType,
  };
  if (stock !== loadedStock) {
    body.stock = stock;
    body.expectedStock = loadedStock;
  }
  return body;
}
