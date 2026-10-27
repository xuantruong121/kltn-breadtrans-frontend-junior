# UI terminology

User-facing names for BreadTrans features. Use one name per feature, in
Vietnamese, in both the learner app and the Admin CMS. Internal class, route,
enum and API names (`CourseLearningV5`, `PUBLISHED`, `/toeic/assessments`)
stay as they are in code and never appear as UI text.

## Features

| Use | Not |
|---|---|
| Bài đánh giá đầu vào | Entry Diagnostic V2, Diagnostic |
| Luyện nghe / Luyện đọc / Luyện nói / Luyện viết | Listening Practice, Speaking Legacy |
| Luyện đề TOEIC | TOEIC Runtime, Assessment V5 |
| Khóa học, Bài học, Bài tập | Course V5, Lesson V5, Activity |
| Thẻ ghi nhớ, Từ vựng, Ngữ pháp | Flashcard deck entity |
| Đấu trường từ vựng | Arena socket |
| Bánh mì, Điểm kinh nghiệm (XP) | BanhRan, points ledger |
| Bài làm, Kết quả, Tiến độ học tập | Attempt, Submission |
| Bản nháp, Đã xuất bản | DRAFT, PUBLISHED |
| Kiểm tra trước khi xuất bản | Readiness, readiness guard |
| Bộ đề (TOEIC Writing), Bộ luyện nói | Set, Practice Set |
| Bản nháp do AI soạn, áp dụng, xem lại | full draft, Apply, review, candidate |

TOEIC, Listening, Reading, Speaking, Writing, Full Test, Part, CEFR, A1–C2, XP,
PLUS, PRO and AI stay as they are.

## Levels and statuses

Display enums through `src/lib/ui/displayLabels.ts`:

- `levelLabel`: BEGINNER → Cơ bản, INTERMEDIATE → Trung cấp, ADVANCED → Nâng cao.
- `statusLabel`: DRAFT → Bản nháp, PUBLISHED → Đã xuất bản, PENDING_GRADING →
  Đang chấm bài, FAILED → Thất bại, and so on. Unknown values pass through.

## Errors

Show API errors through `getApiErrorMessage` (`src/lib/utils/apiError.ts`).
Never render `err.message` from an axios error ("Request failed with status
code 500") or an English API message. The helper keeps a Vietnamese API message
and otherwise gives a status-specific text (network, 400/422, 401, 403, 404,
409, 429, 5xx).

## Copy

- Say what the user can do, in short natural Vietnamese.
- No promotional filler ("thông minh", "toàn diện", "hàng đầu"), no emoji as
  icons, no claims the code does not back (official scores, guaranteed results,
  human grading, a privilege no plan unlocks).
- Keep truthful AI disclosure: "Nhận xét do AI tạo, chỉ để tham khảo."
- Admin cost and AI-job screens may name providers (Gemini, Azure, R2): they
  are billed items and support data there.

`src/lib/ui/uiCopyGuard.test.ts` fails on known internal phrases in UI files;
`scripts/qa/ui-text-audit.ts` in the backend audits rendered text on the
harness.
