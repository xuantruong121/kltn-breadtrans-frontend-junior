import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  validateMarketExchange,
  calculateRemainingBalance,
  formatBanhMi,
  buildMarketOrderPayload,
} from "./marketExchangeLogic.ts";
import type { MarketProduct } from "./types.ts";

const MOCK_PRODUCT: MarketProduct = {
  id: 101,
  slug: "streak-freeze-24h",
  name: "Khiên Bảo Vệ Streak 24h",
  description: "Bảo vệ chuỗi học tập khi lỡ quên 1 ngày.",
  category: "BOOST",
  rarity: "RARE",
  price: 100,
  imageUrl: "/images/market/streak-freeze.svg",
  stock: 15,
  purchaseCount: 42,
  isActive: true,
};

test("MarketExchangeLogic: Guest user cannot open confirmation modal", () => {
  const result = validateMarketExchange({
    isGuest: true,
    currentBalance: 500,
    product: MOCK_PRODUCT,
  });

  assert.equal(result.canOpenModal, false);
  if (!result.canOpenModal) {
    assert.equal(result.reason, "GUEST");
    assert.equal(result.message, "Vui lòng đăng nhập để đổi vật phẩm!");
  }
});

test("MarketExchangeLogic: Out-of-stock product cannot open confirmation modal", () => {
  const outOfStockProduct: MarketProduct = {
    ...MOCK_PRODUCT,
    stock: 0,
  };

  const result = validateMarketExchange({
    isGuest: false,
    currentBalance: 500,
    product: outOfStockProduct,
  });

  assert.equal(result.canOpenModal, false);
  if (!result.canOpenModal) {
    assert.equal(result.reason, "OUT_OF_STOCK");
    assert.equal(result.message, "Vật phẩm hiện tại đã hết hàng!");
  }
});

test("MarketExchangeLogic: Insufficient balance cannot open confirmation modal", () => {
  const result = validateMarketExchange({
    isGuest: false,
    currentBalance: 80, // Product price is 100
    product: MOCK_PRODUCT,
  });

  assert.equal(result.canOpenModal, false);
  if (!result.canOpenModal) {
    assert.equal(result.reason, "INSUFFICIENT_BALANCE");
    assert.equal(result.message, "Bạn không đủ số Bánh Mì để đổi vật phẩm này!");
  }
});

test("MarketExchangeLogic: Valid student with enough balance and stock can open modal", () => {
  const result = validateMarketExchange({
    isGuest: false,
    currentBalance: 120, // Enough for 100
    product: MOCK_PRODUCT,
  });

  assert.equal(result.canOpenModal, true);
});

test("MarketExchangeLogic: Balance arithmetic calculates remaining balance correctly", () => {
  assert.equal(calculateRemainingBalance(500, 100), 400);
  assert.equal(calculateRemainingBalance(100, 100), 0);
  assert.equal(calculateRemainingBalance(50, 100), 0); // clamped at 0
});

test("MarketExchangeLogic: formatBanhMi formats numbers properly", () => {
  const formatted = formatBanhMi(1250);
  // Vietnamese locale uses . or non-breaking space depending on env, ensure it formats
  assert.ok(formatted.includes("1") && formatted.includes("250"));
});

test("MarketExchangeLogic: buildMarketOrderPayload outputs canonical order schema", () => {
  const payload = buildMarketOrderPayload(MOCK_PRODUCT);
  assert.deepEqual(payload, {
    items: [
      {
        id: 101,
        slug: "streak-freeze-24h",
        quantity: 1,
      },
    ],
  });
});

test("MarketExchangeLogic: Invariant check - No native confirm dialogs in src", () => {
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  const srcDir = path.resolve(currentDir, "../../");
  function scanDir(dir: string): string[] {
    const files = fs.readdirSync(dir, { withFileTypes: true });
    let matches: string[] = [];
    for (const file of files) {
      const fullPath = path.join(dir, file.name);
      if (file.isDirectory()) {
        matches = matches.concat(scanDir(fullPath));
      } else if (/\.(tsx|ts|jsx|js)$/.test(file.name) && !file.name.includes(".test.")) {
        const content = fs.readFileSync(fullPath, "utf-8");
        if (/\b(window\.)?confirm\s*\(/.test(content)) {
          matches.push(fullPath);
        }
      }
    }
    return matches;
  }

  const confirmCalls = scanDir(srcDir);
  assert.equal(
    confirmCalls.length,
    0,
    `Found native confirm() in: ${confirmCalls.join(", ")}`
  );
});
