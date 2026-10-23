import test from "node:test";
import assert from "node:assert/strict";
import { legacyAssessmentTreatment } from "./legacyRouteLogic.ts";

test("Legacy route: an Assessment mapped to an Exam redirects to canonical Studio", () => {
  assert.equal(
    legacyAssessmentTreatment({ examId: 22 }),
    "REDIRECT_TO_STUDIO",
  );
});

test("Legacy route: an Assessment with no Exam mapping stays editable (fallback)", () => {
  assert.equal(legacyAssessmentTreatment({ examId: null }), "EDITABLE");
  assert.equal(legacyAssessmentTreatment(null), "EDITABLE");
});
