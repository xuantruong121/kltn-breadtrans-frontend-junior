/**
 * Copy deck and picture crops for three landing sections (spec 6.4.1-6.4.3):
 * the skills showcase, the habit tiles and the learning path.
 *
 * Every sentence says only what the product does and what its screenshot shows.
 * No learner counts, no testimonials, no exam-board or CEFR claim: the path
 * keeps the old roadmap's caveats (legacy-content.ts, ROADMAP_STEPS), including
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

// ---- Thứ giữ người học quay lại ------------------------------------------

export const HABITS_TITLE = "Thứ giữ người học quay lại";

export const HABITS_LEAD =
  "Hoàn thành bài luyện để nhận Bánh Mì. Bánh Mì nuôi thú ảo, đổi vật phẩm trong Cửa hàng và đặt cược ở Đấu trường.";

/**
 * Five tiles in this order; the second is the double-width tile. habit-cua-hang
 * is left out: it is the same /market screen as habit-banh-mi.
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
    fact: "Song đấu 10 câu từ vựng với một học viên khác; ai đúng nhiều và nhanh hơn lấy cả hai phần cược.",
  },
  {
    key: "habit-xep-hang",
    name: "Bảng xếp hạng",
    fact: "Đại sảnh danh vọng ghi tên người nhiều XP nhất và người giữ chuỗi dài nhất.",
  },
];

// ---- Lộ trình học --------------------------------------------------------

export const PATH_TITLE = "Lộ trình học";

/** The clause (name) opens with its order word; the fact keeps ROADMAP_STEPS' wording. */
export const PATH: LandingItem[] = [
  {
    key: "path-danh-gia",
    name: "Trước hết, làm bài đánh giá đầu vào.",
    fact: "Trả lời bộ câu hỏi đầu vào để thấy kỹ năng nào đang mạnh, kỹ năng nào cần luyện thêm. Kết quả là ước lượng nội bộ để gợi ý bài luyện, không phải chứng chỉ hay cấp độ CEFR.",
  },
  {
    key: "path-goi-y",
    name: "Rồi nhận gợi ý bài luyện.",
    fact: "Từ những câu bạn làm sai, hệ thống gợi ý bài luyện cho kỹ năng còn yếu. Bạn vẫn có thể chọn bất kỳ bài nào trong thư viện.",
  },
  {
    key: "path-phan-hoi",
    name: "Sau đó luyện và nhận phản hồi.",
    fact: "Bài Nghe và Đọc được chấm ngay sau khi nộp. Bài Nói được chấm phát âm từng từ, bài Viết nhận nhận xét tự động theo tiêu chí.",
  },
  {
    key: "path-luyen-de",
    name: "Cuối cùng, luyện đề TOEIC.",
    fact: "Làm đề Nghe & Đọc 200 câu trong 120 phút có đồng hồ, rồi xem lại đáp án và giải thích. Đề do BreadTrans biên soạn; điểm là chỉ số luyện tập, không phải điểm thi chính thức.",
  },
];

// ---- Crops ---------------------------------------------------------------

/** A crop and the alt text for what that crop shows (the full image's alt may name parts cut away). */
export type FramedCrop = Crop & { alt: string };

/**
 * The part of each picture the page shows. Several captures end mid-row or
 * touch their edges; each crop ends in blank space between rows or cards so no
 * cut text shows, and the section puts a padding of page colour around it.
 */
export const CROPS: Partial<Record<LandingImageKey, FramedCrop>> = {
  // Skills stage: the recommended list with two cards, or the page head.
  "skill-nghe": {
    x: 0, y: 215, w: 800, h: 373,
    alt: "Bài Nghe đề xuất cho bạn, xếp theo mức luyện tập, hướng nghề và kết quả các bài đã làm",
  },
  "skill-doc": {
    x: 0, y: 215, w: 800, h: 351,
    alt: "Bài Đọc đề xuất cho bạn ở mức Mất gốc, mỗi bài khoảng 10 phút",
  },
  "skill-viet": {
    x: 0, y: 0, w: 800, h: 447,
    alt: "Phòng luyện Viết với các bài đề xuất ở mức Cơ bản, mỗi bài khoảng 15 phút",
  },
  "skill-luyen-de": {
    x: 0, y: 0, w: 848, h: 500,
    alt: "Trang luyện đề thi chứng chỉ: TOEIC Practice có sẵn, các định dạng khác ghi Dự kiến, cùng các mục TOEIC L&R, S&W và 4 kỹ năng",
  },
  "skill-flashcard": {
    x: 0, y: 380, w: 793, h: 370,
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
  "habit-dau-truong": {
    x: 335, y: 4, w: 872, h: 691,
    alt: "Song Đấu Từ Vựng với ba mức cược Bánh Mì và hai nhân vật đối đầu",
  },
  "habit-xep-hang": {
    x: 0, y: 0, w: 760, h: 552,
    alt: "Đại sảnh danh vọng: người nhiều XP nhất và người có chuỗi dài nhất",
  },
  // Path: the part of the screen that belongs to the step.
  "path-danh-gia": {
    x: 40, y: 40, w: 885, h: 385,
    alt: "Kết quả bài đánh giá đầu vào với điểm tổng 60,9 trên 100",
  },
  "path-goi-y": {
    x: 0, y: 8, w: 620, h: 494,
    alt: "Mức luyện tập đề xuất Trung cấp và lộ trình từng bước theo kỹ năng",
  },
  "path-phan-hoi": {
    x: 40, y: 125, w: 1300, h: 1065,
    alt: "Phản hồi sau bài Nói: điểm 7,8 trên 10, độ chính xác, độ trôi chảy và độ hoàn thiện",
  },
  "path-luyen-de": {
    x: 0, y: 10, w: 1066, h: 990,
    alt: "Đề luyện TOEIC Nghe và Đọc do BreadTrans biên soạn, với cấu trúc Part 1 đến Part 7",
  },
};

/** LANDING_VIDEO without the cut-off labels at the bottom of its right panel. */
export const VIDEO_CROP: Crop = { x: 0, y: 0, w: 1440, h: 615 };

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
