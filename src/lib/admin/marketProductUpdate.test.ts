import assert from "node:assert/strict";
import { test } from "node:test";
import { marketProductUpdateBody } from "./marketProductUpdate.ts";

const form = {
  name: "Sổ tay",
  slug: "so-tay",
  description: "",
  category: "GENERAL",
  rarity: "COMMON",
  price: 100,
  stock: 5,
  imageUrl: "",
  order: 0,
  isActive: true,
  fulfillmentType: "PHYSICAL" as const,
};

test("an unchanged stock is not sent, so a sale meanwhile is kept (audit R9)", () => {
  const body = marketProductUpdateBody({ ...form, name: "Sổ tay mới" }, 5);
  assert.equal(body.name, "Sổ tay mới");
  assert.equal("stock" in body, false);
  assert.equal("expectedStock" in body, false);
});

test("a changed stock is sent with the stock the form loaded", () => {
  const body = marketProductUpdateBody({ ...form, stock: 12 }, 5);
  assert.equal(body.stock, 12);
  assert.equal(body.expectedStock, 5);
});

test("a stock typed as text is compared as a number", () => {
  const body = marketProductUpdateBody({ ...form, stock: "5" as unknown as number }, 5);
  assert.equal("stock" in body, false);
});
