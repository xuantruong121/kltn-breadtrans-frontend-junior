import { describe, test } from "node:test";
import assert from "node:assert/strict";

import { nightBuildings, nightClouds, windowGrid } from "./cityScene.ts";

/** A small RGBA image from rows of letters: . transparent, f building. */
function image(rows: string[]) {
  const height = rows.length;
  const width = rows[0].length;
  const data = new Uint8ClampedArray(width * height * 4);
  rows.forEach((row, y) =>
    [...row].forEach((c, x) => {
      if (c === "f") data.set([116, 161, 169, 255], (y * width + x) * 4);
    }),
  );
  return { data, width, height };
}

describe("windowGrid", () => {
  test("windows sit inside solid building, never on an edge or in the sky", () => {
    // A 10 x 12 block of building with sky above and to the right.
    const rows = ["............", "............", ...Array.from({ length: 12 }, () => "ffffffffff..")];
    const img = image(rows);
    const cells = windowGrid(img.data, img.width, img.height);
    assert.ok(cells.length > 0);
    for (const c of cells) {
      assert.ok(c.x >= 1 && c.x + c.w <= 9, `inside horizontally: ${JSON.stringify(c)}`);
      assert.ok(c.y >= 4, `below the roof line: ${JSON.stringify(c)}`);
    }
  });
  test("no windows in an empty sky", () => {
    const img = image(["........", "........", "........", "........", "........", "........"]);
    assert.deepEqual(windowGrid(img.data, img.width, img.height), []);
  });
});

describe("night colours", () => {
  test("buildings turn dark blue and keep their alpha", () => {
    const img = image(["f.", "f."]);
    nightBuildings(img.data);
    assert.ok(img.data[2] > img.data[0], "blue over red");
    assert.ok(img.data[0] < 60);
    assert.equal(img.data[7], 0, "transparent stays transparent");
  });
  test("the plain sky goes clear; lighter cloud pixels stay", () => {
    const sky = new Uint8ClampedArray([182, 211, 225, 255, 203, 225, 233, 255]);
    nightClouds(sky);
    assert.equal(sky[3], 0);
    assert.ok(sky[7] > 100);
  });
});
