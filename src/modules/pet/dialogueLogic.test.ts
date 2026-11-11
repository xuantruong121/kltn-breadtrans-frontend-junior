import test from "node:test";
import assert from "node:assert/strict";
import {
  activeNudges,
  hourInVietnam,
  NUDGES_SEEN_KEY,
  parseSeen,
  pickNudge,
  recordSeen,
  STREAK_REMINDER_HOUR,
  type PetNudgeInput,
  hungerLine,
} from "./dialogueLogic.ts";

const quest = (title: string, isCompleted: boolean) => ({
  title,
  isCompleted,
  actionLabel: "Bắt đầu",
  actionUrl: `/${title}`,
});

const base: PetNudgeInput = {
  petName: "Cú Mèo Thông Thái",
  satietyState: "NORMAL",
  balance: 50,
  feedCost: 10,
  streak: 4,
  hourVN: 10,
  activitiesCount: 0,
  quests: [quest("nghe", false), quest("doc", false), quest("viet", false)],
};

test("a fed pet with nothing done has nothing to say before the evening", () => {
  assert.deepEqual(activeNudges(base), []);
});

test("a hungry pet asks to be fed and offers the feed button when the learner can pay", () => {
  const [n] = activeNudges({ ...base, satietyState: "HUNGRY" });
  assert.equal(n.key, "hungry:HUNGRY");
  assert.equal(n.header, "Cú Mèo Thông Thái · Đang đói");
  assert.deepEqual(n.action, { type: "feed", label: "Cho ăn (10 Bánh Mì)" });
});

test("a hungry pet the learner cannot pay for points to the next quest and says how much is missing", () => {
  const [n] = activeNudges({ ...base, satietyState: "VERY_HUNGRY", balance: 4, feedCost: 20 });
  assert.equal(n.key, "hungry:VERY_HUNGRY");
  assert.match(n.text, /sức khỏe/);
  assert.match(n.text, /thiếu 16 Bánh Mì/);
  assert.deepEqual(n.action, { type: "link", label: "Bắt đầu", url: "/nghe" });
});

test("the streak reminder waits for the evening and stays quiet once the learner has studied", () => {
  const evening = { ...base, hourVN: STREAK_REMINDER_HOUR };
  assert.equal(activeNudges({ ...base, hourVN: STREAK_REMINDER_HOUR - 1 }).length, 0);
  const [n] = activeNudges(evening);
  assert.equal(n.key, "streak-risk");
  assert.match(n.text, /chuỗi 4 ngày/);
  assert.equal(activeNudges({ ...evening, activitiesCount: 1 }).length, 0);
  assert.equal(activeNudges({ ...evening, streak: 0 }).length, 0);
});

test("quest progress counts quests, names the next one, and congratulates when all are done", () => {
  const [some] = activeNudges({ ...base, quests: [quest("nghe", true), quest("doc", false), quest("viet", false)] });
  assert.equal(some.key, "quests:1");
  assert.equal(some.text, "Xong 1/3 nhiệm vụ hôm nay rồi. Còn: doc.");
  const [all] = activeNudges({ ...base, quests: [quest("nghe", true), quest("doc", true)] });
  assert.equal(all.key, "quests:done");
  assert.equal(all.action, undefined);
});

test("hunger comes before the streak, the streak before quests", () => {
  const nudges = activeNudges({ ...base, satietyState: "HUNGRY", hourVN: 20 });
  assert.deepEqual(
    nudges.map((n) => n.kind),
    ["HUNGRY", "STREAK"],
  );
});

test("pickNudge skips what was already said today", () => {
  const nudges = activeNudges({ ...base, satietyState: "HUNGRY", hourVN: 20 });
  assert.equal(pickNudge(nudges, [])?.key, "hungry:HUNGRY");
  assert.equal(pickNudge(nudges, ["hungry:HUNGRY"])?.key, "streak-risk");
  assert.equal(pickNudge(nudges, ["hungry:HUNGRY", "streak-risk"]), null);
});

test("what was said is kept per learner and per day, and bad storage reads as nothing said", () => {
  const raw = recordSeen(null, "7", "2026-11-09", ["hungry:HUNGRY"]);
  assert.deepEqual(parseSeen(raw, "7", "2026-11-09"), ["hungry:HUNGRY"]);
  assert.deepEqual(parseSeen(raw, "7", "2026-11-10"), []);
  assert.deepEqual(parseSeen(raw, "8", "2026-11-09"), []);
  assert.deepEqual(parseSeen("{not json", "7", "2026-11-09"), []);
  const again = recordSeen(raw, "7", "2026-11-09", ["hungry:HUNGRY", "quests:1"]);
  assert.deepEqual(parseSeen(again, "7", "2026-11-09"), ["hungry:HUNGRY", "quests:1"]);
  assert.equal(NUDGES_SEEN_KEY, "breadtrans.pet.nudges");
});

test("no line hard-codes a pet name, uses emoji, or sends everyone to listening", () => {
  const all = [
    ...activeNudges({ ...base, satietyState: "HUNGRY", hourVN: 20 }),
    ...activeNudges({ ...base, satietyState: "VERY_HUNGRY", balance: 0 }),
    ...activeNudges({ ...base, quests: [quest("nghe", true), quest("doc", false)] }),
    ...activeNudges({ ...base, quests: [quest("nghe", true)] }),
  ];
  assert.equal(all.length, 5);
  for (const n of all) {
    const words = `${n.header} ${n.text} ${n.action?.label ?? ""}`;
    assert.doesNotMatch(words, /Bready/);
    assert.doesNotMatch(words, /\p{Extended_Pictographic}/u);
    assert.notEqual(n.action?.type === "link" ? n.action.url : "", "/listening");
  }
});

test("hourInVietnam is UTC+7", () => {
  assert.equal(hourInVietnam(new Date("2026-11-09T11:30:00Z")), 18);
  assert.equal(hourInVietnam(new Date("2026-11-09T20:00:00Z")), 3);
});

test("a pet fed and hungry again the same day says so again", () => {
  const morning = activeNudges({ ...base, satietyState: "HUNGRY", lastFedAt: "2026-11-10T01:00:00.000Z" });
  const evening = activeNudges({ ...base, satietyState: "HUNGRY", lastFedAt: "2026-11-11T04:58:00.000Z" });
  assert.notEqual(morning[0].key, evening[0].key);
  // The morning line was seen; the evening one is new.
  assert.equal(pickNudge(evening, [morning[0].key])?.kind, "HUNGRY");
  // The same hunger is still said once.
  assert.equal(pickNudge(evening, [evening[0].key])?.kind === "HUNGRY", false);
});

test("the pet's own card says it is hungry, and only then", () => {
  assert.equal(hungerLine({ satietyState: "NORMAL", balance: 50, feedCost: 10 }), null);
  assert.equal(hungerLine({ satietyState: "FULL", balance: 50, feedCost: 10 }), null);
  assert.deepEqual(hungerLine({ satietyState: "HUNGRY", balance: 50, feedCost: 10 }), {
    veryHungry: false,
    short: 0,
    text: "Bụng tớ đói rồi. Cho tớ ăn một phần nhé?",
  });
  const broke = hungerLine({ satietyState: "VERY_HUNGRY", balance: 4, feedCost: 20 });
  assert.equal(broke?.veryHungry, true);
  assert.equal(broke?.short, 16);
  assert.match(broke?.text ?? "", /Cậu còn thiếu 16 Bánh Mì/);
});
