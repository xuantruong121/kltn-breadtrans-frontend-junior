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

### C. Khu Vực Quản Trị & Giáo Viên (Admin / Teacher - CMS)
- **Layout chung:** Tách biệt layout cho `(admin)` và `(teacher)`. Cả hai đều có cơ chế chống lỗi Hydration của Zustand (chờ `useAuthStore.persist.onFinishHydration`) trước khi bảo vệ route.
- **Admin (`/admin`):**
  - Quản lý Users (`/admin/users`): Bảng danh sách học sinh, bộ lọc, phân trang.
  - Quản lý Khóa Học (`/admin/courses`): Hiển thị danh sách, phân trang theo Tab (Đã xuất bản, Chờ duyệt, Bị từ chối). Cung cấp nút Duyệt/Từ chối và nút Xóa khóa học.
  - Các module `quizzes` và `ai-tools` hiện đang là trang "Coming Soon" (Placeholder).
- **Teacher (`/teacher`):**
  - Quản lý Khóa học (`/teacher/courses`): Cho phép Giáo viên soạn giáo trình, tạo Khóa học (DRAFT) để Admin duyệt.
  - Quản lý Lớp học (`/teacher/classes`): Mô hình Khóa học Hybrid - chia lớp học ra thành các **Buổi học (Session)**. Quản lý thời gian, link Meet cụ thể cho từng Session thay vì gộp chung.

### D. Hệ Thống Hồ Sơ (Profile)
- **Backend API:** `GET /users/profile` và `PATCH /users/profile` xử lý update Avatar, Full Name, Phone, Target Score... bằng model `Profile` (One-to-One với `User`).
- **Frontend UI (`/profile` chung):** Giao diện Profile Settings. Dữ liệu `profile` được đính kèm vào response đăng nhập và lưu trong `authStore`. Sidebar tự động hiển thị Avatar và Full Name (nếu có) thay vì Email.

## 3. Quy Ước Kiến Trúc (Architecture Rules)
- Mọi route của Học Sinh phải nằm trong `(student)` để thừa hưởng UI.
- Mọi route của Quản Trị phải nằm trong `(admin)` và của Giáo viên nằm trong `(teacher)`.
- Không sử dụng trực tiếp Fetch/Axios trong Component mà nên bọc bằng `@tanstack/react-query` và sử dụng instance từ `axiosClient` (đã đính kèm token).
- Cần chú ý lỗi **Hydration Mismatch**:
  - Với Animation (Framer Motion): Tránh dùng biến client (`useReducedMotion`) vào prop `initial`.
  - Với Zustand (Persist): Khi cần check Auth trong Layout, phải chờ cờ `isReady` (chờ hook `onFinishHydration` của persist) thay vì check `user` ngay từ lần render đầu tiên, tránh việc đá user ra login màn hình khi F5.

## 4. Work in Progress / Next Steps
- Cài đặt hệ thống Test Tự động E2E (Playwright) để kiểm thử luồng FE.
- Cải thiện UX phần CMS Admin và tích hợp nốt Quản lý Đề thi / AI Tools.
