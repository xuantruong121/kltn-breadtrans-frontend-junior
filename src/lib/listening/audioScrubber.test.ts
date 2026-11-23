import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { scrubberFill, scrubberProgress, SCRUBBER_THUMB_PX } from "./audioScrubber.ts";

describe("scrubberProgress", () => {
  it("is the played share of the track", () => {
    assert.equal(scrubberProgress(0, 60), 0);
    assert.equal(scrubberProgress(15, 60), 0.25);
    assert.equal(scrubberProgress(60, 60), 1);
  });

  it("stays inside 0..1 when the time runs past either end", () => {
    assert.equal(scrubberProgress(-3, 60), 0);
    assert.equal(scrubberProgress(75, 60), 1);
  });

  it("is 0 while the duration is unknown or the time is not a number", () => {
    assert.equal(scrubberProgress(5, 0), 0);
    assert.equal(scrubberProgress(5, Number.NaN), 0);
    assert.equal(scrubberProgress(Number.NaN, 60), 0);
    assert.equal(scrubberProgress(5, Number.POSITIVE_INFINITY), 0);
  });
});

describe("scrubberFill", () => {
  it("ends at the centre of the native thumb, which travels inside the track minus its own width", () => {
    const half = SCRUBBER_THUMB_PX / 2;
    assert.equal(scrubberFill(0), `calc(0 * (100% - ${SCRUBBER_THUMB_PX}px) + ${half}px)`);
    assert.equal(scrubberFill(0.25), `calc(0.25 * (100% - ${SCRUBBER_THUMB_PX}px) + ${half}px)`);
    assert.equal(scrubberFill(1), `calc(1 * (100% - ${SCRUBBER_THUMB_PX}px) + ${half}px)`);
  });
});
