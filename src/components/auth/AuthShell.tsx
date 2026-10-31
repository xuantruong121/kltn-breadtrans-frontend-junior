"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { BrandLogo } from "@/components/brand";

import { ThemeToggle } from "@/components/navigation/ThemeToggle";

interface AuthShellProps {
  children: ReactNode;
  contentPosition?: "center" | "start";
  contentClassName?: string;
}

export function AuthShell({
  children,
  contentClassName = "max-w-md",
}: AuthShellProps) {
  return (
    <div className="min-h-dvh flex flex-col bg-background text-foreground selection:bg-amber-100 selection:text-amber-900 transition-colors duration-150">
      {/* Minimalist Auth Top Bar */}
      <div className="w-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-md sticky top-0 z-30 shadow-xs border-b border-slate-200/70 dark:border-slate-800/70">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BrandLogo
              href="/"
              variant="full"
              size="md"
              subtitle="Nền tảng Tự học Tiếng Anh & Luyện 4 Kỹ năng"
            />
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-amber-700 dark:hover:text-amber-400 transition-colors py-1.5 px-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <ArrowLeft size={16} />
              <span>Quay lại Trang chủ</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Authentication Canvas */}
      <main className="w-full flex-1 flex flex-col items-center justify-center px-4 py-8 sm:py-12 relative overflow-hidden">
        <div className={`w-full ${contentClassName} mx-auto my-4 z-10`}>
          {children}
        </div>
      </main>
    </div>
  );
}
