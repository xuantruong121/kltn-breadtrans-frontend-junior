"use client";

import { useCallback, useState } from "react";

const marksKey = (attemptId: number, componentId: number) =>
  `breadtrans:assessment:${attemptId}:marked:${componentId}`;

function readMarks(attemptId: number, componentId: number) {
  try {
    const raw = localStorage.getItem(marksKey(attemptId, componentId));
    return new Set<number>(raw ? (JSON.parse(raw) as number[]) : []);
  } catch {
    return new Set<number>();
  }
}

/** Questions marked for review, by number. A mark is a reminder, not an answer. */
export function useSectionMarks(attemptId: number, componentId: number) {
  const [marked, setMarked] = useState(() => readMarks(attemptId, componentId));
  const toggleMark = useCallback(
    (questionNumber: number) => {
      setMarked((old) => {
        const next = new Set(old);
        if (next.has(questionNumber)) next.delete(questionNumber);
        else next.add(questionNumber);
        try {
          localStorage.setItem(marksKey(attemptId, componentId), JSON.stringify([...next]));
        } catch {
          // The mark still works on this page.
        }
        return next;
      });
    },
    [attemptId, componentId],
  );
  return { marked, toggleMark };
}
