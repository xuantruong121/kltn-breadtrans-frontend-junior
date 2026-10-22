# Kịch bản demo 6–8 phút: Gamification, Cửa hàng đổi quà và Sổ Bánh Mì

## Mục tiêu trình bày

BreadTrans không chỉ giao bài học; hệ thống ghi nhận hành vi học tập, thưởng bằng Bánh Mì nội bộ và cho phép đổi vật phẩm theo một luồng có thể đối soát. Mục tiêu là tăng động lực mà vẫn bảo vệ tính đúng đắn của số dư.

## Chuẩn bị trước khi demo

- Đăng nhập bằng một tài khoản học viên có sẵn số dư Bánh Mì và ít nhất một vật phẩm trong túi đồ.
- Mở sẵn ba tab: trang hoạt động học, **Sổ Bánh Mì** trong hồ sơ và **Cửa hàng**.
- Chọn một vật phẩm số có giá nhỏ hơn số dư. Không dùng vật phẩm vật lý nếu chưa có địa chỉ giao hàng hợp lệ.
- Nếu mạng chậm, dùng lịch sử giao dịch đã có để minh họa ledger thay vì lặp lại thao tác đổi quà.

## Luồng trình bày

### 1. Vấn đề và lời hứa sản phẩm — 40 giây

**Lời thoại:** “Tự học thường khó duy trì đều đặn. BreadTrans dùng Bánh Mì như điểm thưởng nội bộ để phản hồi ngay sau hoạt động học, nhưng điểm thưởng phải đáng tin: người học không được nhận trùng, số dư không được âm và mọi biến động đều truy vết được.”

### 2. Hoàn thành hoạt động và nhận thưởng — 60 giây

1. Mở một hoạt động học đã hoàn thành hoặc thao tác một bài ngắn an toàn.
2. Chỉ ra toast/số dư Bánh Mì thay đổi và activity timeline nếu màn hình có sẵn.
3. Mở **Sổ Bánh Mì**.

**Lời thoại:** “Mỗi lần cộng hoặc trừ Bánh Mì tạo một dòng ledger với nguồn, mã tham chiếu, thời điểm và số dư sau giao dịch. Đây là lịch sử thật do backend ghi sau khi nghiệp vụ thành công, không phải UI tự dựng.”

### 3. Đổi quà tại Cửa hàng — 90 giây

1. Mở Cửa hàng, chọn một vật phẩm số.
2. Xác nhận đổi quà.
3. Mở lại Sổ Bánh Mì và Túi đồ/ngoại trang để thấy: số dư giảm, giao dịch xuất hiện, vật phẩm được cấp.

**Lời thoại:** “Một lần đổi quà phải hoàn tất như một giao dịch nguyên tử: kiểm tra số dư và tồn kho, tạo đơn, trừ Bánh Mì, cập nhật tồn kho/cấp quyền. Nếu một bước thất bại, toàn bộ thay đổi được rollback.”

### 4. Vì sao luồng này không bị mua trùng — 90 giây

**Lời thoại:**

- “Client gửi `idempotency-key`; gửi lại cùng yêu cầu không thể tạo thêm đơn hay trừ thêm Bánh Mì.”
- “Ledger Bánh Mì là append-only: thay vì sửa dòng cũ, refund tạo dòng bù trừ có nguồn `MARKET_REFUND`.”
- “CSDL có unique/index và transaction để chống cạnh tranh đồng thời; số dư sau từng dòng giúp đối soát nhanh.”
- “Vật phẩm vật lý tách quy trình fulfillment. Nếu giao hàng thất bại, admin hoàn tiền theo luồng refund thay vì tự sửa số dư.”

### 5. Kết luận — 40 giây

**Lời thoại:** “Điểm quan trọng không phải là icon hay hiệu ứng game, mà là sự kết hợp giữa động lực học và integrity dữ liệu: học thật tạo thưởng, đổi quà có kiểm soát, mọi biến động đều giải thích được.”

## Câu hỏi giảng viên có thể hỏi

| Câu hỏi | Trả lời ngắn |
| --- | --- |
| Người học bấm đổi quà hai lần thì sao? | Cùng idempotency key chỉ được xử lý một lần; backend trả kết quả của giao dịch hợp lệ đã tạo. |
| Làm sao biết số dư đúng? | Sổ Bánh Mì lưu ledger bất biến gồm số tiền biến động, nguồn, tham chiếu và `balanceAfter`; có thể đối soát với số dư hiện tại. |
| Nếu hết hàng hoặc thiếu Bánh Mì? | Backend kiểm tra trong transaction và từ chối trước khi tạo đơn/cấp vật phẩm. |
| Bánh Mì có phải tiền thật không? | Không. Đây là tiền tệ nội bộ, không quy đổi tiền mặt; vật phẩm vật lý được xử lý theo đơn đổi quà và thông tin giao hàng. |
| Refund có xóa lịch sử không? | Không. Hệ thống ghi một dòng hoàn tiền mới, nên lịch sử vẫn đầy đủ. |

## Phương án dự phòng

- Nếu thao tác đổi quà chậm: chuyển sang Sổ Bánh Mì để giải thích một giao dịch đã hoàn tất.
- Nếu tài khoản không đủ Bánh Mì: dùng trạng thái từ chối như bằng chứng backend bảo vệ số dư, sau đó chuyển sang đơn/vật phẩm đã chuẩn bị.
- Không demo bằng cách sửa trực tiếp số dư trong database; điều đó làm mất ý nghĩa integrity của phần trình bày.
