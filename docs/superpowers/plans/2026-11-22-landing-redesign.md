# Thiết kế lại trang landing `/`: kế hoạch thực hiện

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Mục tiêu:** dựng lại `src/app/(public)/page.tsx` theo hướng "một hình bánh mì". Tiêu đề dùng Fraunces, chữ đọc dùng Be Vietnam Pro. Màn đầu có phần bấm thử chấm phát âm bằng dữ liệu thật, và mọi phần đều lấy bằng chứng từ giao diện thật.

**Kiến trúc:**
- `page.tsx` thành server component: nạp hai font bằng `next/font`, rồi render `LandingPage` (client).
- `LandingPage` giữ logic đăng nhập và các modal cũ, rồi ghép 8 component phần trong `src/components/landing/`.
- Logic thuần (chia cụm từ, tiến độ sáng, chọn giá) nằm trong `src/lib/landing/*.ts` và có test.
- Ảnh thật nằm trong `public/landing/`, khai báo trong một manifest.

**Tech stack:** Next.js 16 App Router, React 19, Tailwind 4, framer-motion 13, lucide-react. Test chạy bằng Node test runner (`*.test.ts`). Chụp ảnh bằng Playwright và sharp, cả hai đã cài.

**Spec:** `docs/superpowers/specs/2026-11-22-landing-redesign-design.md`

## Ràng buộc chung

- Không thêm dependency. Không three.js, không WebGL.
- Không đổi `AppHeader`, `AppFooter`, `MobileBottomNav` (giữ icon menu). Không đổi font của phần app.
- Font chỉ trong landing:
  - `Fraunces` (`axes: ["SOFT", "opsz"]`, weight 500–800) cho tiêu đề;
  - `Be Vietnam Pro` (400, 500, 700) cho chữ đọc;
  - cả hai `subsets: ["latin", "vietnamese"]`.
- Token màu (scope `.landing`):
  - `--bg #f4efe8`, `--ink #1c1917`, `--muted #57534e`, `--loaf #d97706`, `--crust #b45309`, `--lit #fde68a`, `--surface` (một bậc tông);
  - đủ bộ cho `.dark`.
- Cấm:
  - emoji, nhãn trên tiêu đề, thẻ có ô icon;
  - đánh số 01/02, chữ in hoa giãn chữ cỡ nhỏ;
  - gradient, bóng đổ khi đứng yên, viền mảnh, kính mờ;
  - từ trong tiêu đề tô màu riêng.
- Tiêu đề tối đa 2 dòng ở 1440, 768 và 390. Chữ đọc 18px, không có gì dưới 13px.
- Một hình motif duy nhất: ổ bánh, dạng stadium xoay -8° với các vết khía chéo. Không dùng hình nào khác.
- Không nói quá:
  - không con số học viên, không lời chứng thực, không ETS, không CEFR;
  - đề TOEIC "do BreadTrans biên soạn", điểm là "chỉ số luyện tập".
  - Thuật ngữ: thú ảo, bài đánh giá đầu vào, Free/Plus/Pro, Bánh Mì.
- Chuyển động:
  - chỉ transform và opacity;
  - `prefers-reduced-motion` thì hiện thẳng trạng thái cuối;
  - không nội dung nào kẹt ở trạng thái ẩn.
- Không chạy `next build`. Chỉ kiểm trên dev :3000.
- Commit theo Conventional Commits, không co-author. Không push.

## Review Focus

Năm tình huống mà test đơn vị không bắt hết, xếp từ dễ gặp nhất:

1. **Bật giảm chuyển động:** mọi chữ và ảnh hiện ngay. Test trong Task 2 (`revealProps(true)`) và bước inspect reduced trong Task 6.
2. **Audio không phát được** (R2 lỗi, trình duyệt chặn, bấm dừng giữa chừng): nút trở về "Nghe câu mẫu", vết khía hiện tĩnh với điểm. Test `litChunks` ở duration 0 và NaN trong Task 3, kèm bước kiểm live.
3. **`/plans/catalog` lỗi hoặc chậm:** hiện giá dự phòng ngay, không giật bố cục. Test `planViews(null)` trong Task 5.
4. **Người đã đăng nhập bấm nút chính:** đi thẳng `/dashboard`, không mở modal. Bước kiểm live trong Task 6.
5. **Điện thoại 390 ở chế độ tối:** tiêu đề tối đa 2 dòng, danh sách kỹ năng cuộn ngang bằng ngón tay, chữ đủ tương phản. Chạy `inspect.mjs` ở 390 và chụp chế độ tối trong Task 6.

---

## Thứ tự chạy

```
Task 1 (ảnh thật) ──┐
                    ├─> Task 3 ┐
Task 2 (nền) ───────┤          ├─> Task 6 (gate)
                    ├─> Task 4 ┤
                    └─> Task 5 ┘
```

- Task 1 và Task 2 chạy song song.
- Task 3, 4 và 5 chạy song song: mỗi task chỉ sửa file của riêng nó.
- Task 6 chạy cuối.
- Mỗi task có nhánh riêng tách từ `develop`, worktree đặt ở `D:\Study\KLTN\.wt\` với `node_modules` là junction.

---

### Task 1: Ảnh và đoạn quay màn hình thật

**Files:**
- Tạo: `scripts/landing/capture-landing-assets.mjs`
- Tạo: `public/landing/*.webp`, `public/landing/noi-cham-tu.webm`, `public/landing/noi-cham-tu.jpg`
- Tạo: `src/lib/landing/assets.ts`
- Test: `src/lib/landing/assets.test.ts`

**Interfaces:**
- Produces:

  ```ts
  export type LandingImage = { src: string; width: number; height: number; alt: string };
  export const LANDING_IMAGES: Record<LandingImageKey, LandingImage>;
  export const LANDING_VIDEO: { src: string; poster: string; width: number; height: number; label: string };
  ```

  `LandingImageKey` gồm:
  - `skill-noi`, `skill-nghe`, `skill-doc`, `skill-viet`, `skill-luyen-de`, `skill-flashcard`;
  - `habit-banh-mi`, `habit-thu-ao`, `habit-chuoi-ngay`, `habit-dau-truong`, `habit-xep-hang`, `habit-cua-hang`;
  - `path-danh-gia`, `path-goi-y`, `path-phan-hoi`, `path-luyen-de`.

- [ ] **Step 1: Viết test.** `assets.test.ts`, test "every landing image exists in public/landing with matching size": với mỗi key, file `public/landing/<key>.webp` tồn tại, kích thước đọc bằng `sharp(...).metadata()` bằng `width`/`height` trong manifest, và `alt` không rỗng. Cùng kiểm cho video và poster.
- [ ] **Step 2: Chạy test, phải FAIL.** Lệnh: `node --no-warnings --test --experimental-strip-types src/lib/landing/assets.test.ts`. Mong đợi: FAIL, thiếu module.
- [ ] **Step 3: Viết script chụp.**
  - Playwright Chromium, viewport 1440×900, `deviceScaleFactor: 2`.
  - Đăng nhập student2 (`student2@breadtrans.com` / `Password123!`) qua `/login` trên `http://localhost:3000`.
  - Chụp vùng màn hình của từng key; implementer chọn route và selector, rồi ghi route vào comment manifest.
  - Route gợi ý: `/speaking` (một bài đã có kết quả chấm từng từ), `/listening`, `/reading`, `/writing`, `/exams/2`, `/flashcard`, `/pet`, `/market`, `/arena`, `/ranking`, `/diagnostic`, `/dashboard`.
  - Chuyển sang WebP bằng `sharp` (quality 82, chiều rộng tối đa 1600).
  - Quay `noi-cham-tu.webm` 6–10 giây bằng `recordVideo` khi mở một kết quả bài Nói. Poster `.jpg` là khung đầu.
  - Ảnh đề TOEIC không để lộ con số kiểu "điểm thi".
  - Cuối script đăng xuất phiên: chạy `EMAILS=student2@breadtrans.com node clean-sessions-any.mjs` trong scratchpad, hoặc gọi `POST /auth/logout`.
- [ ] **Step 4: Chạy script, viết `assets.ts`, chạy test, phải PASS.**
- [ ] **Step 5: Xem từng ảnh** bằng Read. Không ảnh nào lộ email thật ngoài tài khoản test.
- [ ] **Step 6: Commit** `feat(landing): real product captures for the landing`.

### Task 2: Nền: tách trang, font, token, hình ổ bánh, helper chuyển động

**Files:**
- Sửa: `src/app/(public)/page.tsx`. Viết lại thành server component: nạp hai font, rồi `<LandingPage className={`${fraunces.variable} ${beVietnam.variable}`} />`.
- Tạo: `src/components/landing/LandingPage.tsx`. `"use client"`, chuyển nguyên `handleProtectedAction`, `openDirectLogin`, `openDirectRegister` và 3 modal từ file cũ.
- Tạo: `src/components/landing/landing.css` (token trong `.landing` và `.dark .landing`, 5 bậc cỡ chữ, khoảng cách giữa phần 160px desktop và 96px điện thoại), import trong `LandingPage.tsx`.
- Tạo: `src/components/landing/Loaf.tsx`.
- Tạo: `src/lib/landing/motion.ts`.
- Test: `src/lib/landing/motion.test.ts`.
- Tạo 7 component phần dạng stub (mỗi file chỉ render một `<section>` có `h2` tạm), để Task 3–5 điền mà không đụng nhau:
  - `LandingHero.tsx`, `SkillsShowcase.tsx`, `HabitTiles.tsx`, `PathFields.tsx`;
  - `PlanPicker.tsx`, `FaqTiles.tsx`, `ActionTile.tsx`, `LoafMark.tsx`.

**Interfaces:**
- Produces:

  ```ts
  // motion.ts
  export function revealProps(reduced: boolean, delayIndex?: number): {
    initial: false | { opacity: number; y: number };
    whileInView?: { opacity: number; y: number };
    viewport?: { once: true; amount: number };
    transition?: { duration: number; delay: number; ease: number[] };
  };
  // Loaf.tsx
  export function Loaf(props: { cuts?: number; litCount?: number; className?: string;
    renderCut?: (index: number, lit: boolean) => React.ReactNode }): JSX.Element;
  // LandingPage context, passed as props to every section that needs it:
  export type LandingActions = {
    register: () => void;
    login: () => void;
    protectedGo: (label: string, route: string) => void;
  };
  ```

  Bên trong mỗi phần dùng `useReducedMotion()` của framer-motion, rồi `revealProps(reduced, i)`.
- [ ] **Step 1: Viết test** cho `revealProps`:
  - `revealProps(true)` có `initial === false` và không có `whileInView`;
  - `revealProps(false, 2)` có `initial` là `{ opacity: 0, y: 24 }` và `transition.delay === 0.15` (bước 75ms).
- [ ] **Step 2: Chạy test, phải FAIL.**
- [ ] **Step 3: Viết `motion.ts`, `Loaf.tsx`, `landing.css`, `LandingPage.tsx`, các stub, và `page.tsx` mới.**
  - `Loaf`: div `border-radius: 9999px`, `rotate(-8deg)`, màu `--loaf`. Vết khía là các phần tử `skewX(-24deg)` màu `--crust`; vết thứ i với `i < litCount` dùng `--lit`. Không bóng, không gradient.
  - `page.tsx` giữ `metadata` của trang nếu đã có.
- [ ] **Step 4: Chạy lại test, phải PASS.** Rồi `npx tsc --noEmit` và `npm run lint`, đều exit 0. Mở `/` trên :3000: trang hiện đủ 8 stub, nút Đăng ký mở modal.
- [ ] **Step 5: Commit** `refactor(landing): split the page, landing fonts, tokens and the loaf motif`.

### Task 3: Màn đầu và phần bấm thử chấm phát âm

**Files:**
- Tạo: `src/lib/landing/speakingDemo.ts`
- Test: `src/lib/landing/speakingDemo.test.ts`
- Sửa: `src/components/landing/LandingHero.tsx`

**Interfaces:**
- Consumes: `Loaf`, `revealProps`, `LandingActions` (Task 2).
- Produces:

  ```ts
  export const DEMO: { exerciseId: 137; submissionId: 309; audioSrc: string; sentence: string;
    overall: 9.6; accuracy: 96; fluency: 94; completeness: 100;
    words: { word: string; score: number }[] };   // 18 từ, đúng thứ tự
  export type WordChunk = { words: { word: string; score: number }[]; weight: number };
  export function chunkWords(words: { word: string; score: number }[], count: number): WordChunk[];
  export function litChunks(currentTime: number, duration: number, chunks: WordChunk[]): number;
  ```

- [ ] **Step 1: Viết test.**
  - `DEMO.words` có đúng 18 phần tử, thứ tự và điểm như sau:

    ```
    The 91 · university 100 · library 97 · is 97 · open 94 · from 100 · Monday 100 · to 97 · Friday 97 ·
    from 97 · eight 97 · in 97 · the 94 · morning 97 · until 97 · ten 91 · at 97 · night. 91
    ```

  - `DEMO.audioSrc === "https://pub-ecd236c9754a4b7cb22ab82189e6ded2.r2.dev/catalog/speaking/reference/137.v2.mp3"`.
  - `chunkWords(DEMO.words, 6)` trả 6 cụm, nối lại thành đúng 18 từ theo thứ tự, mỗi cụm có ít nhất 1 từ, và `weight` là tổng số ký tự.
  - `litChunks`:
    - `(0, 9, chunks)` là 0;
    - `(9, 9, chunks)` là 6;
    - giữa chừng thì tăng đơn điệu;
    - `(5, 0, chunks)` và `(5, NaN, chunks)` là 0.
- [ ] **Step 2: Chạy test, phải FAIL.**
- [ ] **Step 3: Viết `speakingDemo.ts`.**
  - Chia cụm theo số ký tự, gần đều nhau.
  - `litChunks`: tỉ lệ `currentTime / duration` so với `weight` cộng dồn.
  - Ghi chú nguồn dữ liệu: bài 137 thuộc bộ A1 "Borrowing Books from the University Library", lượt nộp 309 của tài khoản học thử, lấy ngày 22/11/2026.
- [ ] **Step 4: Chạy test, phải PASS.**
- [ ] **Step 5: Viết `LandingHero.tsx`** theo spec mục 6.3.
  - `h1` tối đa 2 dòng: chốt câu với copy deck, ví dụ hướng "Nói một câu, chấm từng từ".
  - Câu đỡ, nút chính (`actions.register`), link "Làm bài đánh giá đầu vào" (`actions.protectedGo`).
  - Ổ bánh khổng lồ chứa 6 vết khía. `renderCut` hiện các từ và điểm của cụm khi vết đó sáng.
  - Nút "Nghe câu mẫu" / "Dừng" (cao tối thiểu 44px) điều khiển một `<audio preload="none">`. `timeupdate` cập nhật `litChunks`. `ended`, `error` và `pause` trả nút về trạng thái đầu.
  - Chú thích: "Câu mẫu và điểm từng từ từ một lượt nộp trong BreadTrans". Kèm điểm tổng 9,6/10.
  - Không có JS hoặc bật giảm chuyển động: hiện cả 6 cụm sáng tĩnh.
  - Điện thoại: theo spec, ổ bánh nằm ở dưới.
- [ ] **Step 6: Kiểm.** `npx tsc --noEmit` và `npm run lint` đều exit 0. Trên :3000: bấm phát, các vết sáng theo thứ tự, hết clip thì nút trở về. Chạy `lint.mjs` của skill trên file hero, 0 lỗi.
- [ ] **Step 7: Commit** `feat(landing): hero with the loaf and a real word-by-word scoring demo`.

### Task 4: Ba phần sản phẩm: Kỹ năng, Thứ giữ chân, Lộ trình

**Files:**
- Tạo: `src/lib/landing/content.ts`. Copy deck cho ba phần này, giữ ý `ROADMAP_STEPS` cũ, kể cả câu "không phải chứng chỉ hay cấp độ CEFR".
- Test: `src/lib/landing/content.test.ts`
- Sửa: `SkillsShowcase.tsx`, `HabitTiles.tsx`, `PathFields.tsx`

**Interfaces:**
- Consumes: `LANDING_IMAGES`, `LANDING_VIDEO` (Task 1); `Loaf`, `revealProps` (Task 2).
- Produces:

  ```ts
  export const SKILLS: { key: LandingImageKey; name: string; fact: string }[];
  export const HABITS: …;
  export const PATH: …;
  ```

  Implementer định nghĩa các mảng `HABITS` và `PATH` cùng dạng với `SKILLS`.
- [ ] **Step 1: Viết test.**
  - `SKILLS` là 6 mục theo thứ tự Nói, Nghe, Đọc, Viết, Luyện đề TOEIC, Flashcard.
  - `PATH` có 4 bước theo thứ tự bài đánh giá đầu vào, gợi ý bài luyện, luyện và nhận phản hồi, luyện đề TOEIC.
  - Mọi `key` đều có trong `LANDING_IMAGES`.
  - Không chuỗi nào khớp `/ETS|CEFR [A-C][12]|học viên đã|\d+\s*(nghìn|k)\+? học viên/i`, trừ câu phủ định CEFR của bước đầu.
- [ ] **Step 2: Chạy test, phải FAIL. Step 3: viết `content.ts`. Step 4: chạy test, phải PASS.**
- [ ] **Step 5: Viết `SkillsShowcase.tsx`** (spec 6.4.1).
  - Danh sách tên là các `<button>` có `aria-pressed`. Mũi tên trái, phải và Home, End điều khiển được.
  - Sân khấu là `Loaf` làm khung (clip) cho ảnh của mục đang chọn, crossfade 300ms.
  - Chuyển động chính: lần đầu vào khung nhìn, ảnh mở bằng `clip-path` trong 1,1 giây, ảnh lùi từ scale 1.12 về 1.
  - Điện thoại: tên thành một dòng cuộn ngang.
- [ ] **Step 6: Viết `HabitTiles.tsx`** (spec 6.4.2).
  - 6 ô màu phẳng, một ô rộng gấp đôi.
  - Ô Bánh Mì hoặc ô thú ảo phát `LANDING_VIDEO` (muted, loop, playsInline, có poster).
  - Tên và một câu nằm dưới ô.
- [ ] **Step 7: Viết `PathFields.tsx`** (spec 6.4.3): 4 mảng màu liền nhau, mỗi mảng có ảnh cắt và một mệnh đề 2 dòng. Tiêu đề phần nằm ở mảng đầu.
- [ ] **Step 8: Kiểm.** `npx tsc --noEmit`, `npm run lint`, `node --no-warnings --test --experimental-strip-types src/lib/landing/*.test.ts` đều qua. Chạy `lint.mjs` của skill trên 3 file, 0 lỗi.
- [ ] **Step 9: Commit** `feat(landing): skills, habits and path sections from real screens`.

### Task 5: Gói, Câu hỏi thường gặp, Kêu gọi, Khép trang

**Files:**
- Tạo: `src/lib/landing/plans.ts`
- Test: `src/lib/landing/plans.test.ts`
- Sửa: `PlanPicker.tsx`, `FaqTiles.tsx`, `ActionTile.tsx`, `LoafMark.tsx`
- Tạo: `src/lib/landing/faq.ts`. Chuyển nguyên `FAQ_LIST` cũ sang đây (export `FAQ`), để file riêng cho khỏi đụng `content.ts` của Task 4.

**Interfaces:**
- Consumes: `PublicPlanCatalogResponse` (`src/lib/api/services/plan.service.ts`), `LandingActions`, `Loaf`, `revealProps`.
- Produces:

  ```ts
  export type PlanView = { code: "FREE" | "PLUS" | "PRO"; name: string; priceVnd: number;
    days: number | null; summary: string; moreTerms: boolean };
  export const FALLBACK_PLANS: PlanView[];
  export function planViews(catalog: PublicPlanCatalogResponse | null): PlanView[];
  export function formatVnd(n: number): string;   // "69.000đ"
  ```

  `FALLBACK_PLANS`: Free 0, Plus 69000/30, Pro 149000/30, kèm mô tả trong spec.
- [ ] **Step 1: Viết test.**
  - `planViews(null)` bằng `FALLBACK_PLANS`, thứ tự FREE, PLUS, PRO.
  - Với catalog mẫu (PLUS có `versions` 30/90/180 ngày, giá 69000/186000/331000): PLUS có `priceVnd` 69000, `days` 30, `moreTerms` true; FREE có `days` null.
  - Catalog thiếu PRO thì vẫn trả PRO từ dự phòng.
  - `formatVnd(69000) === "69.000đ"`, `formatVnd(0) === "0đ"`.
- [ ] **Step 2: Chạy test, phải FAIL. Step 3: viết `plans.ts`. Step 4: chạy test, phải PASS.**
- [ ] **Step 5: Viết `PlanPicker.tsx`** (spec 6.4.4).
  - `useQuery({ queryKey: ["landing-plan-catalog"], queryFn: planService.getPublicCatalog, staleTime: 300_000 })`. Hiện `planViews(data ?? null)` ngay, không chờ API.
  - Tên gói là `<button aria-pressed>`, PLUS chọn sẵn.
  - Sân khấu giá không đổi vị trí khi đổi gói. `moreTerms` thì có link "Xem gói 90 và 180 ngày" tới `/plans`.
- [ ] **Step 6: Viết `FaqTiles.tsx`, `ActionTile.tsx`, `LoafMark.tsx`** (spec 6.4.5–6.4.7).
  - FAQ: `<details name="faq">`, tiêu đề sticky ở cột trái, chữ trả lời 17px, rộng tối đa 52ch.
  - `ActionTile` gọi `actions.register`.
  - `LoafMark` dựng chữ BreadTrans từ các khối ổ bánh, đặt trên `AppFooter`, kèm dòng ghi nguồn ảnh nếu có.
- [ ] **Step 7: Kiểm.** `npx tsc --noEmit`, `npm run lint`, test `src/lib/landing` đều qua. Chạy `lint.mjs` trên 4 file, 0 lỗi.
- [ ] **Step 8: Commit** `feat(landing): plans from the public catalog, FAQ, action tile and the loaf mark`.

### Task 6: Gate, chuyển động còn thiếu, kiểm live

**Files:**
- Sửa: chỉ các file `src/components/landing/*` và `src/lib/landing/*` cần sửa theo kết quả đo.

- [ ] **Step 1: Gộp các nhánh Task 1–5 vào một nhánh tích hợp,** rồi chạy `npm run test:ci` (toàn bộ qua), `npx tsc --noEmit` và `npm run lint` (exit 0).
- [ ] **Step 2: Đo.** Chạy `inspect.mjs http://localhost:3000 --out <scratchpad>/landing/after` (nếu trang báo 404 thì `touch` lại `src/app/(public)/page.tsx`).
  - Mong đợi: 0 FAIL do landing gây ra.
  - FAIL do phần dùng chung (`hairline`, `micro-label`, `reduced-hidden` của dropdown, blur của thanh dưới ở 390) ghi riêng là ngoài phạm vi, sau khi kiểm tay rằng landing không góp phần tử nào vào chúng.
  - Kiểm `still-page`: có ít nhất 8 phần tử chuyển động.
- [ ] **Step 3: Xem mọi ảnh chụp** ở 1440, 768, 390 và bản reduced-motion, chấm theo `references/critique.md` §4. Sửa 3 lỗi lớn nhất, đo lại. Tối đa 3 vòng.
- [ ] **Step 4: Kiểm live trên :3000 bằng Playwright,** đi qua từng mục của Review Focus:
  - bật giảm chuyển động;
  - audio: chặn URL R2 bằng `page.route` thì nút trở về trạng thái đầu;
  - chặn `/plans/catalog` thì giá dự phòng hiện ngay;
  - đăng nhập student2 rồi bấm nút chính thì vào `/dashboard`;
  - 390 ở chế độ tối.
  - Đăng xuất các phiên test sau khi xong.
- [ ] **Step 5: Lưu ảnh trước và sau** (1440 và 390, sáng và tối) vào `D:\Study\KLTN\anh-chup\2026-11-22-landing\`.
- [ ] **Step 6: Commit sửa gate, ff-merge vào `develop`, gỡ worktree** (gỡ junction trước). Ghi `Project/AGENT_STATE.md`: số đo trước/sau, các FAIL ngoài phạm vi, nguồn ảnh. `next build`: NOT_RUN.

## Thời gian (ước theo nhịp đã đo hôm nay: mỗi đợt agent song song mất 35–45 phút)

Bản thiết kế ước khoảng 5 giờ là vì tính nối tiếp, làm hết phần này rồi mới tới phần kia. Chạy song song như sơ đồ trên thì rút còn khoảng một nửa:

| Đợt | Việc | Thời gian |
|---|---|---|
| 1 | Task 1 ‖ Task 2 | 35 phút |
| 2 | Task 3 ‖ Task 4 ‖ Task 5 | 45 phút |
| 3 | Task 6: gộp, đo, 3 vòng sửa, kiểm live | 50 phút |
| | Review của tôi giữa các đợt | 15 phút |
| | **Tổng** | **khoảng 2 giờ 25 phút** |
