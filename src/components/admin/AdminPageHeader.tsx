import type { ReactNode } from "react";
import Link from "next/link";
import { FileStack, FileUp, Plus, type LucideIcon } from "lucide-react";

import { BTN_AI, BTN_DARK, BTN_SECONDARY } from "./cmsButtons";

export type AdminHeaderAction = { label: string; href?: string; onClick?: () => void };

function ActionButton({ action, className, icon: Icon }: { action: AdminHeaderAction; className: string; icon: LucideIcon }) {
  const body = (
    <>
      <Icon size={16} aria-hidden="true" /> {action.label}
    </>
  );
  return action.href ? (
    <Link href={action.href} className={className}>
      {body}
    </Link>
  ) : (
    <button type="button" onClick={action.onClick} className={className}>
      {body}
    </button>
  );
}

/**
 * One header for every admin content page (owner 2026-11-19): the title and
 * a count line on the left; on the right, always in this order, "Tạo từ tài
 * liệu", "Tạo bằng AI" and the dark "+ Tạo …". A page leaves out what it does
 * not have; `createSlot` replaces the create button (Nghe keeps its menu).
 */
export function AdminPageHeader({
  title,
  stats,
  description,
  fromDocument,
  ai,
  create,
  createSlot,
}: {
  title: string;
  stats?: ReactNode;
  description?: ReactNode;
  fromDocument?: AdminHeaderAction;
  ai?: AdminHeaderAction;
  create?: AdminHeaderAction;
  createSlot?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold text-slate-950">{title}</h1>
        {stats && <p className="mt-1 text-sm tabular-nums text-slate-600">{stats}</p>}
        {description && <p className="mt-1 max-w-3xl text-sm text-slate-600">{description}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {fromDocument && <ActionButton action={fromDocument} className={BTN_SECONDARY} icon={FileUp} />}
        {ai && <ActionButton action={ai} className={BTN_AI} icon={FileStack} />}
        {createSlot ?? (create && <ActionButton action={create} className={BTN_DARK} icon={Plus} />)}
      </div>
    </header>
  );
}
