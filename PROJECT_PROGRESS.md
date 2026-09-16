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
  - `STUDENT` (Học viên) vào thẳng `/dashboard`.
  - `ADMIN` (Quản trị viên) được tự động chuyển hướng vào `/admin`.

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

### C. Khu Vực Quản Trị Hệ Thống (Admin CMS)
- **Layout chung:** `(admin)` có cơ chế chống lỗi Hydration của Zustand (chờ `useSyncExternalStore` / `isReady`) trước khi bảo vệ route. Hệ thống tinh gọn tối ưu với 2 vai trò chuẩn: `ADMIN` và `STUDENT`.
- **Tổng quan (`/admin`):** Bảng dashboard thống kê tổng số học viên, doanh thu, khóa học và các chỉ số hoạt động.
- **Quản lý Học viên & Người dùng (`/admin/users`):** Bảng danh sách người dùng, phân quyền, trạng thái tài khoản, bộ lọc và phân trang.
- **Quản lý Khóa học & Gói học (`/admin/courses`):** Quản lý toàn diện cây nội dung khóa học, các gói học/lớp học, tài liệu giảng dạy, bài giảng và xuất bản.
- **Cấp quyền Khóa học (`/admin/enroll`):** Combobox tìm kiếm gom nhóm theo khóa học, cấp quyền học viên đơn lẻ hoặc hàng loạt, thu hồi quyền an toàn với cơ chế bảo vệ giao dịch (Delete Guards).
- **Thanh toán Gói học (`/admin/payments`):** Đối soát biên lai chuyển khoản, xác nhận thanh toán và tự động kích hoạt ghi danh học viên tức thì.
- **Đề thi & Bộ câu hỏi (`/admin/quizzes`):** Quản lý ngân hàng câu hỏi TOEIC, ma trận đề thi và giải thích chi tiết.
- **Bài tập & Chấm điểm (`/admin/assignments`):** Quản lý bài tập nói, viết và hệ thống chấm tự động AI.
- **Luyện phát âm & AI Tools (`/admin/speaking`, `/admin/ai-tools`):** Công cụ biên soạn hội thoại và trợ lý giọng nói.
- **Vận hành & Giám sát Chi phí (`/admin/costs`):** Giám sát chi phí token AI (Gemini), tỷ lệ cache hit, dung lượng lưu trữ Cloudflare R2, thao tác dọn dẹp cache và FinOps.

### D. Hệ Thống Hồ Sơ (Profile)
- **Backend API:** `GET /users/profile` và `PATCH /users/profile` xử lý update Avatar, Full Name, Phone, Target Score... bằng model `Profile` (One-to-One với `User`).
- **Frontend UI (`/profile` chung):** Giao diện Profile Settings. Dữ liệu `profile` được đính kèm vào response đăng nhập và lưu trong `authStore`. Sidebar tự động hiển thị Avatar và Full Name (nếu có) thay vì Email.

### E. Dữ Liệu Học Tập Thật — Ngữ pháp & Flashcard
- **Ngữ pháp (`/grammar`):** Bỏ dữ liệu static/localStorage; lấy chủ đề, câu hỏi và kết quả từ `GrammarTopic`, `GrammarQuestion`, `GrammarAttempt` qua React Query. Chỉ backend chấm điểm và cấp thưởng.
- **Flashcard (`/flashcard`):** Bỏ sách Flashcard 3D mock; dùng trực tiếp `VocabTopic`, `VocabWord`, `UserVocabWordProgress`. Tiến độ đã thuộc/yêu thích được lưu theo user ở backend.
- **Seed:** `prisma/seed.ts` có nội dung từ vựng và ngữ pháp thực, thay cho các bản ghi placeholder dạng đánh số.
- **Luyện nói:** Cụm nghe mẫu có nút nghe icon-only, chuyển tốc độ 0.75×/0.9×/1× và đổi giọng US/UK bằng Web Speech API.

### F. Dữ Liệu Thật — Lịch sử, kiểm tra đầu vào và nội dung học
- **Kiểm tra đầu vào (`/diagnostic`):** Câu hỏi được tải từ backend; đáp án đúng không được đưa xuống trước khi nộp. Backend chấm, lưu `DiagnosticAttempt` và ghi hoạt động học.
- **Lịch sử (`/history`):** Lấy `LearningActivity` và tóm tắt từ API, không còn danh sách minh họa tĩnh.
- **Học qua phim/nhạc:** Câu trả lời được gửi đến backend để chấm và ghi `ContentAttempt`; Bánh Mì được cộng trong transaction server, không cộng qua Zustand ở trình duyệt.
- **Cửa hàng và huy hiệu:** Catalog, số dư, đơn đổi quà, bảng xếp hạng và huy hiệu đã đạt dùng API. UI không còn tự mở khóa hay trừ Bánh Mì từ state client.

### G. Tái Thiết Kế Toàn Diện Landing Page (`/` — Public Home)
- **Tách biệt bản sắc UI/UX:** Xóa bỏ hoàn toàn bố cục wireframe trùng lặp với `/dashboard`. Biến `/` thành một Landing Page EdTech SaaS đẳng cấp, sinh động, chuẩn Taste Skill & UI/UX Pro Max.
- **10 Phân khu nội dung hoàn chỉnh:**
  1. Hero bất đối xứng (Anti-center bias) tích hợp Card mô phỏng Live AI Pronunciation (sóng âm, chấm âm vị 98%, floating badges).
  2. Dải số liệu uy tín (50.000+ học viên, 200+ bộ đề ETS, 94.8% tăng điểm, 4.9/5).
  3. Bento Grid 4 trụ cột đột phá (Phòng luyện nói AI, Đấu trường TOEIC ETS, Ghi nhớ SRS, Thú cưng học tập).
  4. Widget tương tác trực tiếp: Ước tính lộ trình & điểm số TOEIC theo trình độ và mục tiêu.
  5. Lộ trình 4 bước từ mất gốc đến chinh phục 850+ TOEIC.
  6. Bộ lọc khám phá giáo trình thực chiến (TOEIC, Giao tiếp công sở, Flashcard).
  7. Câu chuyện thành công & Đánh giá chân thực từ học viên.
  8. Bảng đối chiếu so sánh: Học truyền thống vs Tự học vs BreadTrans AI.
  9. FAQ Accordion giải đáp thắc mắc thường gặp.
  10. Bottom CTA Banner kích thích chuyển đổi (tặng 50 Bánh Mì tân thủ).

### H. Hệ Thống Thú Cưng Học Tập Đồng Hành (Companion Pet Module & Focus Mode)
- **Kiến trúc Runtime (`useCompanionPetRuntime`):** Quản lý vòng đời dữ liệu thú cưng, đồng bộ số dư Bánh Mì, nhiệm vụ hôm nay và trạng thái cho ăn.
- **Cơ chế Chế Độ Tập Trung (`LearningFocusMode`):** Tự động phát hiện môi trường làm bài thi, luyện tập chuyên sâu để ẩn hoàn toàn thú cưng nổi và trợ lý AI, chống xao nhãng học viên.
- **Widget Thú Cưng Nổi (`FloatingCompanionPet`):** 4 trạng thái máy hữu hạn (`COLLAPSED`, `MESSAGE`, `EXPANDED`, `HIDDEN`). Gợi ý bài học ngữ cảnh, cho ăn tại chỗ, thanh tiến trình EXP chuẩn hóa (1.000 EXP / cấp).
- **Sân khấu Thú Cưng 2D & 3D (`/pet`):** Tương tác hoạt họa cảm xúc (vui vẻ, đói, no, lên cấp), hệ thống chủng loài thú cưng và đổi trang phục.

### I. Cải Tiến CMS Quản Trị & Vận Hành (Admin CMS & Operations)
- **Cấp Quyền Truy Cập Khóa Học (`/admin/enroll`):** Combobox gom nhóm theo khóa học, tìm kiếm đa trường, cấp quyền đơn lẻ hoặc hàng loạt, modal xác nhận thu hồi và xử lý lỗi ràng buộc thanh toán (409 Conflict).
- **Giám Sát Chi Phí & Tối Ưu Hệ Thống (`/admin/costs`):** Giám sát chi phí token AI (Gemini), tỷ lệ cache hit, dung lượng lưu trữ Cloudflare R2, thao tác dọn dẹp cache và tối ưu FinOps.
- **Hệ Thống Điều Hướng Đa Tầng (Adaptive Navigation):** Header áp dụng Priority+ Navigation (thu gọn linh hoạt vào menu "Khác ⌄"), ngăn chặn tràn chữ trên màn hình laptop và tablet.

## 3. Quy Ước Kiến Trúc (Architecture Rules)
- Mọi route của Học Sinh nằm trong `(student)` để thừa hưởng UI học tập.
- Mọi route của Quản Trị viên nằm trong `(admin)`.
- Hệ thống chỉ duy trì 2 vai trò cốt lõi: `STUDENT` và `ADMIN`.
- Không sử dụng trực tiếp Fetch/Axios trong Component mà nên bọc bằng `@tanstack/react-query` và sử dụng instance từ `axiosClient` (đã đính kèm token).
- Cần chú ý lỗi **Hydration Mismatch**:
  - Với Animation (Framer Motion): Tránh dùng biến client (`useReducedMotion`) vào prop `initial`.
  - Với Zustand (Persist): Khi cần check Auth trong Layout, phải chờ cờ `isReady` (chờ hook `onFinishHydration` của persist) thay vì check `user` ngay từ lần render đầu tiên, tránh việc đá user ra login màn hình khi F5.

## 4. Work in Progress / Next Steps
- Cài đặt hệ thống Test Tự động E2E (Playwright) để kiểm thử luồng FE.
- Cải thiện UX phần CMS Admin và tích hợp nốt Quản lý Đề thi / AI Tools.
