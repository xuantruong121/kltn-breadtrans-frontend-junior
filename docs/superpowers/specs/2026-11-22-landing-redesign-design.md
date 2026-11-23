# Thiết kế lại trang landing `/` (22/11/2026)

## 1. Mục đích

Trang chủ công khai (`src/app/(public)/page.tsx`, 856 dòng) đang mang dáng "trang do AI làm". Trình kiểm của skill `design-taste-frontend` đo trên :3000 và báo **17 FAIL, 7 WARN**:

- nhãn nhỏ đặt trên tiêu đề ("TÍNH NĂNG CHÍNH");
- thẻ có ô icon, đánh số 01–04, bóng đổ, viền mảnh;
- chữ nhỏ hơn 13px, chữ thân 14px;
- không có hình thật nào; màn đầu không có điểm nhấn;
- tiêu đề hero dài 16 từ, xuống 3 dòng trên điện thoại.

Không phải lỗi nào trong số đó cũng do phần landing. Một số do thanh menu và chân trang dùng chung gây ra (xem mục 7).

Ảnh "before" nằm trong scratchpad của phiên.

Trang này phục vụ hai nhóm người xem:

- **Trước hết là hội đồng bảo vệ KLTN.** Họ cần thấy sản phẩm có chiều sâu và nhớ được nó.
- **Sau đó là người học thật.** Họ cần hiểu BreadTrans là gì, miễn phí tới đâu, và bấm đăng ký.

## 2. Mục tiêu, không làm, phản mục tiêu

**Mục tiêu**

- Màn đầu nói rõ trong 5 giây: BreadTrans là gì và nên làm gì tiếp.
- Một thứ người xem tự bấm thử được: chấm phát âm từng từ, dùng dữ liệu thật.
- Mỗi phần trên trang có bằng chứng là giao diện thật của sản phẩm, không phải hình minh hoạ chung chung.
- Chạy `inspect.mjs` ra 0 FAIL do phần landing gây ra, ở cả ba khổ 1440, 768 và 390. Các FAIL do thanh menu và chân trang dùng chung gây ra được tính riêng, xem mục 7.

**Không làm**

- Không đổi thanh menu dùng chung (`AppHeader`), kể cả icon trước mỗi mục. Chủ dự án đã chốt giữ nguyên.
- Không đổi `AppFooter`.
- Không đổi font của phần app sau khi đăng nhập.
- Không thêm thư viện mới. Không dùng three.js hay WebGL.

**Phản mục tiêu.** Trang bị coi là hỏng dù vẫn chạy được, nếu:

- trông lại giống mẫu template (thẻ icon, nhãn trên tiêu đề, gradient, kính mờ);
- giật hoặc khựng khi trình chiếu lúc bảo vệ;
- nói quá sự thật: con số học viên, lời chứng thực, ETS, CEFR, "điểm thi thật".

## 3. Ràng buộc

- **Stack hiện có:** Next.js 16 App Router, React 19, Tailwind 4 (`@custom-variant dark` theo class `.dark`, `ThemeProvider`), `framer-motion` 13, `lucide-react`.
- **Giữ nguyên hành vi:**
  - `handleProtectedAction`: đã đăng nhập thì đi thẳng tới trang, chưa đăng nhập thì mở `AuthGateModal`.
  - `QuickLoginModal` và `QuickRegisterModal`.
  - Link tới `/dashboard`, `/plans`, `/help`, bài đánh giá đầu vào.
- **Nội dung không được nói quá.** Giữ ý của các chú thích trong file cũ: không con số học viên, không lời chứng thực, đề do BreadTrans biên soạn, điểm chỉ là chỉ số luyện tập, không phải chứng chỉ hay cấp độ CEFR. Dùng thuật ngữ của chủ dự án: thú ảo, bài đánh giá đầu vào, Free/Plus/Pro, Bánh Mì.
- **Luật giao diện của dự án** (`.agents/rules/anti-ai-slop.md`, `uiConsistency.test.ts`) và house rules của skill:
  - không emoji, không nhãn trên tiêu đề, không thẻ icon, không gradient, không bóng đổ khi đứng yên, không viền mảnh;
  - không đánh số 01/02/03, không chữ in hoa giãn chữ cỡ nhỏ;
  - tiêu đề tối đa 2 dòng ở mọi khổ.
- **Nút cam chữ trắng** là quyết định của chủ dự án. Giữ nguyên, không nêu lại.
- **Không chạy `next build`** vì từng làm treo máy. Chỉ kiểm trên dev :3000 bằng trình kiểm của skill.
- **Hiệu năng khi trình chiếu:** chỉ animate transform và opacity, có bản dự phòng khi bật `prefers-reduced-motion`. Ảnh dùng `next/image` hoặc `<img>` có kích thước cố định; ảnh dưới màn đầu tải lười.

## 4. Các cách đã xét

| Cách | Nội dung | Đánh đổi |
|---|---|---|
| **1. Chỉ dùng Framer Motion có sẵn (đã chọn)** | Chuyển động theo cuộn, mảnh giao diện thật, phần bấm thử chấm phát âm | Không thêm thư viện, nhẹ, chắc mượt khi trình chiếu |
| 2. Cách 1 + hiệu ứng WebGL bằng OGL (~13 KB gz) | Dải sóng âm shader ở màn đầu, tải sau cùng | Thêm một thư viện, rủi ro trình duyệt máy chiếu |
| 3. Cách 1 + three.js / React Three Fiber | Cảnh 3D (thú ảo, ổ bánh) | ~150 KB gz trở lên, chưa có model 3D, nguy cơ khựng; loại |

Chủ dự án chọn **cách 1**: "nếu threejs làm nặng ảnh hưởng quá nhiều đến trải nghiệm thì bỏ qua".

## 5. Những gì chủ dự án đã quyết

- **Người xem:** cả hai nhóm, ưu tiên hội đồng bảo vệ.
- **Cách làm:** cách 1.
- **Font (phương án C):** **Fraunces** cho tiêu đề (`SOFT` 100, `opsz` 144) và **Be Vietnam Pro** cho chữ đọc. Cả hai có bộ ký tự tiếng Việt và đã kiểm hiển thị dấu. Chỉ áp cho trang landing. Bảng so sánh: `D:\Study\KLTN\anh-chup\2026-11-22-landing\font-so-sanh.png`.
- **Hướng thiết kế B, "một hình bánh mì":** hướng `one-motif` do `draw.mjs` rút, seed 1106433652, `--keep palette,type`. Bản phác: `D:\Study\KLTN\anh-chup\2026-11-22-landing\huong-B-mot-hinh-banh-mi.png`.
- **Thanh menu:** giữ nguyên, kể cả icon trước mỗi mục.
- **Bố cục các phần:** như mục 6 (chủ dự án duyệt bản tóm tắt, chỉ sửa ý về menu).

## 6. Thiết kế

### 6.1 Ý tưởng

> Trên trang này, **ổ bánh mì, vốn là tên và đồng tiền của BreadTrans**, trở thành **hình duy nhất chi phối cả hệ thống**. Các vết khía chéo trên vỏ bánh chính là các thanh sóng âm, và chúng chấm điểm từng từ.

**Kiểm tra với đối thủ:** ELSA hay Duolingo không thể dùng câu này. Ý tưởng thuộc riêng BreadTrans.

**Hình motif** là một ổ bánh: hình thuôn dài bo tròn hai đầu (dạng stadium), xoay khoảng -8°, mang 5–7 vết khía chéo cùng góc. Vẽ bằng CSS (`border-radius`) hoặc một SVG path. Không vẽ minh hoạ chi tiết, không vân bánh, không bóng. Màu phẳng.

Hình ổ bánh xuất hiện ở 4 cỡ khác nhau:

- **Khổng lồ** ở màn đầu, khoảng 120vh, bị mép phải cắt.
- **Làm khung (mask)** cho ảnh giao diện thật ở các phần sau.
- **Hình dạng nút chính:** pill, chính là ổ bánh thu nhỏ.
- **Chấm đầu dòng cỡ chữ:** một vết khía nhỏ.

Thêm một dải ngăn đôi trang. Không dùng hình nào khác: không tròn, không blob.

### 6.2 Màu và chữ (token CSS, chỉ trong landing)

**Màu**

- `--bg`: nền giấy đá ấm, ít sắc (khoảng `#f4efe8`; tránh vàng kem `#fbfaf8` mà trình kiểm đã cảnh báo).
- `--ink`: `#1c1917`.
- `--muted`: `#57534e`.
- `--loaf`: cam thương hiệu (`#d97706`).
- `--crust`: cam đậm cho vết khía (`#b45309`).
- `--lit`: vàng sáng cho vết khía đang sáng.
- `--surface`: một bậc tông so với nền.
- **Chế độ tối:** đủ token tương ứng dưới `.dark`, nền đá đậm, ổ bánh giữ cam.
- Màu nhấn (cam) chỉ dùng trên nút chính và trên ổ bánh.

**Chữ**

- Nạp qua `next/font/google`, `subsets: ["latin", "vietnamese"]`, gắn biến CSS và chỉ dùng trong landing.
- 5 bậc cỡ:
  - tiêu đề màn đầu 6.4vw;
  - tiêu đề phần 3–4vw;
  - chữ lớn 22–24px;
  - chữ thân 18px;
  - chữ phụ 15px, không có gì dưới 13px.
- Tiêu đề: tracking -0.03em, leading 0.95–1.0.
- Không có từ nào trong tiêu đề được tô màu hoặc in nghiêng riêng.

### 6.3 Màn đầu ("Giant cropped shape")

- Nền trơn. Ổ bánh khổng lồ màu `--loaf` đi vào từ bên phải: tâm khoảng 78% chiều ngang và 55% chiều cao, bị cắt ở mép trên, phải và dưới.
- Bên trái, cột 1–6, căn dọc giữa:
  - `h1` 2 dòng, tối đa khoảng 12 ký tự mỗi dòng ở 6.4vw. Câu cụ thể chốt trong copy deck. Ví dụ hướng: "Nói một câu, chấm từng từ"; câu "Đọc to một câu, thấy điểm từng từ" trong bản phác bị 3 dòng nên phải rút.
  - Một câu đỡ ở cỡ 19–20px nói rõ BreadTrans là gì: tự học tiếng Anh 4 kỹ năng có phản hồi ngay, luyện đề theo cấu trúc TOEIC do BreadTrans biên soạn, bắt đầu miễn phí.
  - Nút chính "Bắt đầu học miễn phí" (gọi `openDirectRegister`; đã đăng nhập thì vào `/dashboard`).
  - Link phụ "Làm bài đánh giá đầu vào" (qua `handleProtectedAction`).
- **Phần bấm thử, "Nghe câu mẫu"** (nút đặt trên ổ bánh):
  - Phát audio thật `https://pub-ecd236c9754a4b7cb22ab82189e6ded2.r2.dev/catalog/speaking/reference/137.v2.mp3` (92 KB, công khai). Câu: "The university library is open from Monday to Friday from eight in the morning until ten at night.", thuộc bộ A1 "Borrowing Books from the University Library".
  - Trong lúc phát, các vết khía sáng dần theo tiến độ audio. Mỗi vết ứng với một cụm từ, chia 18 từ thành 6 cụm. Từ đang đọc hiện trên vết cùng điểm thật của nó.
  - Thời điểm sáng tính theo `currentTime` và tỉ lệ độ dài chữ, vì clip không lưu mốc thời gian từng từ.
  - **Điểm thật** lấy từ lượt nộp 309 (tài khoản học thử): tổng 9,6/10, độ chính xác 96, trôi chảy 94, đầy đủ 100. Điểm từng từ:

    ```
    The 91 · university 100 · library 97 · is 97 · open 94 · from 100 · Monday 100 · to 97 · Friday 97 ·
    from 97 · eight 97 · in 97 · the 94 · morning 97 · until 97 · ten 91 · at 97 · night. 91
    ```

  - Dữ liệu để trong một file hằng số, có ghi chú nguồn (bài 137, lượt nộp 309, ngày lấy).
  - Chú thích cạnh nút nói đúng thứ đang hiện: "Câu mẫu và điểm từng từ từ một lượt nộp trong BreadTrans". Không viết câu kiểu "đây không phải…".
  - **Dự phòng:** không có JS hoặc audio lỗi thì các vết khía hiện tĩnh, kèm câu và điểm. Bật giảm chuyển động thì không chạy hiệu ứng sáng dần mà hiện ngay toàn bộ. Dùng được trên điện thoại bằng ngón tay: nút ít nhất 44px. Bấm lần nữa để dừng.
- **Điện thoại:** ổ bánh dời xuống dưới (130vw, đỉnh ở 56svh, cắt trái, phải, dưới). Tiêu đề 11.5vw, 2 dòng, đặt phía trên ổ bánh.

### 6.4 Các phần, theo thứ tự

Lấy hình học từ blueprint của sheet, còn lại theo mục 6.1–6.2. Mỗi phần mở bằng một tiêu đề nói rõ phần đó là gì (tối đa 2 dòng). Hai phần đứng cạnh nhau không dùng chung bố cục.

1. **Bốn kỹ năng và luyện đề** (blueprint "Object on a disc", đổi đĩa tròn thành ổ bánh):
   - Bên trái là danh sách tên ở cỡ 28–44px: Nghe, Nói, Đọc, Viết, Luyện đề TOEIC, Flashcard. Tên đang chọn dùng `--ink`, các tên khác dùng `--muted` ở độ tương phản đủ (không làm mờ).
   - Bên phải là sân khấu hình ổ bánh chứa ảnh chụp màn hình thật của mục đang chọn, kèm một câu nói đúng mục đó làm gì. Đổi mục thì crossfade 300ms.
   - Chọn được bằng bàn phím. Mục "Nói" chọn sẵn.
   - Điện thoại: ổ bánh ở trên, tên thành một dòng cuộn ngang.
2. **Thứ giữ người học quay lại** (blueprint "Specimens on colour tiles"):
   - Cột trái là tiêu đề và một câu.
   - Cột phải là 5–6 ô màu phẳng (luân phiên 3 tông), mỗi ô chứa một ảnh cắt từ màn hình thật: Bánh Mì, thú ảo, chuỗi ngày học, Đấu trường, bảng xếp hạng, cửa hàng. Một ô rộng gấp đôi.
   - Tên và một câu nằm dưới ô. Không có chữ trên ô, không nhấc lên khi rê chuột.
3. **Lộ trình** (blueprint "One card, four fields"):
   - 4 mảng màu liền nhau. Mỗi mảng chứa một ảnh cắt, cùng kích thước, từ màn hình thật của đúng bước đó: bài đánh giá đầu vào, gợi ý bài luyện trên dashboard, một kết quả có phản hồi, đề TOEIC.
   - Không dựng thẻ HTML mới. Lý do: sản phẩm không có một thẻ người học đi qua cả 4 bước, nên dựng thẻ mới tức là bịa giao diện và số liệu (quyết định của tôi, 22/11, sau buổi đọc thử).
   - Ảnh đề TOEIC chỉ hiện màn làm bài hoặc phần xem lại đáp án, không hiện con số kiểu "điểm thi".
   - Mỗi mảng có một mệnh đề 2 dòng, giữ ý của `ROADMAP_STEPS` cũ, kể cả câu "không phải chứng chỉ hay cấp độ CEFR".
   - Không đánh số.
4. **Gói** (blueprint "Plan names, one live figure"):
   - Bên trái là tên Free, Plus, Pro (là `<button>`). Bên phải là giá và quyền lợi của gói đang chọn. Plus chọn sẵn.
   - Đọc từ `planService.getPublicCatalog()` (`/plans/catalog`, công khai). Nếu API lỗi thì dùng giá tĩnh: Free 0đ, Plus 69.000đ/30 ngày, Pro 149.000đ/30 ngày, kèm mô tả trong `PlanVersion`.
   - Gói 90 và 180 ngày hiện thành một link chữ tới `/plans`.
   - Nút theo tên gói, dẫn tới `/plans`.
5. **Câu hỏi thường gặp** (blueprint "Accordion of filled tiles"):
   - Tiêu đề dính (sticky) ở cột trái.
   - Bên phải là các ô `<details name="faq">`, mở một câu thì các câu khác đóng.
   - Giữ 5 câu của `FAQ_LIST` cũ, có thể thêm 1–2 câu thật, ví dụ "Bài Nói được chấm thế nào?" đã có sẵn.
6. **Kêu gọi đăng ký** (blueprint "The action tile"):
   - Ô cam ở giữa có tiêu đề và nút "Đăng ký miễn phí" (gọi `openDirectRegister`).
   - Hai ô hai bên tràn mép: một ô là ảnh thật, một ô là màu phẳng.
   - Không làm form email, vì đăng ký thật đi qua modal.
7. **Khép trang** (blueprint "The mark, built large"):
   - Chữ BreadTrans dựng lớn từ các khối hình ổ bánh, đặt **phía trên** `AppFooter`. Không thay `AppFooter`.
   - Dòng ghi nguồn ảnh (nếu dùng ảnh Wikimedia) nằm ở đây, cỡ 13px trở lên.

### 6.5 Hình ảnh

- **Ảnh chụp màn hình thật**, chụp từ :3000 bằng tài khoản học thử student2 hoặc student3 (dữ liệu test, được dùng thoải mái). Chụp các trang:
  - Nói (kết quả chấm từng từ), Nghe, Đọc, Viết (nhận xét), đề TOEIC đang làm, Flashcard;
  - thú ảo, cửa hàng, Đấu trường hoặc bảng xếp hạng;
  - 4 ảnh cho phần Lộ trình: bài đánh giá đầu vào, gợi ý bài luyện trên dashboard, kết quả có phản hồi, đề TOEIC.
  - Lưu vào `public/landing/` dạng WebP, có `width`, `height`, `alt`.
  - Có bản tối cho chế độ tối nếu dễ làm; nếu không thì dùng cùng một ảnh.
  - Đây là các mảnh giao diện thật, được tính vào mức sàn tối thiểu 4 ảnh của trình kiểm.
- **Một hình chuyển động:** đoạn quay màn hình thật khoảng 6–10 giây, ví dụ chấm bài Nói hoặc lật flashcard. Quay bằng Playwright, MP4 hoặc WebM, tắt tiếng, có poster, đặt trong khung ổ bánh ở phần 1 hoặc 2.
- **Tuỳ chọn:** 1–2 ảnh bánh mì thật từ `assets.mjs` (Wikimedia, giấy phép cho phép dùng thương mại), dùng ở ô Bánh Mì hoặc ô bên của phần kêu gọi, ghi nguồn ở mục 6.4.7. Không dùng ảnh picsum được sheet rút.
- Không còn khung "minh hoạ" giả như sóng âm vẽ tay hay ô điểm bịa.

### 6.6 Chuyển động (Framer Motion)

- **Chuyển động chính (signature):** ảnh ở phần 1 mở ra từ một cạnh bằng `clip-path` trong khoảng 1,1 giây, ảnh bên trong lùi từ scale 1.12 về 1. Chỉ một lần.
- **Phần bấm thử ở màn đầu** là chuyển động riêng của màn đầu: vết khía sáng dần.
- **Mỗi phần khi vào khung nhìn:** tiêu đề, rồi chữ, rồi ảnh hiện lên lệch nhau 60–90ms, trồi lên 16–32px kèm opacity, chạy một lần.
- **Mọi điều khiển có phản hồi** khi nhấn, rê chuột và focus.
- **Tối thiểu 8 phần tử chuyển động** (trình kiểm fail nếu ít hơn), nên có khoảng 16.
- **Giảm chuyển động:** trạng thái ẩn ban đầu chỉ đặt trong `@media (prefers-reduced-motion: no-preference)`, hoặc dùng `useReducedMotion` của Framer Motion và render thẳng trạng thái cuối. Không nội dung nào bị kẹt ở trạng thái ẩn (lỗi `reduced-hidden` của bản cũ).

### 6.7 Chất lượng

- Một `h1`. Lề hai bên bằng nhau. Không khoảng trống quá nửa màn hình. Khoảng cách giữa các phần 120–240px trên desktop.
- Chữ đọc dài tối đa khoảng 60 ký tự mỗi dòng. Tương phản 4.5:1 cho chữ, trừ nút cam chữ trắng đã có quyết định riêng.
- Link và nút là thẻ thật, focus nhìn thấy được, ảnh có `alt`.

## 7. Kiểm chứng

- `node ~/.claude/skills/design-taste-frontend/scripts/lint.mjs` trên file landing mới, và `inspect.mjs http://localhost:3000` ra **0 FAIL do phần landing gây ra** ở 1440, 768 và 390. Mỗi WARN còn lại phải giải thích được.
  - **Phần dùng chung tự sinh FAIL** (`AppHeader`, `AppFooter`, `MobileBottomNav`). Đã thấy ở bản đo "before":
    - `reduced-hidden`: các mục menu thả xuống khi rê chuột ở `AppHeader.tsx:364`;
    - `hairline`: `border-b` của header và hai `border-t` của footer;
    - `micro-label`: ba tiêu đề in hoa giãn chữ của footer;
    - ở khổ 390: `border-t` và `backdrop-blur` của thanh dưới.
  - Các FAIL này ghi riêng trong báo cáo, là "ngoài phạm vi, phần dùng chung giữ nguyên". Chỉ được bỏ qua đúng các luật đó **sau khi** đã kiểm tay rằng phần landing không góp phần tử nào vào chúng (quyết định của tôi, 22/11).
  - Mọi FAIL khác phải về 0.
  - **Font:** thanh menu và chân trang vẫn dùng Quicksand, nên trang có 3 font. Cảnh báo `font-count` là chấp nhận được và có lý do.
- Xem mọi ảnh chụp trình kiểm xuất ra. Chấm theo `references/critique.md` tối đa 3 vòng.
- FE: `npx tsc --noEmit`, `npm run lint`, `npm run test:ci` đều qua. Thêm test cho các hàm thuần: chia cụm từ, tính thời điểm sáng, chọn giá từ catalog và giá dự phòng.
- Kiểm live trên :3000:
  - phần bấm thử phát audio và sáng đúng thứ tự;
  - nút đăng ký và đăng nhập mở đúng modal;
  - người đã đăng nhập đi thẳng tới trang;
  - chế độ tối;
  - điện thoại 390;
  - bật giảm chuyển động.
- `next build`: NOT_RUN.
- Ảnh trước và sau lưu ở `D:\Study\KLTN\anh-chup\2026-11-22-landing\`.

## 8. Để lại cho người dựng

- Câu chữ cuối cùng của từng tiêu đề và câu đỡ: copy deck theo `references/copy.md`, tiêu đề tối đa 2 dòng, không nói quá. Gửi chủ dự án xem cùng ảnh sau.
- Tách component cho dễ đọc, ví dụ `src/components/landing/*`, với hàm thuần trong `src/lib/landing/*.ts` kèm `*.test.ts`. Phần logic auth giữ trong `page.tsx`.
- Góc xoay, số vết khía và màu chính xác của ổ bánh. Mức tối của chế độ tối.
- Chọn ảnh nào cho ô nào, sau khi chụp.

## 9. Ước lượng thời gian

Ước theo nhịp đã đo: plan CMS 20/11 gồm 4 phần xong trong khoảng 2 giờ.

| Phần | Ước tính |
|---|---|
| Chụp ảnh (kể cả 4 ảnh Lộ trình) và quay màn hình thật, xử lý WebP bằng sharp đã có | 40 phút |
| Token, font, màn đầu và phần bấm thử (kèm test hàm thuần) | 1 giờ 15 phút |
| 7 phần còn lại | 1 giờ 30 phút |
| Lớp chuyển động và giảm chuyển động | 40 phút |
| Trình kiểm 3 vòng, sửa, kiểm live, ảnh trước và sau | 1 giờ |
| **Tổng** | **khoảng 5 giờ 5 phút** |
