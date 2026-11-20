import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { hasLongOption, longestOption, optionGridClass } from "./optionLayout.ts";

describe("answer list layout", () => {
  it("puts short options in two columns from a narrow panel", () => {
    assert.equal(optionGridClass(["10 A.M.", "It is closed", "8 A.M.", "9 A.M."]), "grid grid-cols-1 @xs:grid-cols-2");
  });

  it("needs a wider panel for two columns of medium options", () => {
    assert.equal(
      optionGridClass(["Going to the library", "Submitting a research proposal", "A", "B"]),
      "grid grid-cols-1 @2xl:grid-cols-2",
    );
  });

  it("keeps one column when any option is longer than 45 characters", () => {
    const options = ["Short", "Having a high GPA in all of the undergraduate courses taken"];
    assert.equal(hasLongOption(options), true);
    assert.equal(optionGridClass(options), "grid grid-cols-1");
  });

  it("measures trimmed text and survives empty or missing options", () => {
    assert.equal(longestOption(["  abc  ", null, undefined, ""]), 3);
    assert.equal(optionGridClass([]), "grid grid-cols-1 @xs:grid-cols-2");
  });

  it("treats exactly 20 and 45 characters as still fitting", () => {
    assert.equal(optionGridClass(["x".repeat(20)]), "grid grid-cols-1 @xs:grid-cols-2");
    assert.equal(optionGridClass(["x".repeat(45)]), "grid grid-cols-1 @2xl:grid-cols-2");
    assert.equal(optionGridClass(["x".repeat(46)]), "grid grid-cols-1");
  });
});
