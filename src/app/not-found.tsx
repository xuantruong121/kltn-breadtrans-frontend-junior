import type { Metadata } from "next";
import { NotFoundView } from "@/components/navigation/NotFoundView";

export const metadata: Metadata = {
  title: "404: Không tìm thấy trang | BreadTrans",
  description:
    "Trang bạn đang tìm kiếm không tồn tại hoặc đã được di chuyển trên nền tảng học tiếng Anh BreadTrans.",
};

export default function NotFound() {
  return <NotFoundView />;
}
