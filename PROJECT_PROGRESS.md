# Frontend Progress & Architecture (KLTN BreadTrans)

Tài liệu này ghi chép lại toàn bộ tiến độ, kiến trúc và các tính năng đã được xây dựng ở Frontend để AI và các Developer mới có thể nắm bắt dự án ngay lập tức mà không cần đọc toàn bộ code.

**Định vị sản phẩm:** BreadTrans là nền tảng tự học tiếng Anh, rèn luyện từng kỹ năng theo cấp độ và chủ đề, học theo các khóa học có lộ trình sẵn, luyện đề theo nhiều dạng chứng chỉ (trong đó có TOEIC), kết hợp AI, Gamification và theo dõi tiến độ.

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
- **Các khu vực luyện tập theo miền chức năng:**
  - Listening (`/listening`), Reading (`/reading`), Speaking (`/speaking`) và Writing (`/writing`) có route catalog/detail riêng.
  - Luyện đề dùng `/exams` và các route theo format chứng chỉ; format TOEIC hiện có các route dưới `/toeic`. Flashcard dùng `/flashcard`.
  - Không còn namespace learner-facing `/practice`; các runner/review dùng chung được đặt ở `src/components` và route shell canonical.
  - Giao tiếp với API chấm điểm của AI (Gemini) từ Backend.
- **Format TOEIC đang được hỗ trợ (`/toeic`):**
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
- **Đề thi & Bộ câu hỏi (`/admin/quizzes`):** Quản lý ngân hàng câu hỏi theo kỹ năng và format chứng chỉ; hiện có ma trận TOEIC cùng giải thích chi tiết.
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
- **Tra cứu từ trong bài luyện:** Popup hiển thị dữ liệu local ngay, sau đó tải bổ sung IPA US/UK, nhiều loại từ, cách dùng, ví dụ, cụm từ và từ đồng/trái nghĩa qua endpoint progressive `/vocab/lookup/details`; request được hủy khi đổi từ hoặc đóng popup để tránh dữ liệu cũ ghi đè.

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
  3. Bento Grid 4 trụ cột đột phá (Phòng luyện nói AI, luyện đề theo format chứng chỉ với ví dụ TOEIC ETS, Ghi nhớ SRS, Thú cưng học tập).
  4. Widget tương tác trực tiếp: Ước tính lộ trình và mục tiêu điểm theo format đang hỗ trợ.
  5. Lộ trình 4 bước từ củng cố nền tảng đến chinh phục mục tiêu tiếng Anh/chứng chỉ.
  6. Bộ lọc khám phá giáo trình thực chiến (format TOEIC, Giao tiếp công sở, Flashcard).
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

## 5. Learner Course Media Refresh — 2026-10-14
- Đã thay ảnh minh họa của Course 1 bài 2, 3, 4 và Course 8 bài 2, 3, 4, 5, 6, 8 bằng ảnh JPEG từ Pexels, có alt text/provenance trong `CourseLessonMedia`.
- Course 8 bài 1 và 7 được giữ nguyên theo yêu cầu; 9 ảnh mới đã kiểm tra HTTP 200 và `image/jpeg`, không có SVG trong các bài mục tiêu.

## 6. BreadTrans CMS Phase 4.5.1 — Listening closure — 2026-10-14
- Listening CMS browser/API QA đã chạy trên frontend/backend origin cô lập; list/search/status, editor, MCQ options/correct selector, save/reload, Dialogue ownership, empty state và responsive desktop/tablet/mobile đều PASS.
- Giữ nguyên các control Phase 5B `Gợi ý nội dung nghe`, `Tạo câu hỏi nháp` và Production audio; không gọi Gemini trong QA.
- `SkillCmsWorkspace.tsx` đã mở đúng form options/correctIndex cho Listening MCQ, thêm empty state và loại bỏ nút AI trùng. Backend grading dùng canonical `options[correctIndex]`.
- Synthetic fixtures prefix `qa-cms-workflow-listening-final-` đã được dọn sạch; không thay đổi Reading/Speaking/Course hoặc active Listening data.

## BreadTrans CMS Phase 4.5.1 — Reading micro-batch closure — 2026-10-14
- Reading CMS editor now persists the current passage with each authored question and exposes human-readable Reading micro-skill labels while keeping canonical A/B/C/D answer selection.
- Reading list/editor lifecycle, search/status filters, empty state, question ownership, save/reload, learner answer security and grading were verified with isolated API/browser fixtures.
- Phase 5A Reading AI controls remain review-first and local-only until explicit save; AI question requests use the current editor passage.
- Isolated responsive browser QA passed at 1440x900, 768x1024 and 390x844. Synthetic Reading fixtures were cleaned up and active Reading content was unchanged.

## 7. BreadTrans Phase 8.7 — AI Authoring Discoverability — 2026-10-15
- Admin overview now provides the navigation-only `AI hỗ trợ soạn nội dung` entrypoint to the existing Course, Listening, Reading, Writing, Vocabulary, Grammar and Exam Studios; Speaking is deliberately absent.
- Copy makes the human workflow explicit: AI returns a suggestion/draft only; Admin reviews/edits, saves in the authoritative Studio, then publishes manually. No extra writer, persistence path or provider was introduced.
- Contextual controls use the consistent `AI gợi ý ...` pattern. Exam scope remains TOEIC Part 5 only; Writing does not claim AI creates Picture media.

## 8. BreadTrans Phase 8.8 — Speaking Contextual AI Authoring — 2026-10-15
- `/admin/speaking` now exposes real review-first actions inside the existing set/exercise dialogs: `AI gợi ý bộ luyện` and `AI gợi ý câu luyện`. They call the Admin-only contextual AI endpoints and never save or publish directly.
- Set review edits only persisted set fields (`title`, `description`, `category`, `level`). Exercise review edits/excludes text-only candidates (`title`, `targetText`, `difficulty`) and keeps the parent category inheritance unless Admin explicitly overrides it in the authoritative form.
- Review overlays use named dialogs, visible keyboard focus states, explicit close controls and responsive scroll bounds. Copy distinguishes AI draft, local apply, human save and manual publish; no audio/media controls were introduced.
- Global `/admin` AI authoring entrypoint now includes Speaking because the real authoring capability is available. Frontend typecheck/build and `test:ci` 498/498 pass; lint exit 0 with only the existing repository-wide warning baseline.
- Authenticated owner-runtime closure passed after the owner backend returned on `:3001`: Admin overview → Speaking, set/exercise AI review/edit/exclude/local Apply, 503 form preservation, Save child Draft, learner isolation, human publish and learner browser readback passed at desktop/tablet/mobile. No real AI/audio/Azure operation occurred; all `qa-phase8-8-speaking-` data was removed.

## 9. BreadTrans Phase 8.8.1 — CMS Contract Consistency & Full-Draft AI Authoring — 2026-10-15
- Chuẩn hóa UI contract Speaking theo dữ liệu thực: parent dùng CEFR range/category riêng; child dùng difficulty riêng; không còn mapping giả level/difficulty. Full-draft Speaking có parent + 1–10 câu, mặc định 5.
- `SkillCmsWorkspace` có full-draft review-first cho Listening và Reading; Vocabulary có topic + 1–30 từ nháp, Grammar có topic metadata + 1–20 câu nháp. Apply chỉ cập nhật local; Save mới gọi CMS writer để tạo Draft.
- Course giữ workflow phân loại curriculum hiện có; Writing giữ single-task AI suggestion; Exam vẫn chỉ TOEIC Part 5. Dashboard mô tả đúng capability từng Studio.
- Vocab level được hiển thị rõ là context cho AI, không tuyên bố là trường lưu của `VocabTopic`; Listening/Reading editor cũng ghi rõ level là reference/context theo contract domain.
- Frontend `test:ci` 42 suites/498 tests, typecheck và build PASS; lint exit 0 với warning baseline repository, không có error mới từ thay đổi này.
- Authenticated owner-runtime browser QA đã đi qua Generate → Review → Apply cho Listening, Reading, Vocabulary, Grammar và Speaking ở desktop/tablet/mobile; Apply chỉ cập nhật form local, request trước Save chỉ là AI mock và không có CMS persistence. Level/Difficulty trong review được kiểm chứng là controlled select; không overflow ở `1440x900`, `768x1024`, `390x844`. Existing Speaking lifecycle browser evidence tiếp tục giữ Save → Draft → learner isolation → Human Publish → learner readback.

## 10. BreadTrans Phase 8.13 — Admin CMS UX & Functional Audit — 2026-10-20
- Source-first inventory đã phân loại toàn bộ 37 route `/admin/**`; sidebar giữ product object chính, còn route legacy/internal và TOEIC child composition chỉ truy cập deep-link.
- Admin UI thay emoji bằng Lucide/vector icon hoặc text, thêm skip link/landmark/aria label cho navigation, clamp trang hiển thị ở User Management và loại bỏ trigger direct publish cũ khỏi `/admin/ai-tools`.
- Frontend typecheck, changed-file lint, build và responsive invariants 22/22 PASS. Full `test:ci` còn một failure baseline ở `AccountHub` alias-cleanup test ngoài phạm vi; không sửa dirty unrelated changes.

## 11. BreadTrans Phase 8.13.1 — Authenticated Admin Browser Closure — 2026-10-20
- Owner FE `:3000` và BE `:3001` giữ đúng một listener mỗi cổng; không restart/kill/spawn owner process. Browser xác nhận FE hiện tại có skip link, `main#admin-main`, navigation aria-label, sidebar IA và User Management pagination/icon patch.
- Authenticated Admin browser walkthrough PASS cho product routes và Course Studio; synthetic Course create → validation → edit/save → reload persisted PASS. Synthetic V5 publication/enrollment flow PASS; duplicate enrollment trả `409` đúng validation và revoke PASS.
- Exam CMS choices TOEIC L&R, TOEIC S&W và TOEIC 4-skills; readiness, preview và `0` learner-attempt mutation PASS. AI mock safe smoke đi qua candidate → review → draft save; không có direct publish request/button và không gọi provider thật. AI Course Authoring giữ `PARTIAL`.
- User Management, learner tracking, enrollment, payment, unauthenticated/learner permission denial, desktop/tablet/mobile và accessibility PASS. Critical browser/runtime errors `0`; QA prefix `qa-phase813-admin-` cleanup về `0` user/0 course.
- **Classification**: `BREADTRANS_ADMIN_CMS_READY=true`; `PHASE_8_13=CLOSED`.

## 12. BreadTrans Phase 8.14 — AI Exam Candidate / Apply Safety — 2026-10-20
- `/admin/exams/new` now restores a durable AI job from `?job=` or session storage, keeps one idempotency key for a user generation action, and presents `Apply candidate vào Draft` only after the backend marks a candidate ready.
- Apply is explicit and separate from Publish: the candidate is written to the Draft first, then Admin uses the established review/edit/validate/preview/publish workflow. Frontend typecheck, changed-file lint and production build PASS.
- Owner-runtime browser closure PASS: a fresh Playwright Admin logged in through the real manual UI, restored a durable job from `?job=`, saw and used `Apply candidate vào Draft`, then landed in the linked Draft. BE persisted `APPROVED`, one Part 5 group and one question; browser page errors were `0`. The earlier blank shell came from pre-hydration store injection, not the running owner FE. The temporary `qa-phase814-ai-exam-` fixture was fully removed (`0` user / `0` exam / `0` job) and created no media.

## 13. BreadTrans Phase 8.14.1 — AI Exam Authoring Production Closure — 2026-10-20
- The durable candidate/apply workflow remains explicit: one job, `Apply candidate vào Draft`, then normal Admin review, edit, preflight, preview and human Publish.
- Owner-runtime browser QA passed candidate Apply, edit/reload persistence, `INCOMPLETE_TEMPLATE` feedback, preview and publish block without learner attempts. Guest/learner server access is denied; `qa-phase814-ai-exam-` was fully removed.
- Frontend typecheck, focused ESLint and production build PASS. Backend now preserves S&W text/tasks under an AI-image soft failure and blocks learner readiness until required image media is repaired manually; full evidence is in `AGENT_STATE.md`.

## 14. Course / Lesson Studio Authoring UX Upgrade — 2026-10-21
- Course Studio giữ phạm vi metadata/cover/curriculum/readiness; overview có layout cover gọn hai cột và lesson row cho biết ngay nội dung, bài luyện tập, ảnh tùy chọn và trạng thái hoàn thiện.
- Lesson Studio trở thành Canvas theo thứ tự học: block có nhãn tiếng Việt, chèn giữa các block, outline gọn, summary Guided Practice/Final Check, drawer soạn nội dung có bullets/examples và không hiển thị JSON.
- AI hỗ trợ chuyển sang menu theo phần thiếu; backend trả candidate scope riêng cho Sections, Guided Practice hoặc Final Check và UI cho chọn phần trước Apply. Candidate vẫn không tự ghi Draft/Publish.
- Runtime QA Course 17 và IPA legacy PASS sau khi owner BE restart; Course 17 giữ DRAFT, không có Gemini/media call hoặc dữ liệu demo mới.
