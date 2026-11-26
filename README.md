# BreadTrans Frontend 🍞

[![Next.js 16](https://img.shields.io/badge/Next.js-16-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![React 19](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS 4](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Vercel](https://img.shields.io/badge/Vercel-Deploy-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://vercel.com/)

Giao diện web của **BreadTrans**, nền tảng tự học tiếng Anh, xây dựng với **Next.js 16 (App Router)**,
**React 19** và **Tailwind CSS 4**. Ứng dụng có hai phân hệ: học viên và quản trị viên. API nằm ở repo
`kltn-breadtrans-backend`.

## 🏗️ Kiến trúc dự án

- **Định tuyến (App Router):** mỗi phân hệ là một route group trong `src/app/`:
  - `(public)/`: trang chủ, trợ giúp, điều khoản, quyền riêng tư;
  - `(student)/`: phân hệ học viên;
  - `(admin)/admin/`: phân hệ quản trị;
  - `login/`, `register/`, `forgot-password/`, `reset-password/`, `auth/`: đăng nhập và tài khoản.
- **Gói tính năng:** `src/modules/` (arena, flashcard, market, pet, ranking, subscription, toeic…) và
  `src/components/` theo từng khu vực.
- **Logic thuần:** `src/lib/` giữ phần tính toán không phụ thuộc giao diện, kèm file `*.test.ts`.
- **Dữ liệu:** TanStack Query cho dữ liệu từ máy chủ, Zustand cho trạng thái phía trình duyệt (đăng nhập,
  bài thi, thú ảo…).
- **Gọi API:** mọi request đi qua `src/lib/api/axiosClient.ts`. Trình duyệt gọi `/api` trên chính domain
  của web, Next.js chuyển tiếp sang backend, nên cookie refresh là cookie cùng domain.
- **Thời gian thực:** Socket.io client cho đấu trường 1v1 và thông báo.

## ✨ Tính năng

### 🎓 Học viên
- Bảng điều khiển: kết quả học tập theo kỳ, lộ trình mở mức, kế hoạch tuần, bài luyện gợi ý mỗi ngày.
- Bài đánh giá đầu vào và bốn mức luyện tập.
- Phòng luyện Nghe, Nói, Đọc, Viết với chế độ tập trung; đếm thời gian học khi đang luyện.
- Từ vựng và flashcard, ngữ pháp, sổ lỗi sai.
- Đề mô phỏng TOEIC: làm đề, xem kết quả, xem lại bài.
- Bảng xếp hạng theo hạng tuần, đấu trường 1v1, thú ảo, cửa hàng đổi Bánh Mì.
- Gói Free/Plus/Pro, thông báo trên web và Web Push.
- Khung trợ lý AI, chuyển được sang nhắn tin trực tiếp với quản trị viên.

### 🛡️ Quản trị viên
- Trang tổng quan vận hành.
- CMS cho Nghe, Nói, Đọc, Ngữ pháp, Viết, Từ vựng, Kho từ điển, Luyện đề, Lĩnh vực; soạn nháp bằng AI.
- Người dùng, gói nâng cấp, giữ chân và gia hạn, mã giảm giá, thanh toán.
- Cửa hàng đổi quà, sổ Bánh Mì, tin nhắn, báo lỗi, đề xuất và góp ý, chi phí và hiệu năng.

## 📦 Tech Stack

- **Framework:** Next.js 16 (App Router, Turbopack)
- **Ngôn ngữ:** TypeScript 5
- **Giao diện:** React 19, Tailwind CSS 4, Framer Motion, lucide-react
- **Quản lý trạng thái:** Zustand 5
- **Gọi API:** Axios + TanStack Query 5
- **Thời gian thực:** Socket.io client 4
- **Kiểm thử:** trình chạy test có sẵn của Node (`node --test`)

## 🚀 Cài đặt và chạy

```bash
# Cài thư viện
npm install

# Chạy môi trường phát triển (backend phải chạy ở http://localhost:3001)
npm run dev

# Build và chạy bản production
npm run build
npm run start
```

Mở http://localhost:3000.

Tạo file `.env.local`:

```env
NEXT_PUBLIC_API_URL=/api
API_ORIGIN=http://localhost:3001
NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
NEXT_PUBLIC_GOOGLE_CLIENT_ID=<client ID OAuth của Google>
NEXT_PUBLIC_VAPID_PUBLIC_KEY=<khóa công khai VAPID của backend>
```

## 📁 Cấu trúc thư mục

```
kltn-breadtrans-frontend-junior/
├── src/
│   ├── app/
│   │   ├── (public)/            # Trang chủ, /help, /privacy, /terms
│   │   ├── (student)/           # /dashboard, /diagnostic, /listening, /reading, /writing,
│   │   │                        # /speaking, /vocabulary, /flashcard, /grammar, /toeic,
│   │   │                        # /mistakes, /ranking, /arena, /pet, /market, /plans…
│   │   ├── (admin)/admin/       # Phân hệ quản trị
│   │   ├── login/ register/ forgot-password/ reset-password/ auth/
│   │   ├── layout.tsx           # Layout gốc và các provider
│   │   └── globals.css          # Tailwind, token màu, biến thể responsive
│   ├── components/              # Thành phần giao diện theo khu vực
│   ├── modules/                 # Gói tính năng (arena, flashcard, pet, toeic…)
│   ├── lib/
│   │   ├── api/                 # axiosClient.ts và các service gọi backend
│   │   ├── auth/                # Phiên đăng nhập, làm mới token, đăng nhập Google
│   │   └── …                    # Logic thuần theo kỹ năng, kèm *.test.ts
│   ├── hooks/
│   ├── contexts/
│   └── stores/                  # Zustand: authStore, toeicStore, gamificationStore…
├── public/
├── scripts/                     # Script kiểm tra giao diện (responsive, độ tương phản…)
├── docs/                        # CI/CD, PWA, thuật ngữ giao diện
├── next.config.ts               # Proxy /api, chuyển hướng
└── package.json
```

## 🎨 Design System

### Màu sắc
- **Màu thương hiệu:** cam `#f97316` (`brand-500`), thang `brand-50` đến `brand-900` trong `globals.css`.
- **Màu theo nghĩa:** xanh dương cho học viên, xanh lục cho thành công, hổ phách cho chờ hoặc cảnh báo, đỏ
  hồng cho lỗi.
- **Giao diện sáng và tối:** `src/lib/theme/`.

### Chữ và icon
- Font **Quicksand** (`next/font/google`).
- Icon SVG của `lucide-react`, cùng một `strokeWidth`.

### Responsive
- Biến thể Tailwind riêng: `phone-land:` cho điện thoại xoay ngang, `short:` cho laptop màn thấp.

## 👥 Hướng dẫn phát triển

- **Trang mới:** đặt trong route group của phân hệ (`(student)/`, `(admin)/admin/` hoặc `(public)/`).
- **Gọi API:** viết hàm trong `src/lib/api/services/`, gọi qua TanStack Query trong component.
- **Logic:** đặt ở `src/lib/` dưới dạng hàm thuần, viết test `*.test.ts` cạnh file.
- **Quy tắc giao diện và tên gọi:** `FRONTEND_RULES.md`, `docs/UI_TERMINOLOGY.md`.

## 📝 Lưu ý quan trọng

1. **`NEXT_PUBLIC_API_URL=/api`:** trình duyệt chỉ gọi `/api`; `API_ORIGIN` là địa chỉ backend mà Next.js
   chuyển tiếp tới.
2. **Biến `NEXT_PUBLIC_*`** nằm trong mã gửi xuống trình duyệt, chỉ đặt giá trị công khai vào đó.
3. **`axiosClient.ts`:** khi nhiều request cùng nhận 401, chúng chờ một lần làm mới token duy nhất. Sửa
   file này phải giữ cơ chế đó.
4. **Dev server thứ hai:** đặt `NEXT_DIST_DIR` sang thư mục khác để không dùng chung `.next`.
5. **Build:** `npm run build` tốn nhiều RAM, nên tắt `npm run dev` trước khi build.

## 🧪 Kiểm thử

```bash
npm run lint
npm run typecheck
npm run test:ci                      # mọi src/**/*.test.ts
npm run ci:check                     # lint, typecheck, test:ci, build

# Một file test
node --no-warnings --test --experimental-strip-types src/lib/diagnostic/diagnosticUiLogic.test.ts

# Kiểm tra bố cục responsive
npm run test:responsive-invariants
```

## 🚀 CI/CD và triển khai

### GitHub Actions
Khi push lên `develop` hoặc `main`, khi mở Pull Request vào `main`, hoặc khi bấm chạy tay ở tab
**Actions** (workflow **Frontend CI**), GitHub Actions chạy:
1. ✅ `npm ci`
2. ✅ `npm run lint`
3. ✅ `npm run typecheck`
4. ✅ `npm run test:ci`
5. ✅ `npm run build`

### Vercel
- Triển khai qua Vercel Git Integration: nhánh `develop` tạo bản Preview, nhánh `main` tạo bản Production.
- Trên Vercel đặt `NEXT_PUBLIC_API_URL=/api` và `API_ORIGIN` là địa chỉ công khai của backend.
- Chi tiết: `docs/CI_CD_SETUP.md`.

## 📝 Giấy phép

Dự án khóa luận tốt nghiệp ngành Kỹ thuật Phần mềm tại IUH, dùng cho mục đích học tập.

---

*Thực hiện bởi nhóm BreadTrans.*
