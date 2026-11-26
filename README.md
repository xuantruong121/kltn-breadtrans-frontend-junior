# BreadTrans Frontend

Giao diện web của BreadTrans, nền tảng tự học tiếng Anh (khóa luận tốt nghiệp). Có hai phần:

- **Học viên:** bài đánh giá đầu vào, luyện Nghe, Nói, Đọc, Viết, từ vựng (flashcard), ngữ pháp, đề mô
  phỏng cấu trúc TOEIC, sổ lỗi sai, bảng xếp hạng, đấu trường 1v1, thú ảo, chợ đổi Bánh Mì và gói
  Free/Plus/Pro.
- **Quản trị viên:** trang tổng quan; quản lý người dùng, thanh toán, lượt mua gói, mã giảm giá và chợ
  đổi quà; CMS cho nội dung từng kỹ năng, từ điển và đề thi; báo lỗi, góp ý và tin nhắn hỗ trợ.

Không có khóa học, giáo viên hay lớp học (gỡ ngày 01/11/2026). Đường dẫn cũ như `/courses` hay
`/teacher` được chuyển về `/dashboard` (xem `next.config.ts`).

API nằm ở repo `kltn-breadtrans-backend`.

## Công nghệ

| Thành phần | Dùng cho |
|---|---|
| Next.js 16 (App Router, Turbopack), React 19 | Khung ứng dụng |
| TypeScript 5, Tailwind CSS 4 | Mã nguồn và giao diện |
| TanStack Query 5 | Gọi API, cache và làm mới dữ liệu |
| Zustand 5 | Trạng thái phía trình duyệt: đăng nhập, bài thi, thú ảo… |
| Axios | HTTP, một điểm vào duy nhất `src/lib/api/axiosClient.ts` |
| Socket.io client | Đấu trường 1v1 và thông báo thời gian thực |
| Framer Motion | Chuyển động |
| lucide-react | Icon SVG |

## Chạy ở máy

Cần Node.js 22 và backend đang chạy ở `http://localhost:3001`.

```bash
npm install
npm run dev          # http://localhost:3000
```

Tạo file `.env.local` (không commit):

| Biến | Giá trị khi chạy ở máy | Ý nghĩa |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `/api` | Trình duyệt gọi API qua chính domain của web |
| `API_ORIGIN` | `http://localhost:3001` | Địa chỉ backend mà Next.js chuyển tiếp `/api/*` tới |
| `NEXT_PUBLIC_SOCKET_URL` | `http://localhost:3001` | Địa chỉ Socket.io |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | client ID OAuth của Google | Đăng nhập bằng Google |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | khóa công khai VAPID của backend | Thông báo Web Push |

Trình duyệt gọi `/api` trên domain của web, rồi Next.js chuyển tiếp sang `API_ORIGIN`. Nhờ vậy cookie
refresh là cookie cùng domain và chạy được cả trên Safari. Không đặt khóa bí mật nào vào biến
`NEXT_PUBLIC_*`, vì chúng nằm trong mã gửi xuống trình duyệt.

Muốn chạy thêm một dev server thứ hai (ví dụ để kiểm thử) mà không đụng `.next` của server đang chạy,
đặt `NEXT_DIST_DIR` sang một thư mục build khác.

## Kiểm thử

Test dùng trình chạy test có sẵn của Node, không phải Jest. File test là `*.test.ts`, đặt cạnh mã nguồn.

```bash
npm run lint
npm run typecheck
npm run test:ci      # mọi src/**/*.test.ts
npm run ci:check     # lint, typecheck, test:ci, build

# một file
node --no-warnings --test --experimental-strip-types src/lib/diagnostic/diagnosticUiLogic.test.ts

npm run test:responsive-invariants   # scripts/verify_responsive_invariants.mjs
```

Các script `test:*` khác trong `package.json` chạy từng nhóm test riêng.

`npm run build` tốn nhiều RAM. Tắt `npm run dev` trước khi build trên máy cá nhân.

GitHub Actions (`.github/workflows/ci.yml`) chạy `npm ci`, `lint`, `typecheck`, `test:ci` và `build`.

## Cấu trúc thư mục

```
src/
├── app/
│   ├── (public)/        # trang chủ, /help, /privacy, /terms
│   ├── (student)/       # /dashboard, /diagnostic, /listening, /reading, /writing, /speaking,
│   │                    # /vocabulary, /flashcard, /grammar, /toeic, /exams, /mistakes, /ranking,
│   │                    # /arena, /pet, /market, /plans, /notifications…
│   ├── (admin)/admin/   # trang quản trị
│   ├── login/, register/, forgot-password/, reset-password/, change-password/
│   ├── auth/            # callback và trang lỗi đăng nhập Google
│   ├── layout.tsx       # layout gốc và các provider
│   └── globals.css      # Tailwind, token màu, biến thể phone-land và short
├── components/          # thành phần giao diện theo khu vực (practice, toeic, admin, ui…)
├── modules/             # gói tính năng: arena, flashcard, market, pet, ranking, subscription, toeic…
├── lib/
│   ├── api/             # axiosClient.ts và các service gọi backend
│   ├── auth/            # phiên đăng nhập, làm mới token, đăng nhập Google
│   └── …                # logic thuần theo kỹ năng, kèm *.test.ts
├── hooks/, contexts/
└── stores/              # Zustand: authStore, toeicStore, gamificationStore…
```

`axiosClient.ts` gắn access token từ `authStore`. Khi nhiều yêu cầu cùng nhận 401, chúng xếp hàng chờ
một lần làm mới token duy nhất, thay vì mỗi yêu cầu tự làm mới. Khi sửa file này phải giữ nguyên cơ chế
đó.

## Quy ước

- Quy tắc giao diện và tiến độ: `FRONTEND_RULES.md`, `PROJECT_PROGRESS.md`. Cách gọi tên trên giao
  diện: `docs/UI_TERMINOLOGY.md`.
- Icon dùng `lucide-react` với `strokeWidth` thống nhất, không dùng emoji làm icon. Không dùng gradient
  tím, hồng neon. Màu theo nghĩa: xanh dương cho học viên, xanh lục cho thành công, hổ phách cho chờ
  hoặc cảnh báo, đỏ hồng cho lỗi.
- Commit theo Conventional Commits. Nhánh `feature/*`, `bugfix/*` tách từ `develop`.

## Triển khai

Triển khai qua Vercel Git Integration: nhánh `develop` tạo bản Preview, nhánh `main` tạo bản Production.
Trên Vercel đặt `NEXT_PUBLIC_API_URL=/api` và `API_ORIGIN` là địa chỉ công khai của backend. Chi tiết:
`docs/CI_CD_SETUP.md`.

Web chạy như một ứng dụng web responsive, chưa phải PWA cài đặt được (`docs/PWA_STATUS.md`).
