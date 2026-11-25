/**
 * Số trên trang Chi phí & Hiệu năng theo kiểu Việt Nam: dấu phẩy thập phân, dấu chấm phân cách nghìn.
 * Trước 25/11/2026 trang trộn hai kiểu ("2.5 / 300 phút" cạnh "297,5 phút", "755.9 / 10.240 MB").
 * Số tiền USD giữ kiểu "$0.0123" vì là đơn vị đô la.
 */
export function viNumber(value: number, maxFractionDigits = 1): string {
  return value.toLocaleString("vi-VN", { maximumFractionDigits: maxFractionDigits });
}
