import React, { useMemo } from "react";

export interface ChatMessageContentProps {
  content: string;
  isInverse?: boolean;
}

/**
 * Parses inline formatting tokens:
 * - ***bold & italic***
 * - **bold**
 * - *italic*
 * - `code`
 */
function parseInlineTokens(
  text: string,
  isInverse: boolean,
  keyPrefix: string,
): React.ReactNode[] {
  if (!text) return [];

  // Token regex:
  // Group 1: code `...`
  // Group 2: bold+italic ***...***
  // Group 3: bold **...**
  // Group 4: italic *...*
  const tokenRegex =
    /(`[^`]+`|\*\*\*[^*]+\*\*\*|\*\*[^*]+\*\*|\*[^*]+\*)/g;

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }

    const token = match[0];
    const tokenKey = `${keyPrefix}-${match.index}`;

    if (token.startsWith("`") && token.endsWith("`")) {
      parts.push(
        <code
          key={tokenKey}
          className={`rounded px-1.5 py-0.5 text-xs font-mono border ${
            isInverse
              ? "bg-slate-800 text-amber-200 border-slate-700"
              : "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border-slate-200 dark:border-slate-700"
          }`}
        >
          {token.slice(1, -1)}
        </code>,
      );
    } else if (token.startsWith("***") && token.endsWith("***")) {
      parts.push(
        <strong
          key={tokenKey}
          className={`font-bold italic ${
            isInverse
              ? "text-white underline decoration-white/30"
              : "text-slate-950 dark:text-white"
          }`}
        >
          {token.slice(3, -3)}
        </strong>,
      );
    } else if (token.startsWith("**") && token.endsWith("**")) {
      parts.push(
        <strong
          key={tokenKey}
          className={`font-bold ${
            isInverse ? "text-white" : "text-slate-950 dark:text-white"
          }`}
        >
          {token.slice(2, -2)}
        </strong>,
      );
    } else if (token.startsWith("*") && token.endsWith("*")) {
      parts.push(
        <em
          key={tokenKey}
          className={`italic ${
            isInverse
              ? "text-slate-200"
              : "text-slate-700 dark:text-slate-300"
          }`}
        >
          {token.slice(1, -1)}
        </em>,
      );
    }

    lastIndex = tokenRegex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts;
}

export function ChatMessageContent({
  content,
  isInverse = false,
}: ChatMessageContentProps) {
  const elements = useMemo(() => {
    if (!content) return null;

    // Clean up excessive asterisks (e.g. **** -> **)
    const normalized = content.replace(/\*{4,}/g, "**");

    const lines = normalized.split("\n");
    const renderedLines: React.ReactNode[] = [];

    lines.forEach((line, lineIdx) => {
      const trimmed = line.trim();
      const lineKey = `line-${lineIdx}`;

      // Empty line spacing
      if (!trimmed) {
        renderedLines.push(<div key={lineKey} className="h-2" />);
        return;
      }

      // Check Heading (###, ##, #)
      const headingMatch = trimmed.match(/^(#{1,4})\s+(.+)$/);
      if (headingMatch) {
        const headingText = headingMatch[2];
        const inlineTokens = parseInlineTokens(
          headingText,
          isInverse,
          `${lineKey}-h`,
        );

        renderedLines.push(
          <h4
            key={lineKey}
            className={`font-bold text-sm sm:text-base mt-2 mb-1 tracking-tight ${
              isInverse ? "text-amber-200" : "text-slate-900 dark:text-white"
            }`}
          >
            {inlineTokens}
          </h4>,
        );
        return;
      }

      // Check Numbered List item: e.g. "1. **Tiêu đề:** mô tả"
      const numberedMatch = trimmed.match(/^(\d+)\.\s+(.+)$/);
      if (numberedMatch) {
        const itemNumber = numberedMatch[1];
        const itemBody = numberedMatch[2];
        const inlineTokens = parseInlineTokens(
          itemBody,
          isInverse,
          `${lineKey}-num`,
        );

        renderedLines.push(
          <div key={lineKey} className="flex items-start gap-2 my-1.5 pl-0.5">
            <span
              className={`shrink-0 font-bold select-none text-xs sm:text-sm mt-0.5 ${
                isInverse
                  ? "text-blue-300"
                  : "text-blue-600 dark:text-blue-400"
              }`}
            >
              {itemNumber}.
            </span>
            <div
              className={`flex-1 leading-relaxed text-sm ${
                isInverse
                  ? "text-white"
                  : "text-slate-800 dark:text-slate-100"
              }`}
            >
              {inlineTokens}
            </div>
          </div>,
        );
        return;
      }

      // Check Bullet item: e.g. "- nội dung", "* nội dung", "• nội dung"
      const bulletMatch = trimmed.match(/^([-*•])\s+(.+)$/);
      if (bulletMatch) {
        const itemBody = bulletMatch[2];
        const inlineTokens = parseInlineTokens(
          itemBody,
          isInverse,
          `${lineKey}-bul`,
        );

        renderedLines.push(
          <div key={lineKey} className="flex items-start gap-2.5 my-1 pl-3">
            <span
              className={`shrink-0 select-none text-xs leading-5 ${
                isInverse
                  ? "text-slate-300"
                  : "text-slate-400 dark:text-slate-500"
              }`}
            >
              •
            </span>
            <div
              className={`flex-1 leading-relaxed text-sm ${
                isInverse
                  ? "text-white"
                  : "text-slate-800 dark:text-slate-100"
              }`}
            >
              {inlineTokens}
            </div>
          </div>,
        );
        return;
      }

      // Standard Paragraph
      const inlineTokens = parseInlineTokens(
        trimmed,
        isInverse,
        `${lineKey}-p`,
      );
      renderedLines.push(
        <p
          key={lineKey}
          className={`leading-relaxed my-1 text-sm ${
            isInverse ? "text-white" : "text-slate-800 dark:text-slate-100"
          }`}
        >
          {inlineTokens}
        </p>,
      );
    });

    return renderedLines;
  }, [content, isInverse]);

  return <div className="space-y-0.5 break-words">{elements}</div>;
}
