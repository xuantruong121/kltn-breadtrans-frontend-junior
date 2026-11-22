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
  | 'habit-xep-hang'
  | 'habit-cua-hang'
  | 'path-danh-gia'
  | 'path-goi-y'
  | 'path-phan-hoi'
  | 'path-luyen-de';

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
  // /exams: chọn định dạng đề luyện
  'skill-luyen-de': img('skill-luyen-de', 1600, 513, 'Trang luyện đề thi chứng chỉ với các định dạng TOEIC L&R, S&W và 4 kỹ năng'),
  // /flashcard: bộ từ vựng và tiến độ ôn
  'skill-flashcard': img('skill-flashcard', 1600, 750, 'Flashcard và từ vựng với số từ cần ôn hôm nay và các bộ từ theo chủ đề'),
  // /market: số dư Bánh Mì và vật phẩm
  'habit-banh-mi': img('habit-banh-mi', 1600, 875, 'Cửa hàng Bánh Mì với số dư và các vật phẩm có thể đổi'),
  // /pet: thú ảo đồng hành
  'habit-thu-ao': img('habit-thu-ao', 1600, 1083, 'Thú ảo Cáo Phim Ảnh cùng các chỉ số nuôi dưỡng'),
  // /dashboard: chuỗi ngày học, điểm tuần, Bánh Mì
  'habit-chuoi-ngay': img('habit-chuoi-ngay', 1600, 667, 'Trang chủ học viên với chuỗi ngày học, điểm tuần và kết quả học tập'),
  // /arena: Đấu trường Song Đấu Từ Vựng
  'habit-dau-truong': img('habit-dau-truong', 1600, 701, 'Đấu trường Song Đấu Từ Vựng với mức cược và thành tích'),
  // /ranking: Đại sảnh danh vọng
  'habit-xep-hang': img('habit-xep-hang', 760, 740, 'Đại sảnh danh vọng của bảng xếp hạng'),
  // /market: lưới vật phẩm cửa hàng
  'habit-cua-hang': img('habit-cua-hang', 1600, 542, 'Vật phẩm trong cửa hàng: huy hiệu, khung avatar, khiên giữ chuỗi'),
  // /diagnostic: kết quả bài đánh giá đầu vào (hồ sơ bốn kỹ năng)
  'path-danh-gia': img('path-danh-gia', 1600, 773, 'Kết quả bài đánh giá đầu vào với hồ sơ bốn kỹ năng Nghe, Đọc, Nói, Viết'),
  // /dashboard (cuộn xuống): mức luyện tập đề xuất và lộ trình
  'path-goi-y': img('path-goi-y', 1600, 560, 'Mức luyện tập đề xuất và lộ trình từng bước theo kỹ năng'),
  // /speaking/137?submissionId=304: phản hồi sau bài Nói
  'path-phan-hoi': img('path-phan-hoi', 1360, 1200, 'Phản hồi sau bài Nói: điểm, độ chính xác, độ trôi chảy và so sánh với lần trước'),
  // /exams/2: cấu trúc đề và chế độ làm bài
  'path-luyen-de': img('path-luyen-de', 1600, 1013, 'Đề luyện TOEIC với cấu trúc Part 1 đến Part 7 và chế độ làm bài'),
};

// /speaking/137?submissionId=304, quay lúc rê chuột qua từng từ. Poster là khung đầu.
export const LANDING_VIDEO: { src: string; poster: string; width: number; height: number; label: string } = {
  src: '/landing/noi-cham-tu.webm',
  poster: '/landing/noi-cham-tu.jpg',
  width: 1440,
  height: 784,
  label: 'Quay màn hình kết quả chấm phát âm từng từ của bài Nói',
};
