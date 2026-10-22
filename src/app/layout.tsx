import type { Metadata, Viewport } from "next";
import { Quicksand } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import QueryProvider from "@/lib/providers/QueryProvider";
import SocketProvider from "@/lib/providers/SocketProvider";
import { ThemeProvider } from "@/lib/theme/ThemeProvider";
import { Toaster } from "react-hot-toast";

const quicksand = Quicksand({
  variable: "--font-quicksand",
  subsets: ["latin", "vietnamese"],
});

export const metadata: Metadata = {
  title: "BreadTrans - Tự học tiếng Anh theo lộ trình",
  description:
    "Nền tảng tự học tiếng Anh theo kỹ năng, cấp độ và chủ đề; luyện đề theo nhiều dạng chứng chỉ và học theo khóa học có lộ trình sẵn.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbfaf8" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1120" },
  ],
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
        <link rel="icon" href="/icons/logo-mark.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        {/* Anti-FOUC Early Theme Script: Runs before First Paint */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var p=window.location.pathname;var a=p==='/admin'||p.indexOf('/admin/')===0;var t=localStorage.getItem('breadtrans-theme');var d=!a&&t==='dark';if(d)document.documentElement.classList.add('dark');else document.documentElement.classList.remove('dark');}catch(e){}})();`,
          }}
        />
        {/* Remove the legacy unfinished PWA registration without touching unrelated caches. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{if('serviceWorker' in navigator){navigator.serviceWorker.getRegistrations().then(function(rs){rs.forEach(function(r){var w=r.active||r.waiting||r.installing;if(w&&w.scriptURL.endsWith('/sw.js'))r.unregister();});});}if('caches' in window){caches.keys().then(function(keys){keys.filter(function(k){return k.indexOf('breadtrans-cache-')===0;}).forEach(function(k){caches.delete(k);});});}}catch(e){}})();`,
          }}
        />
        {/* Material Symbols is an icon font; next/font does not support this variable icon family. */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=optional"
        />
      </head>
      <body
        className={`${quicksand.className} min-h-dvh overflow-x-clip antialiased bg-background text-foreground transition-colors duration-150`}
        suppressHydrationWarning
      >
        <Script
          src="https://accounts.google.com/gsi/client"
          strategy="afterInteractive"
        />
        <QueryProvider>
          <ThemeProvider>
            <SocketProvider>
              {children}
              <Toaster
                position="top-center"
                toastOptions={{
                  duration: 4200,
                  className:
                    "!rounded-2xl !border !border-slate-200 dark:!border-slate-800 !bg-white dark:!bg-slate-900 !px-4 !py-3 !text-sm !font-semibold !text-slate-900 dark:!text-slate-100 !shadow-lg",
                  success: {
                    className:
                      "!rounded-2xl !border !border-emerald-300 dark:!border-emerald-500/50 !bg-white dark:!bg-slate-900 !px-4 !py-3 !text-sm !font-semibold !text-slate-900 dark:!text-slate-100 !shadow-lg",
                    iconTheme: {
                      primary: "#10b981",
                      secondary: "#ffffff",
                    },
                  },
                  error: {
                    className:
                      "!rounded-2xl !border !border-rose-300 dark:!border-rose-500/50 !bg-white dark:!bg-slate-900 !px-4 !py-3 !text-sm !font-semibold !text-slate-900 dark:!text-slate-100 !shadow-lg",
                    iconTheme: {
                      primary: "#f43f5e",
                      secondary: "#ffffff",
                    },
                  },
                  loading: {
                    className:
                      "!rounded-2xl !border !border-sky-300 dark:!border-sky-500/50 !bg-white dark:!bg-slate-900 !px-4 !py-3 !text-sm !font-semibold !text-slate-900 dark:!text-slate-100 !shadow-lg",
                  },
                }}
              />
            </SocketProvider>
          </ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
