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
  { scene: "descend", text: "Xuống hầm giành lại lò thôi! Càng xuống sâu, quái càng mạnh." },
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
    appear: ["Đường trong kho là của bọ rùa ta!", "Chấm trên lưng ta toàn là kẹo, đừng hòng lấy!", "Để lại cục đường rồi đi!"],
    hit: ["Cục đường rơi rồi!", "Ui, sứt mất một chấm!"],
    defeat: ["Bay... bay đi thôi..."],
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
    appear: ["Xèo! Lửa trong lò bánh là ta lấy đấy!", "Ngươi tưởng qua được Slime Lửa Khổng Lồ sao?"],
    hit: ["Xèo xèo! Lửa ta nhỏ lại rồi!", "Nóng... nóng mặt quá!"],
    defeat: ["Phụt... trả lửa lại cho lò đây..."],
  },
  bee: {
    appear: ["Vo ve! Mật ong phết bánh là của ta!", "Bay vòng vòng, chích cho một phát!", "Đừng hòng lấy hũ mật!"],
    hit: ["Ui, cánh ta rối rồi!", "Vo... ve... chóng mặt quá!"],
    defeat: ["Về tổ... về tổ thôi..."],
  },
  fly: {
    appear: ["Vù vù! Vụn bánh rơi là của ta hết!", "Ta bay nhanh lắm, đọc kịp không?", "Có mùi bánh nướng đâu đây..."],
    hit: ["Ối, trúng cánh rồi!", "Vù... lệch đường bay rồi!"],
    defeat: ["Bay... không nổi nữa..."],
  },
  flour_worm: {
    appear: ["Ta bò ra từ bao bột đây!", "Bột mì ngon thế này ai mà nhường!", "Uốn éo, uốn éo... ngươi bắt không được đâu!"],
    hit: ["Ui, dính bột đầy người rồi!", "Đau quá, ta cuộn tròn đây!"],
    defeat: ["Chui... vào bao bột... trốn thôi..."],
  },
  cheese_worm: {
    appear: ["Phô mai này để ta gặm hết!", "Béo ngậy thế này, chia cho ai!", "Ngươi cũng mê phô mai à?"],
    hit: ["Ối, rơi mất miếng phô mai!", "Phô mai chảy hết rồi!"],
    defeat: ["Phô mai... tạm biệt..."],
  },
  taiyaki: {
    appear: ["Ta là bánh cá mà biết bơi đấy!", "Nhân đậu đỏ của ta không cho ai đâu!", "Bơi tung tăng trong hầm nè!"],
    hit: ["Vỏ giòn của ta mẻ rồi!", "Ối, rỉ nhân đậu đỏ!"],
    defeat: ["Bơi... về khuôn bánh thôi..."],
  },
  matcha_cake: {
    appear: ["Ta là Bông Lan Trà Xanh, cứng như đá đây!", "Để quên ngoài tủ ba ngày, giờ ta là boss!"],
    hit: ["Ui, mẻ một góc bánh rồi!", "Lớp kem trà xanh của ta!"],
    defeat: ["Mềm lại rồi... nhúng sữa đi..."],
  },
  pandan_jelly: {
    appear: ["Thạch Lá Dứa đây! Đàn hồi lắm nhé!", "Nhe răng ra cho ngươi sợ này!"],
    hit: ["Rung rinh, rung rinh quá!", "Thạch của ta nứt rồi!"],
    defeat: ["Tan... thành nước dừa mất rồi..."],
  },
  yeast_frog: {
    appear: ["Ộp! Ta là Ếch Chúa Men, ủ cả hầm này!", "Men của ta làm bột nở gấp đôi, ộp ộp!"],
    hit: ["Ộp! Đau bụng quá!", "Vương miện ếch của ta lệch rồi!"],
    defeat: ["Ộp... nhảy về ao thôi..."],
  },
};

/** A line for the monster at this moment, the same for everyone on the same floor. */
export function monsterLine(kind: MonsterKind, floor: number, moment: LineMoment, salt = 0): string {
  const list = LINES[kind][moment];
  return list[(floor * 7 + salt * 3) % list.length];
}

/** Hit lines now and then, not on every hit: every third answer that lands. */
export const saysOnHit = (answered: number) => answered % 3 === 1;
