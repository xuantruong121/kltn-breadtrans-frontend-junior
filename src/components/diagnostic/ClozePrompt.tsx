"use client";

import React from "react";
import { parseClozeQuestionSegments } from "@/lib/diagnostic/diagnosticUiLogic";

interface ClozePromptProps {
  prompt: string;
  className?: string;
}

export function ClozePrompt({ prompt, className = "" }: ClozePromptProps) {
  const segments = parseClozeQuestionSegments(prompt);
  if (!segments.length) {
    return <span className={className}>{prompt}</span>;
  }

  return (
    <span className={className}>
      {segments.map((seg, idx) => {
        if (seg.type === "blank") {
          return (
            <span
              key={`blank-${idx}`}
              className="mx-1.5 inline-block w-16 align-baseline border-b-2 border-slate-900 dark:border-slate-100"
              role="separator"
              aria-label="chỗ trống cần điền"
            />
          );
        }
        return <span key={`text-${idx}`}>{seg.text}</span>;
      })}
    </span>
  );
}
