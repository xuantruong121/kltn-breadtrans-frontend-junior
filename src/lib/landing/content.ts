/**
 * Copy deck and picture crops for three landing sections (spec 6.4.1-6.4.3):
 * the skills showcase, the habit tiles and the learning path.
 *
 * Every sentence says only what the product does and what its fragment or
 * screenshot shows.
 * No learner counts, no testimonials, no exam-board or CEFR claim: the path
 * keeps the caveats of the old page's roadmap (ROADMAP_STEPS), including
 * "không phải chứng chỉ hay cấp độ CEFR". content.test.ts checks this.
 *
 * No React and no I/O, so the tests run under the Node test runner.
 */
import type { LandingImageKey } from "./assets";

export type LandingItem<K extends string = LandingImageKey> = { key: K; name: string; fact: string };

/** The six parts of the skills stage; each has a coded fragment (src/components/landing/fragments). */
export type SkillKey = "skill-noi" | "skill-nghe" | "skill-doc" | "skill-viet" | "skill-luyen-de" | "skill-flashcard";

/** A rectangle of a picture in its own pixels (public/landing, same size as LANDING_IMAGES). */
export type Crop = { x: number; y: number; w: number; h: number };

// ---- Bốn kỹ năng và luyện đề --------------------------------------------

export const SKILLS_TITLE = "Bốn kỹ năng và luyện đề";

export const SKILLS: LandingItem<SkillKey>[] = [
  {
    key: "skill-noi",
    name: "Nói",
    fact: "Đọc to câu mẫu rồi xem điểm từng từ: xanh là đạt chuẩn, vàng cần chỉnh lại, đỏ chưa đạt, từ gạch ngang là bị bỏ sót.",
  },
  {
    key: "skill-nghe",
    name: "Nghe",
    fact: "Nghe đoạn ghi âm rồi chọn đáp án. Bài được chấm ngay khi nộp và hiện đáp án đúng.",
  },
  {
    key: "skill-doc",
    name: "Đọc",
    fact: "Đọc thông báo, tin nhắn hay email rồi trả lời. Mỗi câu có giải thích vì sao đáp án đúng.",
  },
  {
    key: "skill-viet",
    name: "Viết",
    fact: "Mỗi đề Viết nêu rõ tình huống và số từ cần viết. Bài nộp được nhận xét theo tiêu chí.",
  },
  {
    key: "skill-luyen-de",
    name: "Luyện đề TOEIC",
    fact: "Đề Nghe & Đọc theo cấu trúc TOEIC do BreadTrans biên soạn: 200 câu trong 120 phút, hoặc chọn từng Part để luyện.",
  },
  {
    key: "skill-flashcard",
    name: "Flashcard",
    fact: "Mỗi thẻ có phiên âm, nghĩa và câu ví dụ. Lật thẻ để xem mặt sau.",
  },
];

// ---- Lý do quay lại mỗi ngày ---------------------------------------------

export const HABITS_TITLE = "Lý do quay lại mỗi ngày";

export const HABITS_LEAD =
  "Mỗi bài luyện xong đều được thưởng Bánh Mì. Dùng Bánh Mì để chăm thú ảo, đổi huy hiệu trong Cửa hàng và thử sức với bạn học ở Đấu trường.";

/**
 * Five tiles in this order; the second is the double-width tile. No caption
 * and no crop speaks of stakes or betting: the arena tile shows the duel itself.
 */
export const HABITS: LandingItem[] = [
  {
    key: "habit-thu-ao",
    name: "Thú ảo",
    fact: "Cho thú ảo ăn bằng Bánh Mì và chăm nó mỗi ngày.",
  },
  {
    key: "habit-banh-mi",
    name: "Bánh Mì",
    fact: "Đổi Bánh Mì lấy huy hiệu, khung avatar hay khiên giữ chuỗi trong Cửa hàng.",
  },
  {
    key: "habit-chuoi-ngay",
    name: "Chuỗi ngày học",
    fact: "Học mỗi ngày để giữ chuỗi; khiên giữ chuỗi đỡ cho một ngày lỡ học.",
  },
  {
    key: "habit-dau-truong",
    name: "Đấu trường",
    fact: "Song đấu 10 câu từ vựng với một bạn học; ai trả lời đúng nhiều và nhanh hơn thì thắng trận.",
  },
  {
    key: "habit-xep-hang",
    name: "Bảng xếp hạng",
    fact: "Đại sảnh danh vọng ghi tên người nhiều XP nhất và người giữ chuỗi dài nhất.",
  },
];

// ---- Lộ trình học --------------------------------------------------------

export const PATH_TITLE = "Lộ trình học";

/** A step of the path: words only, the section draws one loaf cut for each. */
export type PathStep = { name: string; fact: string };

/** The clause (name) opens with its order word; the fact keeps ROADMAP_STEPS' wording. */
export const PATH: PathStep[] = [
  {
    name: "Trước hết, làm bài đánh giá đầu vào.",
    fact: "Trả lời bộ câu hỏi đầu vào để thấy kỹ năng nào đang mạnh, kỹ năng nào cần luyện thêm. Kết quả là ước lượng nội bộ để gợi ý bài luyện, không phải chứng chỉ hay cấp độ CEFR.",
  },
  {
    name: "Rồi nhận gợi ý bài luyện.",
    fact: "Từ những câu bạn làm sai, hệ thống gợi ý bài luyện cho kỹ năng còn yếu. Bạn vẫn có thể chọn bất kỳ bài nào trong thư viện.",
  },
  {
    name: "Sau đó luyện và nhận phản hồi.",
    fact: "Bài Nghe và Đọc được chấm ngay sau khi nộp. Bài Nói được chấm phát âm từng từ, bài Viết nhận nhận xét tự động theo tiêu chí.",
  },
  {
    name: "Cuối cùng, luyện đề TOEIC.",
    fact: "Làm đề Nghe & Đọc 200 câu trong 120 phút có đồng hồ, rồi xem lại đáp án và giải thích. Đề do BreadTrans biên soạn; điểm là chỉ số luyện tập, không phải điểm thi chính thức.",
  },
];

// ---- Crops ---------------------------------------------------------------

/** A crop and the alt text for what that crop shows (the full image's alt may name parts cut away). */
export type FramedCrop = Crop & { alt: string };

/**
 * The part of each picture the page shows. Each crop ends in blank space
 * between rows or cards so no cut text shows, and the section puts a padding
 * of page colour around it. The skills stage shows coded fragments instead
 * (src/components/landing/fragments).
 */
export const CROPS: Partial<Record<LandingImageKey, FramedCrop>> = {
  // Habit tiles: one object each.
  "habit-thu-ao": { x: 200, y: 360, w: 540, h: 505, alt: "Thú ảo Cáo Phim Ảnh đang sẵn sàng" },
  "habit-banh-mi": {
    x: 0, y: 0, w: 1600, h: 875,
    alt: "Cửa hàng Bánh Mì với số dư và các vật phẩm có thể đổi",
  },
  "habit-chuoi-ngay": {
    x: 950, y: 36, w: 620, h: 469,
    alt: "Chuỗi học 3 ngày, điểm tuần 135 XP và số dư Bánh Mì trên trang chủ học viên",
  },
  // The duel panel only: the rest of the arena screen shows the Bánh Mì stakes.
  "habit-dau-truong": {
    x: 792, y: 42, w: 378, h: 612,
    alt: "Song Đấu Từ Vựng: hai nhân vật bánh mì đối đầu",
  },
  "habit-xep-hang": {
    x: 0, y: 0, w: 760, h: 552,
    alt: "Đại sảnh danh vọng: người nhiều XP nhất và người có chuỗi dài nhất",
  },
};

const pct = (n: number) => `${Number(n.toFixed(4))}%`;

/**
 * Size and offset of the whole picture inside a box that has the crop's aspect
 * ratio (cropRatio), so exactly the crop shows. Use with position: absolute,
 * max-width: none and overflow: hidden on the box.
 */
export function cropMedia(size: { width: number; height: number }, crop: Crop) {
  return {
    width: pct((size.width / crop.w) * 100),
    height: pct((size.height / crop.h) * 100),
    left: pct((-crop.x / crop.w) * 100),
    top: pct((-crop.y / crop.h) * 100),
  };
}

/** CSS aspect-ratio of a crop. */
export function cropRatio(crop: Crop): string {
  return `${crop.w} / ${crop.h}`;
}

/**
 * Width of the crop's box when it must fit inside the nearest size container
 * (container-type: size), keeping `margin` free on every side.
 */
export function fitWidth(crop: Crop, margin = "0px"): string {
  const ratio = Number((crop.w / crop.h).toFixed(4));
  return `min(calc(100cqw - 2 * ${margin}), calc((100cqh - 2 * ${margin}) * ${ratio}))`;
}

/** Next selected index for a key in a list of `count` items; null when the key does nothing. */
export function stepIndex(key: string, index: number, count: number): number | null {
  switch (key) {
    case "ArrowRight":
    case "ArrowDown":
      return (index + 1) % count;
    case "ArrowLeft":
    case "ArrowUp":
      return (index - 1 + count) % count;
    case "Home":
      return 0;
    case "End":
      return count - 1;
    default:
      return null;
  }
}
