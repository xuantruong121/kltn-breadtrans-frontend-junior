# 🍞 BreadTrans Junior Frontend (`kltn-breadtrans-frontend-junior`)

Giao diện người dùng hiện đại, sống động cho **Nền tảng Tự học Tiếng Anh theo kỹ năng, cấp độ, chủ đề và lộ trình BreadTrans E-Learning**. Người học có thể luyện đề theo nhiều dạng chứng chỉ, trong đó hiện có format TOEIC, kết hợp AI, Gamification và theo dõi tiến độ — Khóa luận tốt nghiệp.
Ứng dụng được thiết kế theo phong cách **Junior Neo-Brutalism** (border dày dặn, nút bấm 3D nổi bật, màu sắc rực rỡ và chuyển động vi mô mượt mà).

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16.3-black?logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/React-19.2-blue?logo=react" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-5-blue?logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/TailwindCSS-v4-38B2AC?logo=tailwindcss" alt="TailwindCSS" />
  <img src="https://img.shields.io/badge/Framer_Motion-13-FF0055?logo=framer" alt="Framer Motion" />
  <img src="https://img.shields.io/badge/Daily.co-Classroom-0070F3" alt="Daily.co Video" />
  <img src="https://img.shields.io/badge/CI%2FCD-GitHub_Actions-2088FF?logo=githubactions" alt="CI/CD" />
</p>

---

## 🌟 Tính Năng Nổi Bật

### 🎓 1. Phân Hệ Học Sinh (`(student)`)
- **Dashboard Trung Tâm:** Lộ trình học tập, thống kê tiến độ, thanh nhiệm vụ hằng ngày, chuỗi Streak và Bánh Mì tích lũy.
- **Khóa học tự học (PRO):** Lộ trình bài học, tài liệu và bài tập trong từng bài; tiến độ lưu theo bài tập đã nộp, giữ nguyên khi gói PRO hết hạn và gia hạn. Không có lớp học, giáo viên hay học phí riêng.
- **Luyện Nói & Chấm Điểm Phát Âm (Azure AI Speech F0):** Thu âm trực quan với đồng hồ đếm ngược giới hạn **45 giây**, phân tích phát âm chi tiết cấp độ âm vị (Phoneme-level), độ lưu loát (Fluency), ngữ điệu (Prosody).
- **Luyện Viết theo kỹ năng & format chứng chỉ (AI Tutor):** Viết bài trực tiếp trên web, tính năng đếm từ thông minh và AI chấm điểm, phân tích ngữ pháp, gợi ý diễn đạt; hiện có nội dung TOEIC Writing.
- **Học Từ Vựng & Flashcard 3D:** Hiệu ứng lật thẻ 3D, âm thanh phát âm mẫu chuẩn người bản xứ, chế độ Quiz và Typing ôn luyện.
- **Đấu Trường 1v1 (Arena):** Ghép cặp ngẫu nhiên và thi đấu trả lời câu hỏi đối kháng thời gian thực qua WebSockets.
- **Cửa Hàng Vật Phẩm (Market):** Dùng điểm Bánh Mì đổi các vật phẩm thú vị (Khiên đóng băng Streak, ngoại trang).

> Vai trò đang hoạt động: **Học viên** và **Quản trị viên**. Phân hệ Giáo viên, lớp học, ghi danh lớp và học phí lớp đã ngừng (CP60.1); xem `Project/CP60_1_LEGACY_CLASS_TEACHER_DECOMMISSION.md`.

### 🛡️ 2. Phân Hệ Quản Trị Viên (`(admin)`)
- **Analytics Dashboard:** Biểu đồ tương tác thời gian thực (Interactive Animated SVG Bar Chart) theo dõi xu hướng ghi danh, lượt hoạt động và cơ cấu nội dung bài học.
- **Quản Trị Nội Dung (CMS):** Quản lý ngân hàng Từ vựng, Ngữ pháp, Bài luyện nói, Đề thi Reading/Listening và Quản lý người dùng.

---

## 🛠️ Công Nghệ Sử Dụng (Tech Stack)

| Thành phần | Công nghệ | Mục đích |
|---|---|---|
| **Framework** | Next.js 16.3 (App Router, Turbopack) | Server Components, tối ưu hóa tốc độ tải trang |
| **Giao diện** | React 19, TailwindCSS v4 | Thiết kế phong cách Neo-Brutalism trẻ trung |
| **Hiệu ứng & 3D** | Framer Motion 13 | Lật thẻ 3D, thanh tiến trình dâng động, pháo hoa Confetti |
| **Server State** | TanStack React Query v5 | Quản lý caching, fetching và refetching dữ liệu API |
| **Client State** | Zustand v5 | Quản lý trạng thái đăng nhập (`authStore`), bài thi (`toeicStore`) |
| **Realtime** | Socket.io-Client v4 | Đồng bộ thời gian thực cho Đấu trường 1v1 Arena |
| **HTTP Client** | Axios (Interceptor) | Gọi REST API kèm tự động xác thực Bearer Token |

---

## 📂 Cấu Trúc Thư Mục (35+ Routes)

```
src/
├── app/
│   ├── (admin)/             # Phân hệ Quản trị viên (/admin, /admin/vocab, /admin/speaking...)
│   ├── (student)/           # Phân hệ Học viên (/dashboard, /learn, /courses, /my-courses...)
│   ├── (auth)/              # Luồng Đăng nhập & Đăng ký
│   ├── arena/               # Đấu trường đối kháng 1v1 Realtime
│   └── layout.tsx           # Root Layout & Global Providers
├── components/
│   ├── admin/               # AdminAnalyticsChart, AdminContentBreakdown
│   ├── ui/                  # Button3D, CardJunior, Badge, Modal...
│   └── common/              # Header, Sidebar, AudioVisualizer...
├── lib/
│   ├── api/                 # Axios Client & Services kết nối Backend
│   └── providers/           # React Query Provider, Socket Provider
└── stores/                  # Zustand Store (authStore, toeicStore)
```

---

## 🚀 Hướng Dẫn Cài Đặt & Khởi Chạy

### 1. Cài đặt Dependencies

```bash
cd kltn-breadtrans-frontend-junior
npm install
```

### 2. Cấu hình biến môi trường (`.env.local`)

Tạo file `.env.local` tại thư mục gốc:

```env
NEXT_PUBLIC_API_URL="http://localhost:3001"
```

### 3. Chạy môi trường phát triển (Development)

```bash
npm run dev
```

Mở trình duyệt truy cập: **[http://localhost:3000](http://localhost:3000)**

---

## 🧪 Kiểm Thử & CI/CD (GitHub Actions)

Dự án đã được thiết lập pipeline tự động hóa hoàn chỉnh:

```bash
# Kiểm tra định dạng và quy chuẩn mã nguồn
npm run lint

# Biên dịch kiểm thử Production Bundle
npm run build
```

- **GitHub Actions (`.github/workflows/ci.yml`):** Tự động kích hoạt khi có commit/PR để kiểm tra toàn bộ 35 routes và type-check TypeScript.
- **GitHub Actions (`.github/workflows/deploy.yml`):** Sẵn sàng kích hoạt deploy tự động khi merge vào nhánh `main`.

---

## 👨‍💻 Bản Quyền

Dự án Khóa Luận Tốt Nghiệp — BreadTrans E-Learning Frontend Junior.
