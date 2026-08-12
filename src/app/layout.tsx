import type { Metadata } from "next";
import { Quicksand } from "next/font/google";
import "./globals.css";
import QueryProvider from "@/lib/providers/QueryProvider";
import SocketProvider from "@/lib/providers/SocketProvider";
import { Toaster } from "react-hot-toast";

const quicksand = Quicksand({
  variable: "--font-quicksand",
  subsets: ["latin", "vietnamese"],
});

export const metadata: Metadata = {
  title: "BreadTrans Junior",
  description: "Học tiếng Anh siêu vui nhộn dành cho Kids",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body className={`${quicksand.variable} font-sans min-h-screen antialiased text-slate-700`} suppressHydrationWarning>
        <QueryProvider>
          <SocketProvider>
            {children}
            <Toaster position="top-center" />
          </SocketProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
