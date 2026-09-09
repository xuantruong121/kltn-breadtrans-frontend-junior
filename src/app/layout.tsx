import type { Metadata, Viewport } from "next";
import { Quicksand } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import QueryProvider from "@/lib/providers/QueryProvider";
import SocketProvider from "@/lib/providers/SocketProvider";
import { Toaster } from "react-hot-toast";
import PWAInstallBanner from "@/components/pwa/PWAInstallBanner";

const quicksand = Quicksand({
  variable: "--font-quicksand",
  subsets: ["latin", "vietnamese"],
});

export const metadata: Metadata = {
  title: "BreadTrans - Học tiếng Anh & Luyện đề TOEIC",
  description: "Nền tảng tự học tiếng Anh 4 kỹ năng, từ vựng, ngữ pháp và luyện đề TOEIC tương tác",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "BreadTrans",
  },
};

export const viewport: Viewport = {
  themeColor: "#f97316",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" />
      </head>
      <body className={`${quicksand.className} min-h-screen antialiased text-slate-700`} suppressHydrationWarning>
        <Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive" />
        <QueryProvider>

          <SocketProvider>
            {children}
            <PWAInstallBanner />
            <Toaster position="top-center" />
          </SocketProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
