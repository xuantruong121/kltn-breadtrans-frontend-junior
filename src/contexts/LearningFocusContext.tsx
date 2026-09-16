"use client";

import { createContext, useContext, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { isLearningFocusRoute } from "@/lib/practice/focusMode";

type LearningFocusContextValue = {
  isFocusMode: boolean;
  setFocusMode: (enabled: boolean) => void;
};

const LearningFocusContext = createContext<LearningFocusContextValue | null>(null);

export function LearningFocusProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [manualFocusMode, setManualFocusMode] = useState<{
    pathname: string;
    enabled: boolean;
  } | null>(null);
  const routeOverride = manualFocusMode?.pathname === pathname ? manualFocusMode.enabled : null;

  const value = useMemo(
    () => ({
      isFocusMode: routeOverride ?? isLearningFocusRoute(pathname),
      setFocusMode: (enabled: boolean) => setManualFocusMode({ pathname, enabled }),
    }),
    [pathname, routeOverride],
  );

  return <LearningFocusContext.Provider value={value}>{children}</LearningFocusContext.Provider>;
}

export function useLearningFocusMode(): LearningFocusContextValue {
  const context = useContext(LearningFocusContext);
  if (!context) {
    return {
      isFocusMode: false,
      setFocusMode: () => {},
    };
  }
  return context;
}
