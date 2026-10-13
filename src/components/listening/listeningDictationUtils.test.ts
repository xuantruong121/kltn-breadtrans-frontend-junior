import assert from "node:assert/strict";
import test from "node:test";
import {
  buildProgressiveAnswer,
  canonicalizeSubmittedDictation,
  clampTranscriptIndex,
  diffDictationAnswer,
  getLexicalLetterCount,
  maskExpectedWord,
  moveTranscriptIndex,
  normalizeDictationText,
  calculateProgressiveDictationFeedback,
  resolveActiveTranscriptIndex,
  resolveTranscriptPlaybackState,
} from "./listeningDictationUtils.ts";

test("normalizes whitespace and curly apostrophes", () => {
  assert.equal(normalizeDictationText("  Don’t   worry! "), "don't worry!");
});

test("canonicalizeSubmittedDictation normalizes case, restores punctuation, preserves wrong word, and is idempotent", () => {
  const target = "Hey, Liam. Are we still watching movie?";

  // Step 1: first word
  assert.equal(canonicalizeSubmittedDictation(target, "hey"), "Hey,");

  // Step 2: two words
  assert.equal(canonicalizeSubmittedDictation(target, "hey liam"), "Hey, Liam.");

  // Step 3: several words with wrong trailing word preserved
  assert.equal(
    canonicalizeSubmittedDictation(target, "hey liam are we still watch"),
    "Hey, Liam. Are we still watch",
  );

  // Step 4: full correct with punctuation restored
  assert.equal(
    canonicalizeSubmittedDictation(
      target,
      "hey liam are we still watching movie",
    ),
    "Hey, Liam. Are we still watching movie?",
  );

  // Case conventions: converts uppercase to canonical casing
  assert.equal(
    canonicalizeSubmittedDictation(target, "HEY LIAM are WE"),
    "Hey, Liam. Are we",
  );

  // Idempotent: repeated check does not duplicate punctuation
  assert.equal(
    canonicalizeSubmittedDictation(target, "Hey, Liam."),
    "Hey, Liam.",
  );

  // Contraction apostrophe restoration
  assert.equal(
    canonicalizeSubmittedDictation("I'm ready.", "im ready"),
    "I'm ready.",
  );

  // Real grammar / vocabulary errors NOT auto-corrected
  assert.equal(
    canonicalizeSubmittedDictation(
      "She drinks coffee every morning.",
      "she drink coffee",
    ),
    "She drink coffee",
  );
  assert.equal(
    canonicalizeSubmittedDictation(
      "I go to school by bus.",
      "i go school by bus",
    ),
    "I go school by bus",
  );

  assert.equal(canonicalizeSubmittedDictation(target, ""), "");
  assert.equal(canonicalizeSubmittedDictation(null, "hey"), "hey");
});

test("returns useful missing and extra word feedback", () => {
  assert.deepEqual(
    diffDictationAnswer(
      "The price per pint has tripled",
      "The price for pint has triple",
    ),
    [
      { kind: "same", text: "the" },
      { kind: "same", text: "price" },
      { kind: "extra", text: "for" },
      { kind: "missing", text: "per" },
      { kind: "same", text: "pint" },
      { kind: "same", text: "has" },
      { kind: "extra", text: "triple" },
      { kind: "missing", text: "tripled" },
    ],
  );
});

test("STANDARD word diff ignores punctuation and capitalization", () => {
  assert.deepEqual(
    diffDictationAnswer(
      "Well, let me think. It's about ten minutes.",
      "well let me think its about ten minutes",
    ),
    [
      { kind: "same", text: "well" },
      { kind: "same", text: "let" },
      { kind: "same", text: "me" },
      { kind: "same", text: "think" },
      { kind: "same", text: "it" },
      { kind: "same", text: "is" },
      { kind: "same", text: "about" },
      { kind: "same", text: "ten" },
      { kind: "same", text: "minutes" },
    ],
  );

  const changedWordDiff = diffDictationAnswer(
    "Well, let me think. It's about ten minutes.",
    "well let me think its about twenty minutes",
  );
  assert.ok(
    changedWordDiff.some(
      (token) => token.kind === "missing" || token.kind === "extra",
    ),
  );
});

test("STANDARD word diff treats canonical contractions and full forms as equivalent", () => {
  assert.deepEqual(diffDictationAnswer("We're going.", "we are going"), [
    { kind: "same", text: "we" },
    { kind: "same", text: "are" },
    { kind: "same", text: "going" },
  ]);
  assert.notDeepEqual(
    diffDictationAnswer("We'd like help.", "we had like help"),
    [
      { kind: "same", text: "we" },
      { kind: "same", text: "would" },
      { kind: "same", text: "like" },
      { kind: "same", text: "help" },
    ],
  );
  assert.ok(
    diffDictationAnswer("We’re ready.", "were ready").some(
      (token) => token.kind !== "same",
    ),
  );
});

test("handles null or undefined input safely without throwing", () => {
  assert.equal(normalizeDictationText(undefined), "");
  assert.equal(normalizeDictationText(null), "");
  assert.deepEqual(diffDictationAnswer(undefined, undefined), []);
  assert.deepEqual(diffDictationAnswer("Hello world", undefined), [
    { kind: "missing", text: "hello" },
    { kind: "missing", text: "world" },
  ]);
});

test("maskExpectedWord and getLexicalLetterCount count only letters and preserve punctuation", () => {
  assert.equal(getLexicalLetterCount("a"), 1);
  assert.equal(maskExpectedWord("a"), "*");

  assert.equal(getLexicalLetterCount("to"), 2);
  assert.equal(maskExpectedWord("to"), "**");

  assert.equal(getLexicalLetterCount("Are"), 3);
  assert.equal(maskExpectedWord("Are"), "***");

  assert.equal(getLexicalLetterCount("works"), 5);
  assert.equal(maskExpectedWord("works"), "*****");

  assert.equal(getLexicalLetterCount("drinks"), 6);
  assert.equal(maskExpectedWord("drinks"), "******");

  assert.equal(getLexicalLetterCount("meeting"), 7);
  assert.equal(maskExpectedWord("meeting"), "*******");

  assert.equal(getLexicalLetterCount("transportation"), 14);
  assert.equal(maskExpectedWord("transportation"), "**************");

  // Punctuation preserved after asterisks
  assert.equal(getLexicalLetterCount("Liam,"), 4);
  assert.equal(maskExpectedWord("Liam,"), "****,");

  assert.equal(getLexicalLetterCount("ready?"), 5);
  assert.equal(maskExpectedWord("ready?"), "*****?");

  assert.equal(getLexicalLetterCount("meeting."), 7);
  assert.equal(maskExpectedWord("meeting."), "*******.");

  // Contractions & hyphens count letters only
  assert.equal(getLexicalLetterCount("don't"), 4);
  assert.equal(maskExpectedWord("don't"), "****");

  assert.equal(getLexicalLetterCount("part-time"), 8);
  assert.equal(maskExpectedWord("part-time"), "********");
});

test("buildProgressiveAnswer shows canonical verified prefix + exactly one next word mask with letter count", () => {
  const expected = "The museum is across the street from the train station";
  const submitted = "The museum is accross the street";

  const result = buildProgressiveAnswer(expected, submitted);

  // Exactly verified prefix + single next mask
  assert.equal(result.length, 4);
  assert.deepEqual(result[0], { text: "The", state: "correct" });
  assert.deepEqual(result[1], { text: "museum", state: "correct" });
  assert.deepEqual(result[2], { text: "is", state: "correct" });
  // across = 6 letters
  assert.deepEqual(result[3], { text: "******", state: "masked" });

  // Critical negative assertions
  const serialized = JSON.stringify(result);
  assert.ok(!serialized.includes('"text":"across"'), "Target word across must NOT be revealed in feedback");
  assert.ok(!serialized.includes("street"), "Downstream words must NOT be revealed");
  assert.ok(!serialized.includes("station"), "Downstream target tail must NOT be revealed");
  assert.equal(result.filter((r) => r.state === "masked").length, 1, "Must have exactly 1 mask");
});

test("Controlled Case 1: short prefix shows canonical prefix and single mask with exact letter count", () => {
  const target = "Hey, Liam. Are we still meeting at the library on Saturday morning?";
  const submitted = "hey liam";

  const feedback = calculateProgressiveDictationFeedback(target, submitted);
  assert.equal(feedback.isCorrect, false);
  assert.equal(feedback.verifiedPrefix, "Hey, Liam.");
  assert.equal(feedback.nextWordMask, "***"); // Are = 3 letters
  assert.ok(feedback.hint?.includes("trợ động từ") || feedback.hint?.includes("Liam"));

  const tokens = buildProgressiveAnswer(target, submitted);
  assert.equal(tokens.length, 3);
  assert.deepEqual(tokens[0], { text: "Hey,", state: "correct" });
  assert.deepEqual(tokens[1], { text: "Liam.", state: "correct" });
  assert.deepEqual(tokens[2], { text: "***", state: "masked" });
  assert.equal(tokens.filter((t) => t.state === "masked").length, 1);
});

test("Controlled Case 2: later error shows canonical verified prefix and mask for next word", () => {
  const target = "Hey, Liam. Are we still meeting at the library on Saturday morning?";
  const submitted = "hey liam are we still meet";

  const feedback = calculateProgressiveDictationFeedback(target, submitted);
  assert.equal(feedback.isCorrect, false);
  assert.equal(feedback.verifiedPrefix, "Hey, Liam. Are we still");
  assert.equal(feedback.nextWordMask, "*******"); // meeting = 7 letters
  assert.ok(feedback.hint?.includes("dạng động từ"));

  const tokens = buildProgressiveAnswer(target, submitted);
  assert.equal(tokens[tokens.length - 1].text, "*******");
  assert.equal(tokens.filter((t) => t.state === "masked").length, 1);
  assert.ok(!JSON.stringify(tokens).includes("library"));
});

test("Controlled Case 3: missing word stops at missing position with letter count mask", () => {
  const target = "I go to school by bus.";
  const submitted = "i go school by bus";

  const feedback = calculateProgressiveDictationFeedback(target, submitted);
  assert.equal(feedback.isCorrect, false);
  assert.equal(feedback.verifiedPrefix, "I go");
  assert.equal(feedback.nextWordMask, "**"); // to = 2 letters
  assert.ok(feedback.hint?.includes("từ nối") || feedback.hint?.includes("giới từ"));

  const tokens = buildProgressiveAnswer(target, submitted);
  assert.deepEqual(tokens, [
    { text: "I", state: "correct" },
    { text: "go", state: "correct" },
    { text: "**", state: "masked" },
  ]);
});

test("Controlled Case 4: morphological error stops at wrong word with letter count mask", () => {
  const target = "She drinks coffee every morning.";
  const submitted = "she drink coffee every morning";

  const feedback = calculateProgressiveDictationFeedback(target, submitted);
  assert.equal(feedback.isCorrect, false);
  assert.equal(feedback.verifiedPrefix, "She");
  assert.equal(feedback.nextWordMask, "******"); // drinks = 6 letters
  assert.ok(feedback.hint?.includes("chủ ngữ “She”") || feedback.hint?.includes("động từ"));

  const tokens = buildProgressiveAnswer(target, submitted);
  assert.deepEqual(tokens, [
    { text: "She", state: "correct" },
    { text: "******", state: "masked" },
  ]);
});

test("Controlled Case 5: extra word stops at expected target with hint about extra word", () => {
  const target = "I like coffee.";
  const submitted = "i really like coffee";

  const feedback = calculateProgressiveDictationFeedback(target, submitted);
  assert.equal(feedback.isCorrect, false);
  assert.equal(feedback.verifiedPrefix, "I");
  assert.equal(feedback.nextWordMask, "****"); // like = 4 letters
  assert.ok(feedback.hint?.includes("từ thừa"));

  const tokens = buildProgressiveAnswer(target, submitted);
  assert.deepEqual(tokens, [
    { text: "I", state: "correct" },
    { text: "****", state: "masked" },
  ]);
});

test("Controlled Case 6: case and punctuation ignored during comparison -> full success", () => {
  const target = "Hey, Liam. Are you ready?";
  const submitted = "hey liam are you ready";

  const feedback = calculateProgressiveDictationFeedback(target, submitted);
  assert.equal(feedback.isCorrect, true);
  assert.equal(feedback.verifiedPrefix, target);
  assert.equal(feedback.nextWordMask, "");

  const tokens = buildProgressiveAnswer(target, submitted);
  assert.equal(tokens.every((t) => t.state === "correct"), true);
  assert.equal(tokens.map((t) => t.text).join(" "), target);
});

test("Controlled Case 7: Saturday is busy comparison ignores lowercase", () => {
  const target = "Saturday is busy.";
  const submitted = "saturday is busy";

  const feedback = calculateProgressiveDictationFeedback(target, submitted);
  assert.equal(feedback.isCorrect, true);
  assert.equal(feedback.verifiedPrefix, target);
});

test("Controlled Case 8: She works here with work input remains wrong", () => {
  const target = "She works here.";
  const submitted = "she work here";

  const feedback = calculateProgressiveDictationFeedback(target, submitted);
  assert.equal(feedback.isCorrect, false);
  assert.equal(feedback.verifiedPrefix, "She");
  assert.equal(feedback.nextWordMask, "*****"); // works = 5 letters
});

test("Controlled Case 9: empty input shows exactly one mask matching first word letters", () => {
  const target = "Transportation is available.";
  const submitted = "";

  const feedback = calculateProgressiveDictationFeedback(target, submitted);
  assert.equal(feedback.isCorrect, false);
  assert.equal(feedback.verifiedPrefix, "");
  assert.equal(feedback.nextWordMask, "**************"); // Transportation = 14 letters

  const tokens = buildProgressiveAnswer(target, submitted);
  assert.deepEqual(tokens, [
    { text: "**************", state: "masked" },
  ]);
});

test("buildProgressiveAnswer reveals all words when showFullAnswer is true", () => {
  const expected = "The museum is across";
  const submitted = "The musuem";

  const result = buildProgressiveAnswer(expected, submitted, true);

  assert.deepEqual(result, [
    { text: "The", state: "answer" },
    { text: "museum", state: "answer" },
    { text: "is", state: "answer" },
    { text: "across", state: "answer" },
  ]);
});

test("buildProgressiveAnswer maps serverTokens directly without leaking target words or downstream tokens", () => {
  const serverTokens = [
    { status: "CORRECT" as const, text: "She" },
    { status: "WRONG" as const },
    { status: "CORRECT" as const, text: "coffee" },
  ];

  const result = buildProgressiveAnswer(undefined, undefined, false, false, serverTokens);
  assert.deepEqual(result, [
    { text: "She", state: "correct" },
    { text: "***", state: "masked" },
  ]);
  assert.equal(result.length, 2, "Must stop after first non-correct token");
});

test("transcript cursor moves independently and never changes the dictation cursor", () => {
  const currentDictationQuestionIndex = 6;
  let selectedTranscriptIndex = clampTranscriptIndex(14, 20);
  selectedTranscriptIndex = moveTranscriptIndex(
    selectedTranscriptIndex,
    -1,
    20,
  );

  assert.equal(selectedTranscriptIndex, 13);
  assert.equal(currentDictationQuestionIndex, 6);
  assert.equal(clampTranscriptIndex(99, 20), 19);
  assert.equal(clampTranscriptIndex(-4, 20), 0);
});

test("same speaker turn remains active during an internal bookmark gap", () => {
  const timeline = [
    { startMs: 1000, endMs: 3000, speakerTurnId: "ST1" },
    { startMs: 3250, endMs: 5000, speakerTurnId: "ST1" },
  ];
  assert.deepEqual(resolveTranscriptPlaybackState(2900, timeline), {
    activeChunkIndex: 0,
    activeSpeakerTurnId: "ST1",
  });
  assert.deepEqual(resolveTranscriptPlaybackState(3050, timeline), {
    activeChunkIndex: 0,
    activeSpeakerTurnId: "ST1",
  });
  assert.deepEqual(resolveTranscriptPlaybackState(3200, timeline), {
    activeChunkIndex: 0,
    activeSpeakerTurnId: "ST1",
  });
  assert.deepEqual(resolveTranscriptPlaybackState(3250, timeline), {
    activeChunkIndex: 1,
    activeSpeakerTurnId: "ST1",
  });
  assert.equal(resolveActiveTranscriptIndex(3050, timeline), 0);
});

test("speaker handoff switches directly without a null cursor", () => {
  const timeline = [
    { startMs: 1000, endMs: 3000, speakerTurnId: "ST1" },
    { startMs: 3250, endMs: 5000, speakerTurnId: "ST1" },
    { startMs: 5300, endMs: 7000, speakerTurnId: "ST2" },
  ];
  assert.equal(resolveTranscriptPlaybackState(5100, timeline).activeSpeakerTurnId, "ST1");
  assert.equal(resolveTranscriptPlaybackState(5200, timeline).activeSpeakerTurnId, "ST1");
  assert.equal(resolveTranscriptPlaybackState(5300, timeline).activeSpeakerTurnId, "ST2");
});

test("cursor is empty before the first chunk and holds the final chunk until media ends", () => {
  const timeline = [
    { startMs: 1000, endMs: 3000, speakerTurnId: "ST1" },
  ];
  assert.deepEqual(resolveTranscriptPlaybackState(500, timeline), {
    activeChunkIndex: -1,
    activeSpeakerTurnId: null,
  });
  assert.equal(resolveTranscriptPlaybackState(3200, timeline).activeSpeakerTurnId, "ST1");
});
