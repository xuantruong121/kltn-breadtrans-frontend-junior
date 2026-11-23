/**
 * Copy deck and picture crops for three landing sections (spec 6.4.1-6.4.3):
 * the skills showcase, the habit tiles and the learning path.
 *
 * Every sentence says only what the product does and what its screenshot shows.
 * No learner counts, no testimonials, no exam-board or CEFR claim: the path
 * keeps the caveats of the old page's roadmap (ROADMAP_STEPS), including
 * "không phải chứng chỉ hay cấp độ CEFR". content.test.ts checks this.
 *
 * No React and no I/O, so the tests run under the Node test runner.
 */
import type { LandingImageKey } from "./assets";

export type LandingItem = { key: LandingImageKey; name: string; fact: string };

/** A rectangle of a picture in its own pixels (public/landing, same size as LANDING_IMAGES). */
export type Crop = { x: number; y: number; w: number; h: number };

// ---- Bốn kỹ năng và luyện đề --------------------------------------------

export const SKILLS_TITLE = "Bốn kỹ năng và luyện đề";

export const SKILLS: LandingItem[] = [
  {
    key: "skill-noi",
    name: "Nói",
    fact: "Đọc to câu mẫu rồi xem điểm phát âm của từng từ; từ nào cần luyện lại được tô màu riêng.",
  },
  {
    key: "skill-nghe",
    name: "Nghe",
    fact: "Bài Nghe được chấm ngay sau khi nộp. Bài đề xuất xếp theo mức luyện tập và kết quả các bài bạn đã làm.",
  },
  {
    key: "skill-doc",
    name: "Đọc",
    fact: "Đọc hiểu và ngữ pháp qua tình huống đời sống, học tập và công việc, chấm ngay sau khi nộp.",
  },
  {
    // The picture is the writing practice list (the test account has no graded
    // writing), so the caption says what the list offers, not that it grades.
    key: "skill-viet",
    name: "Viết",
    fact: "Chọn đề viết theo trình độ: dịch câu, viết câu theo tình huống hoặc theo tranh.",
  },
  {
    key: "skill-luyen-de",
    name: "Luyện đề TOEIC",
    fact: "Đề Nghe & Đọc theo cấu trúc TOEIC do BreadTrans biên soạn: 200 câu trong 120 phút, rồi xem lại đáp án và giải thích.",
  },
  {
    key: "skill-flashcard",
    name: "Flashcard",
    fact: "Học từ theo bộ chủ đề, ôn đúng lúc và theo dõi tiến độ từng bộ từ.",
  },
];

/** This item's stage plays LANDING_VIDEO (the same speaking result, recorded) instead of its picture. */
export const STAGE_VIDEO_KEY: LandingImageKey = "skill-noi";

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

/**
 * A crop and the alt text for what that crop shows (the full image's alt may
 * name parts cut away). `phone` is a tighter part of the same crop for the
 * skills stage under 768px, where the stage is too small for the whole crop.
 */
export type FramedCrop = Crop & { alt: string; phone?: Crop };

/**
 * The part of each picture the page shows. Each crop ends in blank space
 * between rows or cards so no cut text shows, and the section puts a padding
 * of page colour around it.
 *
 * Skills stage: the crops are tight enough that the UI text shows at about
 * its size in the app (12 px or more) on a 1440px screen, and the phone crops
 * do the same at 390px. The captures are 1.18 to 1.3 image px per CSS px
 * (skill-noi 2), so a 790px crop is about 670 CSS px of the app.
 */
export const CROPS: Partial<Record<LandingImageKey, FramedCrop>> = {
  // Skills stage: the recommended list with two cards; on a phone the first card.
  "skill-nghe": {
    x: 12, y: 245, w: 790, h: 343,
    phone: { x: 25, y: 338, w: 378, h: 178 },
    alt: "Bài Nghe đề xuất cho bạn, xếp theo mức luyện tập, hướng nghề và kết quả các bài đã làm",
  },
  "skill-doc": {
    x: 12, y: 245, w: 790, h: 318,
    phone: { x: 25, y: 338, w: 378, h: 140 },
    alt: "Bài Đọc đề xuất cho bạn ở mức Mất gốc, mỗi bài khoảng 10 phút",
  },
  "skill-viet": {
    x: 12, y: 98, w: 790, h: 345,
    phone: { x: 25, y: 190, w: 378, h: 140 },
    alt: "Bài Viết đề xuất ở mức Cơ bản: dịch câu, viết câu theo tình huống và theo tranh",
  },
  // The TOEIC exam page: the Listening parts of the structure, below the
  // description line (which names the exam board to say the test is not theirs).
  "skill-luyen-de": {
    x: 22, y: 338, w: 1023, h: 378,
    phone: { x: 48, y: 440, w: 480, h: 252 },
    alt: "Cấu trúc đề luyện TOEIC: phần Nghe gồm Part 1 đến Part 4 và số câu của từng phần",
  },
  "skill-flashcard": {
    x: 0, y: 388, w: 790, h: 357,
    phone: { x: 0, y: 388, w: 382, h: 180 },
    alt: "Hai bộ Flashcard theo chủ đề với số từ và tiến độ đã thuộc",
  },
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

/** LANDING_VIDEO, the word chips only (1 px per CSS px): readable on the stage at any width. */
export const VIDEO_CROP: Crop = { x: 70, y: 112, w: 580, h: 330 };

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
