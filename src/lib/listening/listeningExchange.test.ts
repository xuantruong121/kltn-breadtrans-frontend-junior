import test from "node:test";
import assert from "node:assert/strict";
import {
  comprehensionSpokenContent,
  exchangeTurnsOf,
  listeningExchangeText,
  parseListeningExchange,
} from "./listeningExchange.ts";

test("a line starting with a speaker label marks a turn", () => {
  assert.deepEqual(parseListeningExchange("A: Is this seat free?\nB: Yes, go ahead."), [
    { speaker: "A", text: "Is this seat free?" },
    { speaker: "B", text: "Yes, go ahead." },
  ]);
});

test("labels are case-insensitive; Nam and Nữ store as Man and Woman with their voice", () => {
  assert.deepEqual(
    parseListeningExchange("man: Where is the lift?\r\nNỮ : On your left.\nNam:Thanks."),
    [
      { speaker: "Man", text: "Where is the lift?", voiceKey: "male-01" },
      { speaker: "Woman", text: "On your left.", voiceKey: "female-01" },
      { speaker: "Man", text: "Thanks.", voiceKey: "male-01" },
    ],
  );
  assert.deepEqual(
    parseListeningExchange("WOMAN: Ready?\nb: Almost."),
    [
      { speaker: "Woman", text: "Ready?", voiceKey: "female-01" },
      { speaker: "B", text: "Almost." },
    ],
  );
  // "Nữ" typed as decomposed characters still matches.
  assert.equal(parseListeningExchange("A: Hi.\nNữ: Hello.")?.[1].speaker, "Woman");
});

test("anything else stays a single sentence", () => {
  assert.equal(parseListeningExchange("The next bus leaves in fifteen minutes."), null);
  // One turn, or turns of one speaker, are not an exchange.
  assert.equal(parseListeningExchange("A: Hello."), null);
  assert.equal(parseListeningExchange("A: Hello.\nA: Anyone here?"), null);
  // Text before the first label, or both turns on one line.
  assert.equal(parseListeningExchange("Listen.\nA: Hi.\nB: Hello."), null);
  assert.equal(parseListeningExchange("A: Hi. B: Hello."), null);
  // Not a known label.
  assert.equal(parseListeningExchange("Customer: Hi.\nAgent: Hello."), null);
  assert.equal(parseListeningExchange(""), null);
});

test("a line without a label continues the turn above; blank lines and empty turns drop", () => {
  assert.deepEqual(
    parseListeningExchange("A: Excuse me,\n  is this seat free?\n\nB:\nB: Yes.\n"),
    [
      { speaker: "A", text: "Excuse me, is this seat free?" },
      { speaker: "B", text: "Yes." },
    ],
  );
});

test("an exchange saves its turns and the joined text; a sentence saves as before", () => {
  assert.deepEqual(comprehensionSpokenContent("A: Is this seat free?\nB: Yes, go ahead."), {
    audioText: "Is this seat free? Yes, go ahead.",
    transcriptSegments: [
      { speaker: "A", text: "Is this seat free?" },
      { speaker: "B", text: "Yes, go ahead." },
    ],
  });
  assert.deepEqual(comprehensionSpokenContent("  The bank opens at eight.  "), {
    audioText: "The bank opens at eight.",
  });
  // A dialogue's own turns are never cleared by a sentence.
  assert.deepEqual(
    comprehensionSpokenContent("Hello.", [
      { speaker: "Customer", text: "Hello." },
      { speaker: "Agent", text: "Hi." },
    ]),
    { audioText: "Hello." },
  );
});

test("an exchange edited back into one sentence clears its turns", () => {
  const stored = [
    { speaker: "A", text: "Is this seat free?" },
    { speaker: "B", text: "Yes, go ahead." },
  ];
  assert.deepEqual(comprehensionSpokenContent("The seat is free.", stored), {
    audioText: "The seat is free.",
    transcriptSegments: [],
  });
});

test("editing loads the turns back into the field with their labels", () => {
  const saved = comprehensionSpokenContent("Man: Where is the lift?\nWoman: On your left.");
  assert.equal(
    listeningExchangeText(saved.transcriptSegments),
    "Man: Where is the lift?\nWoman: On your left.",
  );
  // A single sentence, or turns the field cannot write, load as audioText.
  assert.equal(listeningExchangeText(undefined), null);
  assert.equal(listeningExchangeText([{ speaker: "A", text: "Hi." }]), null);
  assert.equal(
    listeningExchangeText([
      { speaker: "Customer", text: "Hello." },
      { speaker: "Agent", text: "Hi." },
    ]),
    null,
  );
});

test("a learner sees the stored turns of an exchange only", () => {
  assert.deepEqual(
    exchangeTurnsOf([
      { speaker: "A", text: " Is this seat free? ", translation: "Ghế này trống không?" },
      { speaker: "B", text: "Yes." },
      { speaker: "B", text: "  " },
    ]),
    [
      { speaker: "A", text: "Is this seat free?", translation: "Ghế này trống không?" },
      { speaker: "B", text: "Yes." },
    ],
  );
  assert.deepEqual(exchangeTurnsOf([{ speaker: "A", text: "Hi." }]), []);
  assert.deepEqual(exchangeTurnsOf("A: Hi."), []);
  assert.deepEqual(exchangeTurnsOf(null), []);
});
