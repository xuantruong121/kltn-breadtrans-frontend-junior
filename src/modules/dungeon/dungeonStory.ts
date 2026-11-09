/**
 * Hầm Bánh Mì's story (owner 2026-11-09: "no opening, no story, no small
 * stages"): the opening panels, the chapters every five floors, and what
 * the monsters say. Lines are picked by floor, so the day's dungeon says the
 * same to everyone. Pure.
 */
import type { MonsterKind } from "@/lib/api/services/dungeon.service";

export const STORY_SEEN_KEY = "breadtrans.dungeon.storySeen";

export type StoryPanel = { scene: "oven-cold" | "invaders" | "spellbook" | "descend"; text: string };

export const STORY: StoryPanel[] = [
  { scene: "oven-cold", text: "Đêm ấy, lò bánh dưới hầm tiệm BreadTrans bỗng tắt ngấm. Cả tiệm lạnh tanh, không một mẻ bánh nào nở nổi." },
  { scene: "invaders", text: "Vua Bột Chua và đám bánh thiu đã chiếm các tầng hầm, còn ăn mất chữ trong cuốn sách công thức." },
  { scene: "spellbook", text: "Chỉ người thuộc từ mới đọc được công thức làm bánh. Mỗi từ đúng là một mẻ bánh nóng bắn bay lũ quái." },
  { scene: "descend", text: "Cầm lấy pháo bánh mì, xuống hầm giành lại lò. Càng xuống sâu, quái càng mạnh." },
];

const CHAPTER_NAMES = ["Lò Ủ Bột", "Kho Đường", "Hầm Men", "Lò Than"];
export const FLOORS_PER_CHAPTER = 5;

/**
 * The chapter a floor belongs to: five floors each, the fifth a boss; after
 * the fourth the names come round again with a number ("Lò Ủ Bột II").
 */
export function chapterFor(floor: number) {
  const index = Math.floor((Math.max(1, floor) - 1) / FLOORS_PER_CHAPTER);
  const round = Math.floor(index / CHAPTER_NAMES.length);
  const name = CHAPTER_NAMES[index % CHAPTER_NAMES.length] + (round > 0 ? ` ${"I".repeat(round + 1)}` : "");
  const first = index * FLOORS_PER_CHAPTER + 1;
  return {
    number: index + 1,
    name,
    first,
    bossFloor: first + FLOORS_PER_CHAPTER - 1,
    /** 0 to 4: where the floor sits on the chapter's map. */
    step: floor - first,
    starts: floor === first,
  };
}

export type LineMoment = "appear" | "hit" | "defeat";

const LINES: Record<MonsterKind, Record<LineMoment, string[]>> = {
  moldy: {
    appear: ["Bột của ta chưa nở đâu nhé!", "Mốc meo thế này mới ngon!", "Ai cho ngươi xuống hầm?"],
    hit: ["Ui, rơi mất mảng vỏ!", "Chữ đó ta quên rồi..."],
    defeat: ["Ta... chỉ muốn được nướng lại..."],
  },
  mouse: {
    appear: ["Chít! Bột này là của ta!", "Gặm hết sách công thức rồi, chít chít!", "Ngươi đọc được chữ à?"],
    hit: ["Chít! Đau!", "Râu ta cong hết rồi!"],
    defeat: ["Chít... trả lại bột đây..."],
  },
  ant: {
    appear: ["Đường là của cả đàn kiến!", "Ta khiêng được gấp năm mươi lần người!", "Để lại cục đường rồi đi!"],
    hit: ["Cục đường rơi rồi!", "Gọi cả đàn tới đây!"],
    defeat: ["Cả đàn ơi... rút lui!"],
  },
  snail: {
    appear: ["Từ... từ... thôi... nào...", "Bơ trên lưng ta là của ta!", "Chậm mà chắc, nhóc ạ."],
    hit: ["Ối, chảy bơ rồi!", "Ta rụt vào vỏ đây!"],
    defeat: ["Đi... chậm... thôi..."],
  },
  sourdough_king: {
    appear: ["Ta là Vua Bột Chua! Cả lò này thuộc về ta!", "Muốn giành lại lò? Đọc đúng từng chữ đi!"],
    hit: ["Vương miện của ta lệch rồi!", "Ngươi thuộc từ cũng khá đấy!"],
    defeat: ["Không thể nào... vương quốc bột chua của ta..."],
  },
  flour_dragon: {
    appear: ["GRÀO! Bột mì trắng xoá cả hầm này!", "Ngươi tưởng qua được Rồng Bột Mì sao?"],
    hit: ["Phù! Bột bay mù mịt!", "Đuôi ta tê rồi!"],
    defeat: ["Ta... tan thành bột mất rồi..."],
  },
};

/** A line for the monster at this moment, the same for everyone on the same floor. */
export function monsterLine(kind: MonsterKind, floor: number, moment: LineMoment, salt = 0): string {
  const list = LINES[kind][moment];
  return list[(floor * 7 + salt * 3) % list.length];
}

/** Hit lines now and then, not on every hit: every third answer that lands. */
export const saysOnHit = (answered: number) => answered % 3 === 1;
