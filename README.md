# KLTN BreadTrans - Frontend Junior

Dự án Frontend dành cho nền tảng học tiếng Anh trực tuyến tích hợp AI (KLTN BreadTrans). Hệ thống được chia thành 3 phân quyền chính: **Student**, **Teacher**, và **Admin**.

## Công nghệ sử dụng (Tech Stack)
- **Framework**: Next.js 16 (App Router, Turbopack)
- **Styling**: Tailwind CSS v4
- **Animation**: Framer Motion (Glassmorphism, mượt mà)
- **State Management**: Zustand
- **Data Fetching**: Axios & React Query
- **Testing**: Playwright (E2E Testing)
- **Icon**: Lucide React

## Cấu trúc thư mục (App Router)
- `(student)`: Các trang dành cho Học sinh (Dashboard, Practice, TOEIC...). Giao diện mang phong cách Bento Grid, gam màu tươi sáng, thân thiện.
- `(teacher)`: Các trang dành cho Giáo viên quản lý lớp học.
- `(admin)`: Dashboard CMS cho Quản trị viên hệ thống.

## Hướng dẫn cài đặt & chạy dự án

1. **Cài đặt thư viện:**
   ```bash
   npm install
   ```

2. **Chạy Môi trường Phát triển (Development):**
   ```bash
   npm run dev
   ```
   Dự án sẽ khởi chạy tại [http://localhost:3000](http://localhost:3000).

## Kiểm thử tự động (E2E Testing với Playwright)

Dự án đã được tích hợp Playwright để tự động hoá việc kiểm thử giao diện và luồng nghiệp vụ. 

### Cách chạy Test:
1. **Chạy test luồng Auth (Đăng nhập, Phân quyền) với giao diện Browser (khuyên dùng):**
   ```bash
   npx playwright test tests/auth.spec.ts --headed
   ```
   
2. **Chạy toàn bộ các test ẩn (Headless) ở chế độ tuần tự:**
   *(Ghi chú: Nên chạy `--workers=1` để tránh lỗi mock API khi test song song)*
   ```bash
   npx playwright test --workers=1
   ```

3. **Xem báo cáo HTML chi tiết sau khi test:**
   ```bash
   npx playwright show-report
   ```

## Tài liệu tham khảo
- Mọi logic thiết kế (Design System) và quy ước code đều được ghi chú rõ trong thư mục tài liệu dự án, vui lòng đọc kỹ `PROJECT_PROGRESS.md` trước khi code thêm tính năng mới.
