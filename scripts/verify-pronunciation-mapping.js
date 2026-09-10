// Self-contained assert helper (avoids CommonJS require() to satisfy ESLint)
const assert = {
  strictEqual(actual, expected, message) {
    if (actual !== expected) {
      throw new Error(
        `${message || "Assertion failed"}\nExpected: ${JSON.stringify(expected)}\nActual:   ${JSON.stringify(actual)}`
      );
    }
  },
};

const WORD_TOKEN_REGEX =
  /[\p{L}\p{N}]+(?:['’‘ʼ\-][\p{L}\p{N}]+)*['’‘ʼ]?|[^\s\p{L}\p{N}]/gu;
const IS_WORD_REGEX = /[\p{L}\p{N}]/u;

function normalizeWordForMatching(word) {
  if (!word) return "";
  return word
    .toLowerCase()
    .replace(/[’‘ʼ]/g, "'")
    .replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");
}

function tokenizeSentence(text) {
  return text.match(WORD_TOKEN_REGEX) || [text];
}

function mapSentenceAssessment(targetText, wordsAssessment) {
  const tokens = tokenizeSentence(targetText);
  let wordIndex = 0;
  const wordResults = [];

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    const isWord = IS_WORD_REGEX.test(token);
    if (!isWord) {
      continue;
    }

    const currentIdx = wordIndex;
    wordIndex++;

    if (
      wordsAssessment &&
      Array.isArray(wordsAssessment) &&
      currentIdx < wordsAssessment.length
    ) {
      const item = wordsAssessment[currentIdx];
      const cleanTokenNorm = normalizeWordForMatching(token);
      const cleanItemNorm = normalizeWordForMatching(item.word || "");

      const isTokenMismatch = cleanTokenNorm !== cleanItemNorm;
      const isOmitted =
        !isTokenMismatch &&
        (item.errorType === "Omission" || item.errorType === "Unspoken");
      const isUnassessed =
        isTokenMismatch || (!isOmitted && !Number.isFinite(item.accuracyScore));
      const isCorrect =
        !isTokenMismatch &&
        !isOmitted &&
        !isUnassessed &&
        (item.accuracyScore ?? 0) >= 80 &&
        item.errorType === "None" &&
        item.isCorrect === true;
      const needsImprovement =
        !isTokenMismatch && !isOmitted && !isUnassessed && !isCorrect;

      wordResults.push({
        token,
        currentIdx,
        assessmentItem: item,
        cleanTokenNorm,
        cleanItemNorm,
        isTokenMismatch,
        isOmitted,
        isUnassessed,
        isCorrect,
        needsImprovement,
      });
    } else {
      wordResults.push({
        token,
        currentIdx,
        assessmentItem: null,
        isTokenMismatch: false,
        isOmitted: false,
        isUnassessed: true,
        isCorrect: false,
        needsImprovement: false,
      });
    }
  }

  return { tokens, wordResults };
}

function checkAllPerfect(submission, wordsList) {
  const isNoSpeech =
    submission?.lastErrorCode === "NO_SPEECH" ||
    submission?.aiFeedback?.isSilentOrNoSpeech === true;

  return (
    submission?.status === "COMPLETED" &&
    !isNoSpeech &&
    !submission?.aiFeedback?.isSilentOrNoSpeech &&
    Array.isArray(wordsList) &&
    wordsList.length > 0 &&
    wordsList.every(
      (w) =>
        Number.isFinite(w.accuracyScore) &&
        (w.accuracyScore ?? 0) >= 80 &&
        w.errorType === "None" &&
        w.isCorrect === true,
    )
  );
}

console.log("=== RUNNING REGRESSION SUITE: Pronunciation Word-Mapping ===");

// -------------------------------------------------------------
// Case A: Curly apostrophe
// Input: "The library opens at eight o’clock and closes at six."
// Expected: "o’clock" is one token, following words keep correct indexes
// -------------------------------------------------------------
{
  const textA =
    "The library opens at eight o’clock and closes at six in the evening.";
  const backendWordsA = [
    { word: "The", accuracyScore: 95, errorType: "None", isCorrect: true },
    { word: "library", accuracyScore: 92, errorType: "None", isCorrect: true },
    { word: "opens", accuracyScore: 88, errorType: "None", isCorrect: true },
    { word: "at", accuracyScore: 90, errorType: "None", isCorrect: true },
    { word: "eight", accuracyScore: 85, errorType: "None", isCorrect: true },
    { word: "o’clock", accuracyScore: 89, errorType: "None", isCorrect: true },
    { word: "and", accuracyScore: 94, errorType: "None", isCorrect: true },
    {
      word: "closes",
      accuracyScore: 75,
      errorType: "Mispronunciation",
      isCorrect: false,
    },
    { word: "at", accuracyScore: 91, errorType: "None", isCorrect: true },
    { word: "six", accuracyScore: 87, errorType: "None", isCorrect: true },
    { word: "in", accuracyScore: 90, errorType: "None", isCorrect: true },
    { word: "the", accuracyScore: 93, errorType: "None", isCorrect: true },
    { word: "evening.", accuracyScore: 86, errorType: "None", isCorrect: true },
  ];

  const { wordResults } = mapSentenceAssessment(textA, backendWordsA);

  assert.strictEqual(
    wordResults.length,
    13,
    "Case A: Must have exactly 13 word tokens",
  );
  assert.strictEqual(
    wordResults[5].token,
    "o’clock",
    "Case A: Index 5 must be 'o’clock' as one single token",
  );
  assert.strictEqual(
    wordResults[5].isCorrect,
    true,
    "Case A: 'o’clock' must be assessed as isCorrect: true",
  );
  assert.strictEqual(
    wordResults[5].isUnassessed,
    false,
    "Case A: 'o’clock' must NOT be Unassessed",
  );

  assert.strictEqual(
    wordResults[7].token,
    "closes",
    "Case A: Index 7 must be 'closes'",
  );
  assert.strictEqual(
    wordResults[7].needsImprovement,
    true,
    "Case A: 'closes' (score 75) must be needsImprovement",
  );
  assert.strictEqual(
    wordResults[7].isUnassessed,
    false,
    "Case A: 'closes' must NOT be unassessed",
  );

  assert.strictEqual(
    wordResults[12].token,
    "evening",
    "Case A: Index 12 must be 'evening'",
  );
  assert.strictEqual(
    wordResults[12].isCorrect,
    true,
    "Case A: 'evening' must be correctly assessed",
  );
  assert.strictEqual(
    wordResults[12].isUnassessed,
    false,
    "Case A: 'evening' must NOT be unassessed",
  );

  const falseUnassessed = wordResults.filter((w) => w.isUnassessed);
  assert.strictEqual(
    falseUnassessed.length,
    0,
    "Case A: There must be ZERO false unassessed words",
  );
  console.log(
    "✓ Case A passed: Curly apostrophe 'o’clock' is 1 token and all subsequent words keep correct indexes.",
  );
}

// -------------------------------------------------------------
// Case B: Straight apostrophe
// Input: "She doesn't work on Sunday."
// Expected: "doesn't" is one token
// -------------------------------------------------------------
{
  const textB = "She doesn't work on Sunday.";
  const backendWordsB = [
    { word: "She", accuracyScore: 95, errorType: "None", isCorrect: true },
    { word: "doesn't", accuracyScore: 85, errorType: "None", isCorrect: true },
    { word: "work", accuracyScore: 90, errorType: "None", isCorrect: true },
    { word: "on", accuracyScore: 92, errorType: "None", isCorrect: true },
    { word: "Sunday", accuracyScore: 95, errorType: "None", isCorrect: true },
  ];

  const { wordResults } = mapSentenceAssessment(textB, backendWordsB);
  assert.strictEqual(
    wordResults[1].token,
    "doesn't",
    "Case B: 'doesn't' must be one token",
  );
  assert.strictEqual(
    wordResults[1].isCorrect,
    true,
    "Case B: 'doesn't' must match backend",
  );
  assert.strictEqual(wordResults.length, 5, "Case B: Must have 5 words");
  console.log(
    "✓ Case B passed: Straight apostrophe 'doesn't' is 1 token and matches assessment.",
  );
}

// -------------------------------------------------------------
// Case C: Repeated words
// Input: "They read the book and read the article."
// Expected: repeated "read" tokens map independently
// -------------------------------------------------------------
{
  const textC = "They read the book and read the article.";
  const backendWordsC = [
    { word: "They", accuracyScore: 95, errorType: "None", isCorrect: true },
    { word: "read", accuracyScore: 90, errorType: "None", isCorrect: true },
    { word: "the", accuracyScore: 92, errorType: "None", isCorrect: true },
    { word: "book", accuracyScore: 88, errorType: "None", isCorrect: true },
    { word: "and", accuracyScore: 94, errorType: "None", isCorrect: true },
    {
      word: "read",
      accuracyScore: 65,
      errorType: "Mispronunciation",
      isCorrect: false,
    },
    { word: "the", accuracyScore: 90, errorType: "None", isCorrect: true },
    { word: "article", accuracyScore: 85, errorType: "None", isCorrect: true },
  ];

  const { wordResults } = mapSentenceAssessment(textC, backendWordsC);
  assert.strictEqual(wordResults[1].token, "read");
  assert.strictEqual(
    wordResults[1].isCorrect,
    true,
    "Case C: First 'read' is correct (90)",
  );

  assert.strictEqual(wordResults[5].token, "read");
  assert.strictEqual(
    wordResults[5].needsImprovement,
    true,
    "Case C: Second 'read' needs improvement (65)",
  );
  assert.strictEqual(wordResults[5].isCorrect, false);
  console.log(
    "✓ Case C passed: Repeated words 'read' map independently by index.",
  );
}

// -------------------------------------------------------------
// Case D: Token mismatch
// Only the mismatched token becomes Unassessed; later tokens remain correctly aligned
// -------------------------------------------------------------
{
  const textD = "I have a cat and a dog.";
  const backendWordsD = [
    { word: "I", accuracyScore: 95, errorType: "None", isCorrect: true },
    { word: "have", accuracyScore: 90, errorType: "None", isCorrect: true },
    { word: "a", accuracyScore: 90, errorType: "None", isCorrect: true },
    { word: "bird", accuracyScore: 80, errorType: "None", isCorrect: true },
    { word: "and", accuracyScore: 90, errorType: "None", isCorrect: true },
    { word: "a", accuracyScore: 90, errorType: "None", isCorrect: true },
    { word: "dog", accuracyScore: 90, errorType: "None", isCorrect: true },
  ];

  const { wordResults } = mapSentenceAssessment(textD, backendWordsD);
  assert.strictEqual(wordResults[3].token, "cat");
  assert.strictEqual(wordResults[3].isTokenMismatch, true);
  assert.strictEqual(
    wordResults[3].isUnassessed,
    true,
    "Case D: Mismatched word 'cat' vs 'bird' is Unassessed",
  );

  assert.strictEqual(wordResults[4].token, "and");
  assert.strictEqual(wordResults[4].isTokenMismatch, false);
  assert.strictEqual(
    wordResults[4].isCorrect,
    true,
    "Case D: Word after mismatch ('and') remains aligned and correct",
  );
  console.log(
    "✓ Case D passed: Token mismatch marks only that token Unassessed without cascading.",
  );
}

// -------------------------------------------------------------
// Case E: Missing score
// accuracyScore null/undefined/NaN becomes Unassessed
// -------------------------------------------------------------
{
  const textE = "Banana";
  const { wordResults: resE1 } = mapSentenceAssessment(textE, [
    {
      word: "Banana",
      accuracyScore: null,
      errorType: "None",
      isCorrect: false,
    },
  ]);
  assert.strictEqual(
    resE1[0].isUnassessed,
    true,
    "Case E: null accuracyScore -> isUnassessed = true",
  );

  const { wordResults: resE2 } = mapSentenceAssessment(textE, [
    {
      word: "Banana",
      accuracyScore: undefined,
      errorType: "None",
      isCorrect: false,
    },
  ]);
  assert.strictEqual(
    resE2[0].isUnassessed,
    true,
    "Case E: undefined accuracyScore -> isUnassessed = true",
  );

  const { wordResults: resE3 } = mapSentenceAssessment(textE, [
    { word: "Banana", accuracyScore: NaN, errorType: "None", isCorrect: false },
  ]);
  assert.strictEqual(
    resE3[0].isUnassessed,
    true,
    "Case E: NaN accuracyScore -> isUnassessed = true",
  );
  console.log("✓ Case E passed: Missing/non-finite score becomes Unassessed.");
}

// -------------------------------------------------------------
// Case F: Unspoken
// errorType Unspoken becomes Omitted, not Unassessed
// -------------------------------------------------------------
{
  const textF = "Watermelon";
  const { wordResults: resF } = mapSentenceAssessment(textF, [
    {
      word: "Watermelon",
      accuracyScore: 0,
      errorType: "Unspoken",
      isCorrect: false,
    },
  ]);
  assert.strictEqual(
    resF[0].isOmitted,
    true,
    "Case F: errorType 'Unspoken' must be isOmitted = true",
  );
  assert.strictEqual(
    resF[0].isUnassessed,
    false,
    "Case F: errorType 'Unspoken' must NOT be isUnassessed",
  );
  console.log(
    "✓ Case F passed: errorType 'Unspoken' is mapped to Omitted (not Unassessed).",
  );
}

// -------------------------------------------------------------
// Case G: Pedagogical threshold
// accuracyScore 70, errorType None, isCorrect true becomes Needs improvement in UI
// -------------------------------------------------------------
{
  const textG = "Pineapple";
  const { wordResults: resG } = mapSentenceAssessment(textG, [
    {
      word: "Pineapple",
      accuracyScore: 70,
      errorType: "None",
      isCorrect: true,
    },
  ]);
  assert.strictEqual(
    resG[0].isCorrect,
    false,
    "Case G: Score 70 must not be pedagogically correct (< 80)",
  );
  assert.strictEqual(
    resG[0].needsImprovement,
    true,
    "Case G: Score 70 must be needsImprovement",
  );
  console.log(
    "✓ Case G passed: Score 70 with errorType None is classified as Needs improvement in UI.",
  );
}

// -------------------------------------------------------------
// Case H: Perfect banner
// Only appears when every word has finite score >= 80, errorType None, and isCorrect true
// -------------------------------------------------------------
{
  const allGood = [
    { word: "Good", accuracyScore: 85, errorType: "None", isCorrect: true },
    { word: "Job", accuracyScore: 92, errorType: "None", isCorrect: true },
  ];
  assert.strictEqual(
    checkAllPerfect(
      { status: "COMPLETED", aiFeedback: { words: allGood } },
      allGood,
    ),
    true,
    "Case H: Perfect banner should show when all words >= 80 and isCorrect: true",
  );

  const oneHas75 = [
    { word: "Good", accuracyScore: 85, errorType: "None", isCorrect: true },
    { word: "Job", accuracyScore: 75, errorType: "None", isCorrect: true },
  ];
  assert.strictEqual(
    checkAllPerfect(
      { status: "COMPLETED", aiFeedback: { words: oneHas75 } },
      oneHas75,
    ),
    false,
    "Case H: Perfect banner must NOT show when a word has score 75",
  );

  const oneIncorrect = [
    { word: "Good", accuracyScore: 90, errorType: "None", isCorrect: false },
    { word: "Job", accuracyScore: 95, errorType: "None", isCorrect: true },
  ];
  assert.strictEqual(
    checkAllPerfect(
      { status: "COMPLETED", aiFeedback: { words: oneIncorrect } },
      oneIncorrect,
    ),
    false,
    "Case H: Perfect banner must NOT show when a word has isCorrect: false",
  );
  console.log(
    "✓ Case H passed: 100% Perfect banner only appears when all words satisfy >= 80 and isCorrect: true.",
  );
}

console.log("\n=== ALL 8 REGRESSION CASES (A - H) PASSED SUCCESSFULLY ===");
