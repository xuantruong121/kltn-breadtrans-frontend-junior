import assert from "node:assert/strict";
import test from "node:test";

import { deviceLabel, lastUsedText } from "./deviceLabel.ts";

test("names the browser and system of common user agents", () => {
  assert.deepEqual(
    deviceLabel("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36"),
    { browser: "Chrome", os: "Windows", mobile: false },
  );
  assert.deepEqual(
    deviceLabel("Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Chrome/120.0 Safari/537.36 Edg/120.0"),
    { browser: "Edge", os: "Windows", mobile: false },
  );
  assert.deepEqual(
    deviceLabel("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1"),
    { browser: "Safari", os: "iOS", mobile: true },
  );
  assert.deepEqual(deviceLabel("Mozilla/5.0 (Linux; Android 14) Chrome/120 Mobile Safari/537.36"), {
    browser: "Chrome",
    os: "Android",
    mobile: true,
  });
  assert.deepEqual(deviceLabel(null), { browser: "Trình duyệt", os: "thiết bị không rõ", mobile: false });
});

test("says when a device was last used in plain words", () => {
  const now = Date.parse("2026-11-14T10:00:00Z");
  assert.equal(lastUsedText("2026-11-14T09:59:30Z", now), "Vừa xong");
  assert.equal(lastUsedText("2026-11-14T09:30:00Z", now), "30 phút trước");
  assert.equal(lastUsedText("2026-11-14T07:00:00Z", now), "3 giờ trước");
  assert.equal(lastUsedText("2026-11-13T09:00:00Z", now), "Hôm qua");
  assert.equal(lastUsedText("2026-11-10T10:00:00Z", now), "4 ngày trước");
});
