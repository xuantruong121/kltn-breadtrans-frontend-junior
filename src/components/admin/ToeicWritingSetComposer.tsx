"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  ExternalLink,
  Loader2,
  Plus,
  Save,
  Send,
  XCircle,
} from "lucide-react";
import toast from "react-hot-toast";
import axiosClient from "@/lib/api/axiosClient";

type TaskKind = "PICTURE_SENTENCE" | "WRITTEN_REQUEST" | "OPINION_ESSAY";
type Slot = { order: number; taskKind: TaskKind; label: string };
type Source = {
  id: number;
  title: string;
  type: string;
  publicationStatus?: string;
  _count?: { questions?: number };
};
type SetItem = {
  id: number;
  order: number;
  taskKind: TaskKind;
  writingQuizId: number;
  source?: {
    id: number;
    title: string;
    type: string;
    publicationStatus?: string;
    taskType?: string | null;
    imageUrl?: string | null;
  } | null;
};
type WritingSet = {
  id: number;
  title: string;
  description?: string | null;
  publicationStatus: "DRAFT" | "PUBLISHED";
  items: SetItem[];
  structure: { valid: boolean; issues: string[]; counts: Record<string, number> };
};

const SLOTS: Slot[] = [
  ...Array.from({ length: 5 }, (_, index) => ({
    order: index + 1,
    taskKind: "PICTURE_SENTENCE" as const,
    label: "Picture sentence",
  })),
  { order: 6, taskKind: "WRITTEN_REQUEST", label: "Written request" },
  { order: 7, taskKind: "WRITTEN_REQUEST", label: "Written request" },
  { order: 8, taskKind: "OPINION_ESSAY", label: "Opinion essay" },
];

function unwrap<T>(value: unknown): T {
  return ((value as { data?: T })?.data ?? value) as T;
}

function sourceLabel(source: Source) {
  return `#${source.id} · ${source.title} · ${source.type}`;
}

function statusFor(item: SetItem | undefined, slot: Slot): {
  label: string;
  className: string;
  icon: typeof CheckCircle2;
} {
  if (!item) {
    return { label: "Missing", className: "text-amber-700 bg-amber-50", icon: XCircle };
  }
  if (item.taskKind !== slot.taskKind || !item.source) {
    return { label: "Invalid type", className: "text-red-700 bg-red-50", icon: XCircle };
  }
  if (item.source.publicationStatus !== "PUBLISHED") {
    return { label: "Draft", className: "text-slate-700 bg-slate-100", icon: XCircle };
  }
  if (slot.taskKind === "PICTURE_SENTENCE" && !item.source.imageUrl) {
    return { label: "Missing media", className: "text-amber-700 bg-amber-50", icon: XCircle };
  }
  return { label: "Ready", className: "text-emerald-700 bg-emerald-50", icon: CheckCircle2 };
}

export default function ToeicWritingSetComposer() {
  const [sets, setSets] = useState<WritingSet[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [title, setTitle] = useState("TOEIC Writing · Standard Set");
  const [description, setDescription] = useState("");
  const [draftSelections, setDraftSelections] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const activeSet = sets.find((set) => set.id === activeId) ?? null;
  const itemsByOrder = useMemo(
    () => new Map((activeSet?.items ?? []).map((item) => [item.order, item])),
    [activeSet],
  );
  const readySlotCount = activeSet
    ? SLOTS.filter((slot) => statusFor(itemsByOrder.get(slot.order), slot).label === "Ready").length
    : 0;

  const load = async () => {
    setLoading(true);
    try {
      const [setsResponse, sourcesResponse] = await Promise.all([
        axiosClient.get("/admin/toeic/writing-sets"),
        axiosClient.get("/admin/skill-content/writing"),
      ]);
      const nextSets = unwrap<WritingSet[]>(setsResponse);
      setSets(nextSets);
      setSources(unwrap<Source[]>(sourcesResponse));
      if (activeId && nextSets.some((set) => set.id === activeId)) return;
      if (nextSets[0]) {
        setActiveId(nextSets[0].id);
        setTitle(nextSets[0].title);
        setDescription(nextSets[0].description ?? "");
      }
    } catch {
      toast.error("Không thể tải TOEIC Writing Set.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    // Initial load only; active set changes are local state updates.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const chooseSet = (id: number) => {
    const next = sets.find((set) => set.id === id);
    if (!next) return;
    setActiveId(id);
    setTitle(next.title);
    setDescription(next.description ?? "");
    setDraftSelections({});
  };

  const createSet = async () => {
    setBusy(true);
    try {
      const response = await axiosClient.post("/admin/toeic/writing-sets", {
        title: title.trim() || "TOEIC Writing Set",
        description: description.trim() || undefined,
      });
      const created = unwrap<WritingSet>(response);
      toast.success("Đã tạo TOEIC Writing Set bản nháp.");
      await load();
      setActiveId(created.id);
    } catch (error: any) {
      toast.error(error?.response?.data?.message ?? "Không thể tạo Set.");
    } finally {
      setBusy(false);
    }
  };

  const saveDetails = async () => {
    if (!activeSet || activeSet.publicationStatus === "PUBLISHED") return;
    setBusy(true);
    try {
      await axiosClient.patch(`/admin/toeic/writing-sets/${activeSet.id}`, {
        title: title.trim(),
        description: description.trim() || undefined,
      });
      toast.success("Đã lưu thông tin Set.");
      await load();
    } catch (error: any) {
      toast.error(error?.response?.data?.message ?? "Không thể lưu Set.");
    } finally {
      setBusy(false);
    }
  };

  const saveSlot = async (slot: Slot) => {
    if (!activeSet || activeSet.publicationStatus === "PUBLISHED") return;
    const rawId = draftSelections[slot.order] ?? String(itemsByOrder.get(slot.order)?.writingQuizId ?? "");
    const writingQuizId = Number(rawId);
    if (!Number.isInteger(writingQuizId) || writingQuizId <= 0) {
      toast.error(`Hãy chọn bài Writing cho slot ${slot.order}.`);
      return;
    }
    setBusy(true);
    try {
      const current = itemsByOrder.get(slot.order);
      const payload = { order: slot.order, taskKind: slot.taskKind, writingQuizId };
      if (current) {
        await axiosClient.patch(
          `/admin/toeic/writing-sets/${activeSet.id}/items/${current.id}`,
          payload,
        );
      } else {
        await axiosClient.post(`/admin/toeic/writing-sets/${activeSet.id}/items`, payload);
      }
      toast.success(`Đã lưu slot ${slot.order}.`);
      setDraftSelections((currentSelections) => {
        const next = { ...currentSelections };
        delete next[slot.order];
        return next;
      });
      await load();
    } catch (error: any) {
      toast.error(error?.response?.data?.message ?? "Task không tương thích với slot này.");
    } finally {
      setBusy(false);
    }
  };

  const publish = async () => {
    if (!activeSet) return;
    setBusy(true);
    try {
      await axiosClient.post(`/admin/toeic/writing-sets/${activeSet.id}/publish`);
      toast.success("Đã xuất bản TOEIC Writing Set.");
      await load();
    } catch (error: any) {
      const issues = error?.response?.data?.issues;
      toast.error(Array.isArray(issues) ? issues.join(" · ") : "Set chưa đủ điều kiện xuất bản.");
    } finally {
      setBusy(false);
    }
  };

  const compatibleSources = (slot: Slot) =>
    sources.filter((source) =>
      slot.taskKind === "PICTURE_SENTENCE"
        ? source.type === "WRITING_PICTURE"
        : source.type === "WRITING_EMAIL",
    );

  if (loading) {
    return <div className="flex min-h-64 items-center justify-center text-slate-500"><Loader2 className="mr-2 animate-spin" /> Đang tải...</div>;
  }

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">TOEIC Writing</p>
          <h1 className="mt-2 text-2xl font-bold text-slate-950">Authoritative Writing Set</h1>
          <p className="mt-1 text-sm text-slate-500">Ghép task Writing hiện có vào cấu trúc 5 Picture · 2 Request · 1 Essay.</p>
        </div>
        <button type="button" onClick={createSet} disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50">
          <Plus size={16} /> Tạo Set bản nháp
        </button>
      </header>

      <section className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <aside className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Các Set</h2>
          <div className="mt-3 space-y-2">
            {sets.length === 0 && <p className="text-sm text-slate-500">Chưa có Set nào.</p>}
            {sets.map((set) => (
              <button key={set.id} type="button" onClick={() => chooseSet(set.id)} className={`w-full rounded-xl border px-3 py-2 text-left text-sm ${set.id === activeId ? "border-blue-300 bg-blue-50 text-blue-900" : "border-slate-200 hover:bg-slate-50"}`}>
                <span className="block truncate font-medium">{set.title}</span>
                <span className="mt-1 block text-xs text-slate-500">{set.publicationStatus === "PUBLISHED" ? "Published" : "Draft"}</span>
              </button>
            ))}
          </div>
        </aside>

        <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          {!activeSet ? (
            <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500">Tạo một Set để bắt đầu.</div>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
                <label className="text-sm font-medium text-slate-700">Tên Set<input value={title} onChange={(event) => setTitle(event.target.value)} disabled={activeSet.publicationStatus === "PUBLISHED"} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label>
                <label className="text-sm font-medium text-slate-700">Mô tả<input value={description} onChange={(event) => setDescription(event.target.value)} disabled={activeSet.publicationStatus === "PUBLISHED"} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label>
                <button type="button" onClick={saveDetails} disabled={busy || activeSet.publicationStatus === "PUBLISHED"} className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"><Save size={16} /> Lưu</button>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 px-4 py-3 text-sm">
                <span className="font-semibold text-slate-800">Readiness: {readySlotCount}/8 hợp lệ</span>
                <div className="flex items-center gap-2"><span className="rounded-full bg-slate-200 px-2.5 py-1 text-xs font-semibold">{activeSet.publicationStatus}</span><button type="button" onClick={publish} disabled={busy || activeSet.publicationStatus === "PUBLISHED"} className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"><Send size={15} /> Publish</button></div>
              </div>

              <div className="space-y-3">
                {SLOTS.map((slot) => {
                  const item = itemsByOrder.get(slot.order);
                  const status = statusFor(item, slot);
                  const StatusIcon = status.icon;
                  return <div key={slot.order} className="grid gap-3 rounded-xl border border-slate-200 p-4 md:grid-cols-[42px_160px_1fr_auto] md:items-center">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-700">{slot.order}</span>
                    <div><p className="text-sm font-semibold text-slate-900">{slot.label}</p><span className={`mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${status.className}`}><StatusIcon size={13} /> {status.label}</span></div>
                    <select value={draftSelections[slot.order] ?? String(item?.writingQuizId ?? "")} onChange={(event) => setDraftSelections((current) => ({ ...current, [slot.order]: event.target.value }))} disabled={activeSet.publicationStatus === "PUBLISHED"} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"><option value="">Chọn bài Writing</option>{compatibleSources(slot).map((source) => <option key={source.id} value={source.id}>{sourceLabel(source)}</option>)}</select>
                    <div className="flex flex-wrap gap-2"><button type="button" onClick={() => void saveSlot(slot)} disabled={busy || activeSet.publicationStatus === "PUBLISHED"} className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-700 disabled:opacity-50">Lưu slot</button>{item?.writingQuizId && <Link href={`/admin/writing/${item.writingQuizId}`} className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">Mở <ExternalLink size={13} /></Link>}</div>
                  </div>;
                })}
              </div>
              {!activeSet.structure.valid && activeSet.structure.issues.length > 0 && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><p className="font-semibold">Chưa sẵn sàng xuất bản</p><ul className="mt-2 list-disc space-y-1 pl-5">{activeSet.structure.issues.map((issue) => <li key={issue}>{issue}</li>)}</ul></div>}
              <p className="text-xs text-slate-500">+ Tạo bài Writing mới tại <Link href="/admin/writing/new" className="font-semibold text-blue-700 hover:underline">Writing CMS</Link>. Composer chỉ tham chiếu task, không tạo pipeline Writing thứ hai.</p>
            </>
          )}
        </section>
      </section>
    </main>
  );
}
