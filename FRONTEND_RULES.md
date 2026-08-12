# BREADTRANS JUNIOR - UI/UX RULES (TASTE SKILL EDITION)

Dự án này là phiên bản Frontend đặc biệt của hệ thống BreadTrans, hướng tới đối tượng người dùng chính là **trẻ em và học sinh nhỏ tuổi**. Mọi thiết kế UI/UX, Component, và Animation phải tuân thủ nghiêm ngặt các nguyên tắc dưới đây (kế thừa từ Taste Skill - Anti Slop).

## 1. Dials (Chỉ số cốt lõi)
- **DESIGN_VARIANCE (9):** Playful / Bất đối xứng. Phá bỏ thiết kế căn giữa truyền thống (Anti-Center Bias). Sử dụng bố cục Split-screen (chia đôi) hoặc thẻ lệch nhau.
- **MOTION_INTENSITY (8):** Cinematic / Spring Physics. Nút bấm phải lún sâu, danh sách phải xuất hiện theo tuần tự (Stagger Reveal).
- **VISUAL_DENSITY (3):** Airy / Art Gallery. Không gian rộng mở, font chữ khổng lồ, khoảng trắng hào phóng.

## 2. Giao diện & Layout (Chống lặp)
- **Cấm Center Bias:** Tuyệt đối không dùng Hero/Form căn giữa màn hình với Box trắng nhạt nhẽo. Hãy dùng Layout chia cột (CSS Grid).
- **Cấm Eyebrows:** Không lạm dụng những dòng chữ in hoa, cách chữ (letter-spacing lớn) trên đầu các tiêu đề section.
- **Solid thay vì Glow:** Trẻ em thích đồ chơi vật lý. Hãy dùng màu sắc mảng lớn (Solid Color), viền dày (Thick Border), đổ bóng cứng (Hard Shadow - Neo Brutalism/Clay) thay vì những hiệu ứng bóng mờ (Blur/Glow) chung chung của AI.

## 3. Hệ thống Màu sắc & Typography
- **Màu sắc:** Sử dụng Pastel mềm mại (Trắng kem, Xanh da trời, Vàng nhạt) làm nền. Các nút bấm Call-to-action dùng Cam, Xanh lam đậm với độ tương phản siêu cao (WCAG AA). 
- **Font chữ:** Bắt buộc dùng `Quicksand`. Khởi đầu ở size `text-lg` thay vì `text-base`.
- **Cấm lạm dụng Serif:** Tuyệt đối không dùng font có chân (Serif) như Fraunces hay Instrument Serif cho project này.

## 4. Tương tác (Animations)
- Sử dụng `motion/react` (Framer Motion).
- **Stagger Reveal:** Form nhập liệu không được hiện ra 1 cục. Từng input phải rơi xuống mượt mà.
- **Phản hồi vật lý:** Button phải có `whileHover={{ scale: 1.05 }}` và `whileTap={{ scale: 0.95 }}`. Cấm dùng shadow tĩnh, hãy dùng shadow lệch (`shadow-[0_6px_0_0_#000]`) và khử shadow khi active (`active:translate-y-[6px] active:shadow-none`).

---
**⚠️ Bất kỳ file nào mới thêm vào đều phải được rà soát đối chiếu với quy tắc Taste Skill này trước khi giao cho người dùng.**
