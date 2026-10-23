import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  resolveAvatarFrame,
  resolveUserBadge,
} from "./avatarCustomizationLogic.ts";

describe("AvatarCustomizationLogic: Frame Resolution", () => {
  it("resolves frame-orange by slug, id, or legacy name", () => {
    const bySlug = resolveAvatarFrame("frame-orange");
    assert.ok(bySlug);
    assert.equal(bySlug.key, "frame-orange");
    assert.equal(bySlug.svgUrl, "/images/market/frame-orange.svg");

    const byId = resolveAvatarFrame("2");
    assert.ok(byId);
    assert.equal(byId.key, "frame-orange");

    const byNumber = resolveAvatarFrame(2);
    assert.ok(byNumber);
    assert.equal(byNumber.key, "frame-orange");

    const byLegacy = resolveAvatarFrame("item_avatar_orange");
    assert.ok(byLegacy);
    assert.equal(byLegacy.key, "frame-orange");
  });

  it("resolves frame-crown by slug, id, or legacy name", () => {
    const bySlug = resolveAvatarFrame("frame-crown");
    assert.ok(bySlug);
    assert.equal(bySlug.key, "frame-crown");
    assert.equal(bySlug.svgUrl, "/images/market/frame-crown.svg");

    const byId = resolveAvatarFrame("7");
    assert.ok(byId);
    assert.equal(byId.key, "frame-crown");

    const byNumber = resolveAvatarFrame(7);
    assert.ok(byNumber);
    assert.equal(byNumber.key, "frame-crown");

    const byLegacy = resolveAvatarFrame("item_avatar_crown");
    assert.ok(byLegacy);
    assert.equal(byLegacy.key, "frame-crown");
  });

  it("resolves frame-cyber by slug, id, or legacy name", () => {
    const bySlug = resolveAvatarFrame("frame-cyber");
    assert.ok(bySlug);
    assert.equal(bySlug.key, "frame-cyber");
    assert.equal(bySlug.svgUrl, "/images/market/frame-cyber.svg");

    const byId = resolveAvatarFrame("8");
    assert.ok(byId);
    assert.equal(byId.key, "frame-cyber");

    const byLegacy = resolveAvatarFrame("item_avatar_cyber");
    assert.ok(byLegacy);
    assert.equal(byLegacy.key, "frame-cyber");
  });

  it("returns null for null, undefined, empty, or unknown frames", () => {
    assert.equal(resolveAvatarFrame(null), null);
    assert.equal(resolveAvatarFrame(undefined), null);
    assert.equal(resolveAvatarFrame(""), null);
    assert.equal(resolveAvatarFrame("unknown_frame_xyz"), null);
  });
});

describe("AvatarCustomizationLogic: Badge Resolution", () => {
  it("resolves badge-star to high-res SVG", () => {
    const star = resolveUserBadge("badge-star");
    assert.ok(star);
    assert.equal(star.type, "svg");
    assert.equal(star.content, "/images/market/badge-star.svg");

    const byId = resolveUserBadge("1");
    assert.ok(byId);
    assert.equal(byId.type, "svg");
    assert.equal(byId.content, "/images/market/badge-star.svg");
  });

  it("resolves badge-master to high-res SVG", () => {
    const master = resolveUserBadge("badge-master");
    assert.ok(master);
    assert.equal(master.type, "svg");
    assert.equal(master.content, "/images/market/badge-master.svg");

    const byId = resolveUserBadge(6);
    assert.ok(byId);
    assert.equal(byId.type, "svg");
  });

  it("resolves arena badges to corresponding emojis", () => {
    const b1 = resolveUserBadge("badge_1");
    assert.ok(b1);
    assert.equal(b1.type, "emoji");
    assert.equal(b1.content, "🛡️");

    const b2 = resolveUserBadge("Chăm Chỉ");
    assert.ok(b2);
    assert.equal(b2.type, "emoji");
    assert.equal(b2.content, "🔥");
  });

  it("falls back gracefully for unknown badges", () => {
    const fallback = resolveUserBadge("random_badge");
    assert.ok(fallback);
    assert.equal(fallback.type, "emoji");
    assert.equal(fallback.content, "🎖️");
  });

  it("returns null when no badge is provided", () => {
    assert.equal(resolveUserBadge(null), null);
    assert.equal(resolveUserBadge(undefined), null);
    assert.equal(resolveUserBadge(""), null);
  });
});
