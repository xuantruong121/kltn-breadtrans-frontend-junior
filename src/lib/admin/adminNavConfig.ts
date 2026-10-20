export interface AdminAuthoringDestination {
  label: string;
  description: string;
  href: string;
  iconName: string;
}

export const ADMIN_AI_AUTHORING_DESTINATIONS: AdminAuthoringDestination[] = [
  {
    label: "Khóa học",
    description: "AI phân loại lộ trình và gợi ý các bài học phù hợp.",
    href: "/admin/courses",
    iconName: "BookOpen",
  },
  {
    label: "Bài nghe",
    description: "AI soạn nguồn nghe cùng câu hỏi nháp để Admin duyệt.",
    href: "/admin/listening",
    iconName: "Headphones",
  },
  {
    label: "Bài nói",
    description: "AI soạn bộ luyện và 1–10 câu nói nháp để Admin duyệt.",
    href: "/admin/speaking",
    iconName: "Mic",
  },
  {
    label: "Bài đọc",
    description: "AI soạn đoạn đọc cùng 1–10 câu hỏi nháp để Admin duyệt.",
    href: "/admin/reading",
    iconName: "FileText",
  },
  {
    label: "Bài viết",
    description: "AI gợi ý đề bài; ảnh Picture Task vẫn do Admin chọn.",
    href: "/admin/writing",
    iconName: "PenTool",
  },
  {
    label: "Từ vựng",
    description: "AI soạn chủ đề cùng 1–30 từ nháp để Admin duyệt.",
    href: "/admin/vocab",
    iconName: "Layers",
  },
  {
    label: "Ngữ pháp",
    description: "AI soạn chủ đề cùng 1–20 câu hỏi nháp để Admin duyệt.",
    href: "/admin/grammar",
    iconName: "GraduationCap",
  },
  {
    label: "Luyện đề",
    description: "Soạn và quản lý nội dung luyện đề.",
    href: "/admin/exams",
    iconName: "Award",
  },
];

export interface AdminNavItemConfig {
  id: string;
  href: string;
  label: string;
  iconName: string;
  roles?: "ADMIN"[];
}

export interface AdminNavGroupConfig {
  id: string;
  title: string;
  iconName: string;
  items: AdminNavItemConfig[];
}

export const ADMIN_NAV_GROUPS: AdminNavGroupConfig[] = [
  {
    id: "content-group",
    title: "NỘI DUNG HỌC",
    iconName: "BookMarked",
    items: [
      {
        id: "courses",
        href: "/admin/courses",
        label: "Khóa học",
        iconName: "BookOpen",
      },
      {
        id: "listening",
        href: "/admin/listening",
        label: "Nghe",
        iconName: "Headphones",
      },
      {
        id: "speaking",
        href: "/admin/speaking",
        label: "Nói",
        iconName: "Mic",
      },
      {
        id: "reading",
        href: "/admin/reading",
        label: "Đọc",
        iconName: "BookOpen",
      },
      {
        id: "writing",
        href: "/admin/writing",
        label: "Viết",
        iconName: "PenTool",
      },
      {
        id: "vocab",
        href: "/admin/vocab",
        label: "Từ vựng & Flashcard",
        iconName: "Layers",
      },
      {
        id: "grammar",
        href: "/admin/grammar",
        label: "Ngữ pháp",
        iconName: "GraduationCap",
      },
      {
        id: "exams",
        href: "/admin/exams",
        label: "Luyện đề",
        iconName: "Award",
      },
    ],
  },
  {
    id: "users-group",
    title: "NGƯỜI DÙNG & THANH TOÁN",
    iconName: "Users",
    items: [
      {
        id: "users",
        href: "/admin/users",
        label: "Người dùng",
        iconName: "Users",
      },
      {
        id: "payments",
        href: "/admin/payments",
        label: "Thanh toán",
        iconName: "CreditCard",
        roles: ["ADMIN"],
      },
    ],
  },
  {
    id: "market-group",
    title: "ĐIỂM THƯỞNG & PHẦN THƯỞNG",
    iconName: "ShoppingBag",
    items: [
      {
        id: "market",
        href: "/admin/market",
        label: "Cửa hàng đổi quà",
        iconName: "ShoppingBag",
      },
      {
        id: "currency",
        href: "/admin/currency",
        label: "Sổ Bánh Mì",
        iconName: "Coins",
      },
    ],
  },
  {
    id: "system-group",
    title: "VẬN HÀNH & HỆ THỐNG",
    iconName: "Settings",
    items: [
      {
        id: "messages",
        href: "/admin/messages",
        label: "Tin nhắn",
        iconName: "Inbox",
      },
      {
        id: "issue-reports",
        href: "/admin/issue-reports",
        label: "Báo cáo lỗi",
        iconName: "Flag",
      },
      {
        id: "suggestions",
        href: "/admin/suggestions",
        label: "Đề xuất & Góp ý",
        iconName: "MessageSquare",
      },
      {
        id: "costs",
        href: "/admin/costs",
        label: "Chi phí & Hiệu năng",
        iconName: "Activity",
      },
    ],
  },
];

export function isAdminGroupActive(group: AdminNavGroupConfig, pathname: string): boolean {
  if (!pathname) return false;
  return group.items.some((item) =>
    item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href),
  );
}
