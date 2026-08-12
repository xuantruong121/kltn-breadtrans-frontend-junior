# Frontend Progress & Architecture (KLTN BreadTrans)

Tài liệu này ghi chép lại toàn bộ tiến độ, kiến trúc và các tính năng đã được xây dựng ở Frontend để AI và các Developer mới có thể nắm bắt dự án ngay lập tức mà không cần đọc toàn bộ code.

## 1. Tech Stack
- **Framework:** Next.js 16 (App Router, Turbopack)
- **Styling:** Tailwind CSS v4, Framer Motion (Animations)
- **State Management:** Zustand (Stores: `authStore`, `toeicStore`)
- **Data Fetching:** Axios (configured in `src/lib/api/axiosClient.ts`) + React Query
- **Icons:** Lucide React

## 2. Các Module Đã Hoàn Thành (Tính đến hiện tại)

### A. Hệ Thống Xác Thực (Authentication)
- Hoàn thiện trang Login (`src/app/page.tsx`).
- Xử lý JWT (Access Token, Refresh Token) lưu trữ qua `authStore` và interceptor của `axiosClient`.
- Phân quyền (Role-based Routing): 
  - `STUDENT` vào thẳng `/dashboard`.
  - `TEACHER` & `ADMIN` được tự động chuyển hướng vào `/admin/users`.

### B. Khu Vực Học Sinh (Student - B2C)
**Layout chung:** `src/app/(student)/layout.tsx` sử dụng thiết kế Bento Grid, bo góc lớn, phối màu rực rỡ (Glassmorphism), có Sidebar điều hướng và `FloatingAiTutor` tích hợp.
- **Dashboard (`/dashboard`):** Hiển thị tổng quan lớp học, streak, điểm số gamification.
- **Lớp học (`/courses` & `/courses/[courseId]`):** Danh sách khoá học, chi tiết lớp học. Đã xử lý hiển thị nút "Tham gia Meet" tự động nếu API trả về `meetingLink`.
- **Đảo Luyện Tập (`/practice`):**
  - Làm Quiz Trắc nghiệm.
  - Luyện Nói (`/practice/speaking`) & Luyện Viết (`/practice/writing`).
  - Giao tiếp với API chấm điểm của AI (Gemini) từ Backend.
- **Luyện thi TOEIC (`/toeic`):**
  - Nằm chung trong Student Layout để đồng bộ UI.
  - State quản lý bài làm (`toeicStore.ts`) với tính năng: Đếm giờ (đồng bộ Server), Auto-save (Debounce), Backup LocalStorage.
  - Phòng thi 200 câu (`/toeic/exam/[examId]`).
  - Phân tích đáp án (`/toeic/result/[attemptId]`).

### C. Khu Vực Quản Trị (Admin / Teacher - CMS)
- **Layout chung:** `src/app/(admin)/layout.tsx` phong cách Dashboard quản trị chuẩn.
- **Quản lý Users (`/admin/users`):** Bảng danh sách học sinh, bộ lọc, phân trang.
- **Quản lý Khoá Học (`/admin/courses`):** Danh sách lớp học, hỗ trợ icon `BookOpen` trực quan.

## 3. Quy Ước Kiến Trúc (Architecture Rules)
- Mọi route của Học Sinh phải nằm trong `(student)` để thừa hưởng UI.
- Mọi route của Quản Trị phải nằm trong `(admin)`.
- Không sử dụng trực tiếp Fetch/Axios trong Component mà nên bọc bằng `@tanstack/react-query` và sử dụng instance từ `axiosClient` (đã đính kèm token).
- Animation sử dụng thư viện `framer-motion` nhưng phải tránh dùng biến client (như `useReducedMotion`) vào prop `initial` của component SSR để tránh lỗi **Hydration Mismatch**.

## 4. Work in Progress / Next Steps
- Cài đặt hệ thống Test Tự động E2E (Playwright) để kiểm thử luồng FE.
- Cải thiện UX phần CMS Admin.
