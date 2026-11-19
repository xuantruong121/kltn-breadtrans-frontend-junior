# PWA status

BreadTrans hiện được phát hành như một responsive web application. Khả năng cài đặt dưới dạng Progressive Web App, chạy offline và background sync vẫn được hoãn lại, không thuộc phạm vi triển khai luận văn hiện tại.

## Thông báo trình duyệt (Web Push): đã bật lại từ 19/11/2026

- Người học bật hoặc tắt cho từng trình duyệt ở Tài khoản → Thiết bị → "Thông báo trình duyệt trên thiết bị này", và gửi thử được. Trang Thông báo có link tới đó.
- `public/push-sw.js` chỉ nhận push và mở link khi bấm vào thông báo. Worker này được đăng ký với scope `/push/` nên không điều khiển trang nào. Nó không có `fetch` và không cache, nên không làm web hiện bản cũ như `sw.js` trước đây.
- `app/layout.tsx` vẫn gỡ worker `/sw.js` cũ (caching) trên các máy từng cài; đoạn đó không chạm tới `push-sw.js`.
- Đăng xuất thì trình duyệt huỷ đăng ký, để máy dùng chung không nhận nhắc học của người trước.
- Cần `NEXT_PUBLIC_VAPID_PUBLIC_KEY` (frontend, kể cả trên Vercel), khớp với `VAPID_PUBLIC_KEY` và `VAPID_PRIVATE_KEY` của backend. Thiếu khoá thì khối cài đặt báo "Máy chủ chưa cấu hình thông báo trình duyệt."

## Vẫn chưa kích hoạt

Không có install prompt, offline exam hoặc private API cache. Icon/logo website thông thường vẫn được giữ lại; không có nút cài đặt ứng dụng trong giao diện.

Định vị dùng cho báo cáo:

> Phiên bản hiện tại của BreadTrans tập trung vào trải nghiệm web đáp ứng (responsive web), có thông báo trình duyệt cho nhắc học và báo cáo tuần. Khả năng cài đặt dưới dạng Progressive Web App được định hướng là chức năng mở rộng trong tương lai.
