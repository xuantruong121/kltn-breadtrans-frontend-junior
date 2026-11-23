// Ảnh và đoạn quay thật của BreadTrans cho landing page.
// Sinh bởi scripts/landing/capture-landing-assets.mjs (tài khoản test student2, dev server :3000).
// Kích thước phải khớp file trong public/landing; assets.test.ts kiểm điều này.

export type LandingImage = { src: string; width: number; height: number; alt: string };

export type LandingImageKey =
  | 'skill-noi'
  | 'skill-nghe'
  | 'skill-doc'
  | 'skill-viet'
  | 'skill-luyen-de'
  | 'skill-flashcard'
  | 'habit-banh-mi'
  | 'habit-thu-ao'
  | 'habit-chuoi-ngay'
  | 'habit-dau-truong'
  | 'habit-xep-hang';

const img = (key: LandingImageKey, width: number, height: number, alt: string): LandingImage => ({
  src: `/landing/${key}.webp`,
  width,
  height,
  alt,
});

export const LANDING_IMAGES: Record<LandingImageKey, LandingImage> = {
  // /speaking/137?submissionId=304: kết quả chấm phát âm từng từ
  'skill-noi': img('skill-noi', 1360, 1120, 'Kết quả đánh giá phát âm từng từ, mỗi từ tô màu theo mức chính xác'),
  // /listening: danh sách bài Nghe đề xuất
  'skill-nghe': img('skill-nghe', 1600, 588, 'Phòng luyện Nghe với tiến độ và các bài Nghe được đề xuất'),
  // /reading: danh sách bài Đọc đề xuất
  'skill-doc': img('skill-doc', 1600, 588, 'Phòng luyện Đọc với tiến độ và các bài Đọc được đề xuất'),
  // /writing: danh sách bài Viết đề xuất
  'skill-viet': img('skill-viet', 1600, 459, 'Phòng luyện Viết với các bài viết câu và email được đề xuất'),
  // /exams/2: đề luyện TOEIC Nghe & Đọc, cấu trúc đề và chế độ làm bài
  'skill-luyen-de': img('skill-luyen-de', 1600, 1013, 'Đề luyện TOEIC Nghe và Đọc với cấu trúc Part 1 đến Part 7 và chế độ làm bài'),
  // /flashcard: bộ từ vựng và tiến độ ôn
  'skill-flashcard': img('skill-flashcard', 1600, 750, 'Flashcard và từ vựng với số từ cần ôn hôm nay và các bộ từ theo chủ đề'),
  // /market: số dư Bánh Mì và vật phẩm
  'habit-banh-mi': img('habit-banh-mi', 1600, 875, 'Cửa hàng Bánh Mì với số dư và các vật phẩm có thể đổi'),
  // /pet: thú ảo đồng hành
  'habit-thu-ao': img('habit-thu-ao', 1600, 1083, 'Thú ảo Cáo Phim Ảnh cùng các chỉ số nuôi dưỡng'),
  // /dashboard: chuỗi ngày học, điểm tuần, Bánh Mì
  'habit-chuoi-ngay': img('habit-chuoi-ngay', 1600, 667, 'Trang chủ học viên với chuỗi ngày học, điểm tuần và kết quả học tập'),
  // /arena: Đấu trường Song Đấu Từ Vựng
  'habit-dau-truong': img('habit-dau-truong', 1600, 701, 'Đấu trường Song Đấu Từ Vựng với hai nhân vật đối đầu và thành tích'),
  // /ranking: Đại sảnh danh vọng
  'habit-xep-hang': img('habit-xep-hang', 760, 740, 'Đại sảnh danh vọng của bảng xếp hạng'),
};

// /speaking/137?submissionId=304, quay lúc rê chuột qua từng từ. Poster là khung đầu.
export const LANDING_VIDEO: { src: string; poster: string; width: number; height: number; label: string } = {
  src: '/landing/noi-cham-tu.webm',
  poster: '/landing/noi-cham-tu.jpg',
  width: 1440,
  height: 784,
  label: 'Quay màn hình kết quả chấm phát âm từng từ của bài Nói',
};
