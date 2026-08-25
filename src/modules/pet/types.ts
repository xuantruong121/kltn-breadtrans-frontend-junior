export interface PetSpecies {
  id: string;
  name: string;
  speciesName: string;
  title: string;
  element: string;
  elementColor: string;
  icon: string;
  buff: string;
  buffDetail: string;
  lore: string;
  quote: string;
  themeColor: {
    bg: string;
    border: string;
    shadow: string;
    accent: string;
    text: string;
  };
  stages: {
    stage1: { name: string; minLevel: number; icon: string; desc: string };
    stage2: { name: string; minLevel: number; icon: string; desc: string };
    stage3: { name: string; minLevel: number; icon: string; desc: string };
    stage4: { name: string; minLevel: number; icon: string; desc: string };
  };
}

export const PET_SPECIES_LIST: PetSpecies[] = [
  {
    id: "bready",
    name: "Bready",
    speciesName: "Bánh Mì Dũng Cảm",
    title: "Chiến Binh Bánh Mì",
    element: "Hệ Chiến Binh",
    elementColor: "bg-amber-100 text-amber-900 border-amber-300",
    icon: "🥖",
    buff: "+5% EXP Đấu Trường 1v1",
    buffDetail: "Tăng thêm 5% điểm kinh nghiệm khi bạn giành chiến thắng trong các trận so tài Đấu Trường 1v1.",
    lore: "Chú bánh mì dũng cảm luôn mang theo thanh kiếm Baguette sắc bén, sẵn sàng cổ vũ bạn vượt qua mọi thử thách ngữ pháp và bài thi khó!",
    quote: "Tiến lên nào hiệp sĩ! Chiến thắng hôm nay thuộc về chúng ta!",
    themeColor: {
      bg: "from-amber-400 via-orange-400 to-amber-500",
      border: "border-amber-400",
      shadow: "shadow-[0_8px_0_0_#d97706]",
      accent: "bg-amber-500",
      text: "text-amber-950",
    },
    stages: {
      stage1: { name: "Bánh Mì Con", minLevel: 1, icon: "🍞", desc: "Bánh mì gối đáng yêu" },
      stage2: { name: "Bánh Sừng Bò Hiệp Sĩ", minLevel: 4, icon: "🥐🛡️", desc: "Bánh sừng bò mang khiên giáp" },
      stage3: { name: "Đại Hiệp Sĩ Baguette", minLevel: 7, icon: "🥖⚔️", desc: "Bánh mì que vung kiếm dũng mãnh" },
      stage4: { name: "Vua Bánh Mì Hoàng Kim", minLevel: 10, icon: "🍞👑", desc: "Thống soái tối thượng hoàng kim" },
    },
  },
  {
    id: "owly",
    name: "Owly",
    speciesName: "Cú Mèo Thông Thái",
    title: "Học Giả Phép Thuật",
    element: "Hệ Học Thuật",
    elementColor: "bg-purple-100 text-purple-900 border-purple-300",
    icon: "🦉",
    buff: "+10% Bánh Mì khi đạt điểm 10 Quiz",
    buffDetail: "Thưởng thêm 10% số lượng Bánh Mì mỗi khi bạn giải đúng 100% câu hỏi trong các bài kiểm tra trắc nghiệm.",
    lore: "Cú mèo thông thái với cuốn từ điển cổ thư ma thuật, luôn sẵn sàng nhắc nhở bạn những mẹo ghi nhớ từ vựng và cấu trúc ngữ pháp đỉnh cao.",
    quote: "Kiến thức là sức mạnh! Cùng mình khám phá thêm bài học mới nhé!",
    themeColor: {
      bg: "from-purple-500 via-indigo-500 to-purple-600",
      border: "border-purple-400",
      shadow: "shadow-[0_8px_0_0_#7c3aed]",
      accent: "bg-purple-500",
      text: "text-purple-950",
    },
    stages: {
      stage1: { name: "Cú Non Mộng Mơ", minLevel: 1, icon: "🐣", desc: "Cú con tập đọc từ điển" },
      stage2: { name: "Cú Học Giả Đeo Kính", minLevel: 4, icon: "🦉👓", desc: "Cú mèo đeo kính thông thái" },
      stage3: { name: "Cú Cử Nhân Thông Thái", minLevel: 7, icon: "🦉🎓", desc: "Cú mèo đội mũ cử nhân & ôm sách" },
      stage4: { name: "Đại Hiền Triết Cú Mèo", minLevel: 10, icon: "🦉👑", desc: "Cú mèo tinh tú vĩnh hằng" },
    },
  },
  {
    id: "mimi",
    name: "Mimi",
    speciesName: "Mèo Bánh Cá Taiyaki",
    title: "Mèo Giao Tiếp Đáng Yêu",
    element: "Hệ Giao Tiếp",
    elementColor: "bg-rose-100 text-rose-900 border-rose-300",
    icon: "🐱",
    buff: "Khiên Bảo Vệ Chuỗi Streak 1 ngày",
    buffDetail: "Tự động cứu chuỗi ngày học của bạn 1 lần mỗi tuần nếu chẳng may bạn bận rộn quên học 1 ngày.",
    lore: "Cô mèo bánh cá nhỏ nhắn từ Nhật Bản với chiếc nón bánh cá giòn rụm, cực kỳ yêu thích những bạn học sinh siêng năng luyện phát âm AI!",
    quote: "Meow meow! Hôm nay bạn phát âm tiếng Anh cực kỳ chuẩn luôn đó!",
    themeColor: {
      bg: "from-rose-400 via-pink-400 to-rose-500",
      border: "border-rose-400",
      shadow: "shadow-[0_8px_0_0_#e11d48]",
      accent: "bg-rose-500",
      text: "text-rose-950",
    },
    stages: {
      stage1: { name: "Mèo Bánh Cá Bé", minLevel: 1, icon: "🐱", desc: "Mèo con ngây thơ" },
      stage2: { name: "Mèo Nơ Hồng Sành Điệu", minLevel: 4, icon: "😻🎀", desc: "Mèo cài nơ hồng lấp lánh" },
      stage3: { name: "Mèo Thiên Thần Taiyaki", minLevel: 7, icon: "😽🪽", desc: "Mèo thiên sứ có cánh thiên thần" },
      stage4: { name: "Nữ Hoàng Mèo Taiyaki", minLevel: 10, icon: "🐱👑", desc: "Mèo vương miện phước lành" },
    },
  },
  {
    id: "foxy",
    name: "Foxy",
    speciesName: "Cáo Phim Ảnh",
    title: "Ngôi Sao Âm Nhạc & Phim",
    element: "Hệ Giải Trí",
    elementColor: "bg-sky-100 text-sky-900 border-sky-300",
    icon: "🦊",
    buff: "+15 EXP khi học qua Phim & Nhạc",
    buffDetail: "Nhận thêm 15 điểm kinh nghiệm cho mỗi bài hát tiếng Anh hoặc đoạn trích phim luyện nghe bạn hoàn thành.",
    lore: "Cáo Foxy cực chất với chiếc tai nghe Gaming RGB, đam mê những giai điệu tiếng Anh sôi động và các bộ phim bom tấn đỉnh cao.",
    quote: "Bật nhạc lên nào! Vừa giải trí vừa giỏi tiếng Anh cùng Foxy nhé!",
    themeColor: {
      bg: "from-sky-400 via-cyan-500 to-blue-500",
      border: "border-sky-400",
      shadow: "shadow-[0_8px_0_0_#0284c7]",
      accent: "bg-sky-500",
      text: "text-sky-950",
    },
    stages: {
      stage1: { name: "Cáo Nhí Đeo Tai Nghe", minLevel: 1, icon: "🦊", desc: "Cáo con tinh nghịch" },
      stage2: { name: "Cáo DJ Kính Râm", minLevel: 4, icon: "🦊🎧", desc: "Cáo đeo tai nghe nhún nhảy" },
      stage3: { name: "Cáo Ngôi Sao Sân Khấu", minLevel: 7, icon: "🦊🎤", desc: "Cáo cầm mic vàng hào quang" },
      stage4: { name: "Huyền Thoại Cáo Âm Nhạc", minLevel: 10, icon: "🦊🌟", desc: "Siêu sao cáo toàn cầu rực rỡ" },
    },
  },
];

/**
 * Hàm phân loại chính xác loài thú cưng từ tên pet lưu trong Database
 */
export const getSpeciesIdFromPetName = (name?: string): string => {
  if (!name) return "bready";
  const n = name.trim().toLowerCase();
  if (n.includes("cú") || n === "owly" || n.includes("owl") || n.includes("thông thái") || n.includes("cử nhân")) {
    return "owly";
  }
  if (n.includes("mèo bánh cá") || n.includes("taiyaki") || n === "mimi" || n.includes("mimi") || n.includes("nơ hồng") || n.includes("thiên thần")) {
    return "mimi";
  }
  if (n.includes("cáo") || n === "foxy" || n.includes("fox") || n.includes("phim")) {
    return "foxy";
  }
  return "bready";
};
