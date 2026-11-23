import type { Metadata } from "next";
import { Be_Vietnam_Pro, Fraunces } from "next/font/google";
import { LandingPage } from "@/components/landing/LandingPage";

// `/` shows TOEIC only, so it does not take the root layout's description
// ("nhiều dạng chứng chỉ"). The words follow the hero: BreadTrans's own
// practice material in the TOEIC structure, no exam-board or CEFR claim.
export const metadata: Metadata = {
  title: "BreadTrans - Tự học tiếng Anh, luyện đề TOEIC",
  description:
    "Tự học tiếng Anh qua Nghe, Nói, Đọc, Viết với phản hồi ngay sau khi nộp, và luyện đề theo cấu trúc TOEIC do BreadTrans biên soạn. Bắt đầu miễn phí.",
};

// Landing-only fonts (spec 6.2); the rest of the app keeps Quicksand. next/font
// takes `axes` only with the variable weight, so Fraunces loads its whole
// variable wght axis in one file and landing.css uses 500-800 of it.
const fraunces = Fraunces({
  subsets: ["latin", "vietnamese"],
  axes: ["SOFT", "opsz"],
  variable: "--font-fraunces",
});

const beVietnam = Be_Vietnam_Pro({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "700"],
  variable: "--font-be-vietnam",
});

export default function PublicLandingPage() {
  return <LandingPage className={`${fraunces.variable} ${beVietnam.variable}`} />;
}
