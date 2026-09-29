import test from "node:test";
import assert from "node:assert/strict";

/**
 * Deterministic test verifying PracticeCard state machine logic and pedagogical extraction
 */
function extractPedagogicalCues(text?: string) {
  if (!text) {
    return { phonemes: ["/ə/", "/t/", "/s/"], keywords: [] };
  }

  const phonemeRules = [
    { regex: /\b(th\w*|\w*th\b|\w*th\w*)/i, symbol: "/θ/ - /ð/" },
    { regex: /\b(sh\w*|\w*tion|\w*sion|ch\w*)/i, symbol: "/ʃ/ - /tʃ/" },
    { regex: /\b(\w*ed|\w*ing|\w*est)/i, symbol: "/ɪd/ - /ɪŋ/" },
    { regex: /\b(\w*r\w*|wr\w*)/i, symbol: "/r/ & Linking" },
    { regex: /\b(v\w*|\w*ve\b|f\w*)/i, symbol: "/v/ - /f/" },
    { regex: /\b(z\w*|\w*s\b|\w*es\b)/i, symbol: "/s/ - /z/" },
  ];

  const phonemes: string[] = [];
  for (const rule of phonemeRules) {
    if (rule.regex.test(text)) {
      phonemes.push(rule.symbol);
      if (phonemes.length >= 2) break;
    }
  }
  if (phonemes.length === 0) phonemes.push("/ə/", "/s/");

  const stopWords = new Set([
    "about", "after", "again", "because", "could", "every", "first", "great", "might", "other",
    "should", "their", "there", "these", "which", "would", "where", "while", "please", "thank"
  ]);
  const words = text
    .replace(/[^\w\s]/g, "")
    .split(/\s+/)
    .map((w) => w.toLowerCase())
    .filter((w) => w.length >= 5 && !stopWords.has(w));

  const keywords = Array.from(new Set(words)).slice(0, 3);
  return { phonemes, keywords };
}

function computePracticeCardStatus(params: {
  isAuthenticated: boolean;
  isCompleted?: boolean;
  practiceSet?: {
    exerciseCount: number;
    completedCount: number;
    isCompleted: boolean;
  };
  isSpotlight?: boolean;
}): "COMPLETED" | "IN_PROGRESS" | "NOT_STARTED" | "LOCKED" {
  const { isAuthenticated, isCompleted, practiceSet, isSpotlight } = params;
  if (!isAuthenticated) return "LOCKED";
  
  const completed = Boolean(
    isCompleted ||
    (practiceSet && practiceSet.isCompleted) ||
    (practiceSet && practiceSet.exerciseCount > 0 && practiceSet.completedCount >= practiceSet.exerciseCount)
  );

  if (completed) return "COMPLETED";

  const inProgress = Boolean(
    practiceSet &&
    practiceSet.completedCount > 0 &&
    practiceSet.completedCount < practiceSet.exerciseCount
  );

  if (inProgress || isSpotlight) return "IN_PROGRESS";

  return "NOT_STARTED";
}

test("PracticeCard State Machine: accurately detects COMPLETED state", () => {
  const status = computePracticeCardStatus({
    isAuthenticated: true,
    practiceSet: { exerciseCount: 4, completedCount: 4, isCompleted: true },
  });
  assert.equal(status, "COMPLETED");
});

test("PracticeCard State Machine: accurately detects IN_PROGRESS spotlight state", () => {
  const status = computePracticeCardStatus({
    isAuthenticated: true,
    practiceSet: { exerciseCount: 4, completedCount: 2, isCompleted: false },
  });
  assert.equal(status, "IN_PROGRESS");
});

test("PracticeCard State Machine: accurately detects NOT_STARTED state", () => {
  const status = computePracticeCardStatus({
    isAuthenticated: true,
    practiceSet: { exerciseCount: 4, completedCount: 0, isCompleted: false },
  });
  assert.equal(status, "NOT_STARTED");
});

test("PracticeCard State Machine: accurately detects LOCKED state for unauthenticated guests", () => {
  const status = computePracticeCardStatus({
    isAuthenticated: false,
    practiceSet: { exerciseCount: 4, completedCount: 0, isCompleted: false },
  });
  assert.equal(status, "LOCKED");
});

test("Pedagogical Cues: extracts phonemes and keywords from sample target sentence", () => {
  const sample = "The financial director confirmed the schedule for the presentation.";
  const cues = extractPedagogicalCues(sample);

  assert.ok(cues.phonemes.length >= 1);
  assert.ok(cues.phonemes.includes("/θ/ - /ð/") || cues.phonemes.includes("/ʃ/ - /tʃ/"));
  assert.ok(cues.keywords.includes("financial") || cues.keywords.includes("schedule") || cues.keywords.includes("presentation"));
});
