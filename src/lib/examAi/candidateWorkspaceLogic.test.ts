import test from "node:test";
import assert from "node:assert/strict";
import {
  candidateGroupState,
  matchesCandidateFilter,
  selectAllValidKeys,
  selectUnappliedKeys,
  toggleKey,
} from "./candidateWorkspaceLogic.ts";

test("Candidate Workspace: FLAGGED filter hides applied and issue-free items", () => {
  assert.equal(
    matchesCandidateFilter({ issues: ["x"], applied: false }, "FLAGGED"),
    true,
  );
  assert.equal(
    matchesCandidateFilter({ issues: ["x"], applied: true }, "FLAGGED"),
    false,
  );
  assert.equal(
    matchesCandidateFilter({ issues: [], applied: false }, "FLAGGED"),
    false,
  );
});

test("Candidate Workspace: ALL filter always matches", () => {
  assert.equal(matchesCandidateFilter({ issues: [], applied: true }, "ALL"), true);
});

test("Candidate Workspace: group state reflects applied over warning", () => {
  assert.equal(candidateGroupState({ issues: ["x"], applied: true }), "applied");
  assert.equal(candidateGroupState({ issues: ["x"], applied: false }), "warning");
  assert.equal(candidateGroupState({ issues: [], applied: false }), "ready");
});

test("Candidate Workspace: select-all-valid only includes issue-free, unapplied items", () => {
  const items = [
    { candidateKey: "A", issues: [], applied: false },
    { candidateKey: "B", issues: ["x"], applied: false },
    { candidateKey: "C", issues: [], applied: true },
  ];
  assert.deepEqual(selectAllValidKeys(items), ["A"]);
});

test("Candidate Workspace: select-Part excludes already-applied items (idempotent selection)", () => {
  const items = [
    { candidateKey: "LR:P1:G1", issues: [], applied: true },
    { candidateKey: "LR:P1:G2", issues: ["x"], applied: false },
  ];
  assert.deepEqual(selectUnappliedKeys(items), ["LR:P1:G2"]);
});

test("Candidate Workspace: toggleKey adds then removes", () => {
  let selected = new Set<string>();
  selected = toggleKey(selected, "A");
  assert.equal(selected.has("A"), true);
  selected = toggleKey(selected, "A");
  assert.equal(selected.has("A"), false);
});
