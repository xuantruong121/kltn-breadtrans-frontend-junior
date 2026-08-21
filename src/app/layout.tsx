import type { Metadata, Viewport } from "next";
import { Quicksand } from "next/font/google";
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
  title: "BreadTrans - Luyện TOEIC & Tiếng Anh AI",
  description: "Nền tảng học tiếng Anh và luyện thi TOEIC tương tác với AI",
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
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body className={`${quicksand.className} min-h-screen antialiased text-slate-700`} suppressHydrationWarning>
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
