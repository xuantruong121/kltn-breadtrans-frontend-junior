"use client";

import type { ReactNode } from "react";
import { Croissant } from "lucide-react";
import { AuthBrandPanel } from "./AuthBrandPanel";

interface AuthShellProps {
  children: ReactNode;
  contentPosition?: "center" | "start";
}

export function AuthShell({ children, contentPosition = "center" }: AuthShellProps) {
  const spacing =
    contentPosition === "start"
      ? "items-start px-6 py-8 sm:px-10 sm:py-10 lg:p-12 xl:p-16"
      : "items-center p-6 sm:p-10 lg:p-16 xl:p-24";

  return (
    <main className="grid min-h-[100dvh] grid-cols-1 lg:grid-cols-2">
      <AuthBrandPanel />
      <section className={`relative flex min-h-[100dvh] justify-center bg-sky-50 ${spacing}`}>
        <div className="w-full max-w-xl">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="-rotate-6 rounded-2xl bg-white p-3 text-junior-orange shadow-lg ring-2 ring-sky-200">
              <Croissant size={32} strokeWidth={2.5} aria-hidden="true" />
            </div>
            <div>
              <p className="text-2xl font-extrabold leading-none tracking-tight text-slate-800">
                Bread<span className="text-junior-orange">Trans</span>
              </p>
              <p className="mt-1 text-xs font-bold uppercase tracking-[0.22em] text-junior-blue">
                Junior
              </p>
            </div>
          </div>
          {children}
        </div>
      </section>
    </main>
  );
}
