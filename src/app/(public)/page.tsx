import { Be_Vietnam_Pro, Fraunces } from "next/font/google";
import { LandingPage } from "@/components/landing/LandingPage";

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
