"use client";

import { useState } from "react";
import { Flag } from "lucide-react";
import { IssueReportDialog } from "./IssueReportDialog";
import type { IssueReportArea } from "@/lib/api/services/issue-report.service";

export function ReportIssueButton({
  area,
  context,
  compact = false,
  labelFromSm = false,
}: {
  area: IssueReportArea;
  context?: Parameters<typeof IssueReportDialog>[0]["context"];
  compact?: boolean;
  /** Icon only on phones, the label from 640px: for crowded toolbars. */
  labelFromSm?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold text-rose-700 transition-colors hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 dark:text-rose-400"
        aria-label="Báo lỗi nội dung"
      >
        <Flag size={16} />
        {!compact && <span className={labelFromSm ? "hidden sm:inline" : undefined}>Báo lỗi</span>}
      </button>
      <IssueReportDialog
        key={open ? "issue-dialog-open" : "issue-dialog-closed"}
        open={open}
        onClose={() => setOpen(false)}
        area={area}
        context={context}
      />
    </>
  );
}
