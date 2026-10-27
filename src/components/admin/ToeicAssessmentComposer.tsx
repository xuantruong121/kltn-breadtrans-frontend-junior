"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  ExternalLink,
  Loader2,
  Plus,
  ShieldAlert,
} from "lucide-react";
import toast from "react-hot-toast";
import axiosClient from "@/lib/api/axiosClient";
import { legacyAssessmentTreatment } from "@/lib/examStudio/legacyRouteLogic";
import { getApiErrorMessage } from "@/lib/utils/apiError";

type Family = "TOEIC_LR" | "TOEIC_SW" | "TOEIC_4_SKILLS";
type Assessment = {
  id: number;
  title: string;
  description?: string | null;
  productFamily: Family;
  publicationStatus: string;
  components: any[];
  readiness?: any[];
  examId?: number | null;
};
type Source = {
  id: number | string;
  title: string;
  publicationStatus?: string;
  items?: any[];
};

const familyLabels: Record<Family, string> = {
  TOEIC_LR: "TOEIC L&R — Listening + Reading",
  TOEIC_SW: "TOEIC S&W — Speaking + Writing",
  TOEIC_4_SKILLS: "TOEIC 4 kỹ năng",
};

export default function ToeicAssessmentComposer() {
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [exams, setExams] = useState<Source[]>([]);
  const [speaking, setSpeaking] = useState<Source[]>([]);
  const [writing, setWriting] = useState<Source[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [family, setFamily] = useState<Family>("TOEIC_4_SKILLS");
  const [lrId, setLrId] = useState("");
  const [speakingId, setSpeakingId] = useState("");
  const [writingId, setWritingId] = useState("");
  const [busy, setBusy] = useState(false);

  const active = useMemo(
    () => assessments.find((item) => item.id === selectedId) ?? null,
    [assessments, selectedId],
  );

  const load = async () => {
    const [
      assessmentResponse,
      examResponse,
      speakingResponse,
      writingResponse,
    ] = await Promise.all([
      axiosClient.get("/admin/toeic/assessments"),
      axiosClient.get("/admin/exams"),
      axiosClient.get("/admin/skill-content/speaking"),
      axiosClient.get("/admin/toeic/writing-sets"),
    ]);
    setAssessments(Array.isArray(assessmentResponse) ? assessmentResponse : []);
    setExams(Array.isArray(examResponse) ? examResponse : []);
    setSpeaking(Array.isArray(speakingResponse) ? speakingResponse : []);
    setWriting(Array.isArray(writingResponse) ? writingResponse : []);
  };

  useEffect(() => {
    // The initial request synchronizes the editor with the server catalog.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load().catch(() =>
      toast.error("Không tải được dữ liệu TOEIC composition."),
    );
  }, []);

  const selectAssessment = (item: Assessment) => {
    setSelectedId(item.id);
    setTitle(item.title);
    setDescription(item.description ?? "");
    setFamily(item.productFamily);
    setLrId(
      String(
        item.components.find(
          (component) => component.kind === "LISTENING_READING",
        )?.sourceId ?? "",
      ),
    );
    setSpeakingId(
      String(
        item.components.find((component) => component.kind === "SPEAKING")
          ?.sourceId ?? "",
      ),
    );
    setWritingId(
      String(
        item.components.find((component) => component.kind === "WRITING")
          ?.sourceId ?? "",
      ),
    );
  };

  const createDraft = async () => {
    if (!title.trim()) return toast.error("Nhập tên assessment trước.");
    setBusy(true);
    try {
      const created = (await axiosClient.post("/admin/toeic/assessments", {
        title,
        description,
        productFamily: family,
      })) as unknown as Assessment;
      await load();
      selectAssessment(created as Assessment);
      toast.success("Đã tạo draft composition.");
    } catch (error: any) {
      toast.error(error?.response?.data?.message ?? "Không tạo được draft.");
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    if (!selectedId) return toast.error("Chọn hoặc tạo một draft.");
    setBusy(true);
    try {
      await axiosClient.patch(`/admin/toeic/assessments/${selectedId}`, {
        title,
        description,
        productFamily: family,
      });
      const components = [
        ...(family !== "TOEIC_SW"
          ? [{ kind: "LISTENING_READING", order: 1, lrExamSetId: Number(lrId) }]
          : []),
        ...(family === "TOEIC_4_SKILLS"
          ? [{ kind: "SPEAKING", order: 2, speakingPracticeSetId: speakingId }]
          : family === "TOEIC_SW"
            ? [
                {
                  kind: "SPEAKING",
                  order: 1,
                  speakingPracticeSetId: speakingId,
                },
              ]
            : []),
        ...(family !== "TOEIC_LR"
          ? [
              {
                kind: "WRITING",
                order: family === "TOEIC_4_SKILLS" ? 3 : 2,
                writingSetId: Number(writingId),
              },
            ]
          : []),
      ];
      await axiosClient.patch(
        `/admin/toeic/assessments/${selectedId}/components`,
        { components },
      );
      await load();
      toast.success("Đã lưu composition draft.");
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ?? "Không lưu được composition.",
      );
    } finally {
      setBusy(false);
    }
  };

  const publish = async () => {
    if (!selectedId) return;
    setBusy(true);
    try {
      await axiosClient.post(`/admin/toeic/assessments/${selectedId}/publish`);
      await load();
      toast.success("Đã publish assessment.");
    } catch (error: any) {
      toast.error(
        getApiErrorMessage(
          error,
          "Chưa thể xuất bản: còn phần thi chưa sẵn sàng.",
        ),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto max-w-7xl space-y-6 p-6 text-slate-900">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-600">
            Luyện đề / TOEIC
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">
            Cấu trúc đề TOEIC
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">
            Thiết lập các phần của đề TOEIC. Nội dung từng kỹ năng vẫn được
            soạn ở trang quản lý của từng kỹ năng.
          </p>
        </div>
        <button
          type="button"
          onClick={createDraft}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-800 disabled:opacity-50"
        >
          <Plus size={16} /> Tạo đề nháp
        </button>
      </header>

      <section className="grid gap-5 lg:grid-cols-[280px_1fr]">
        <aside className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <h2 className="px-3 py-2 text-sm font-semibold text-slate-500">
            Các đề TOEIC
          </h2>
          <div className="space-y-1">
            {assessments.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => selectAssessment(item)}
                className={`w-full rounded-xl px-3 py-3 text-left transition ${item.id === selectedId ? "bg-orange-50 text-orange-800 ring-1 ring-orange-200" : "hover:bg-slate-50"}`}
              >
                <span className="block text-sm font-semibold">
                  {item.title}
                </span>
                <span className="mt-1 block text-xs text-slate-500">
                  {({ TOEIC_LR: "TOEIC Listening & Reading", TOEIC_SW: "TOEIC Speaking & Writing", TOEIC_4_SKILLS: "TOEIC 4 kỹ năng" } as Record<string, string>)[item.productFamily] ?? item.productFamily} · {item.publicationStatus === "PUBLISHED" ? "Đã xuất bản" : "Bản nháp"}
                </span>
              </button>
            ))}
            {!assessments.length && (
              <p className="px-3 py-6 text-sm text-slate-400">
                Chưa có đề TOEIC nào.
              </p>
            )}
          </div>
        </aside>

        {legacyAssessmentTreatment(active) === "REDIRECT_TO_STUDIO" ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <p className="text-sm font-semibold text-slate-900">
              Trang quản lý cũ
            </p>
            <p className="mt-2 max-w-lg text-sm text-slate-600">
              Nội dung này hiện được quản lý trong Luyện đề. Chỉnh sửa trực
              tiếp tại trang này đã bị khóa để tránh hai quy trình soạn đề
              cạnh tranh nhau.
            </p>
            <Link
              href={`/admin/exams/${active?.examId}`}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
            >
              <ExternalLink size={15} /> Đi tới Luyện đề
            </Link>
          </section>
        ) : (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm font-semibold">
              Tên đề
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 font-normal outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                placeholder="VD: TOEIC 4 kỹ năng — Đề luyện tập 01"
              />
            </label>
            <label className="text-sm font-semibold">
              Loại đề TOEIC
              <select
                value={family}
                onChange={(event) => setFamily(event.target.value as Family)}
                className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 font-normal outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
              >
                {Object.entries(familyLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="mt-4 block text-sm font-semibold">
            Mô tả
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="mt-2 min-h-24 w-full rounded-xl border border-slate-200 px-3 py-2.5 font-normal outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
            />
          </label>

          <div className="mt-6 space-y-4 rounded-2xl bg-slate-50 p-4">
            {family !== "TOEIC_SW" && (
              <SourceSelect
                label="1 · Đề Listening & Reading"
                value={lrId}
                onChange={setLrId}
                sources={exams}
                empty="Chọn đề L&R đã xuất bản"
              />
            )}
            {family !== "TOEIC_LR" && (
              <SourceSelect
                label={`${family === "TOEIC_4_SKILLS" ? "2" : "1"} · Bộ luyện Speaking`}
                value={speakingId}
                onChange={setSpeakingId}
                sources={speaking}
                stringValue
                onChangeString={setSpeakingId}
                empty="Chọn bộ luyện nói; khi xuất bản sẽ kiểm tra đủ 11 câu"
              />
            )}
            {family !== "TOEIC_LR" && (
              <SourceSelect
                label={`${family === "TOEIC_4_SKILLS" ? "3" : "2"} · Writing · 8 câu`}
                value={writingId}
                onChange={setWritingId}
                sources={writing}
                empty="Chọn nội dung Writing đã xuất bản"
              />
            )}
          </div>

          {active?.readiness?.some((item) => !item.ready) && (
            <div className="mt-5 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <ShieldAlert className="mt-0.5 shrink-0" size={18} />
              <span>
                Chưa thể xuất bản: còn phần thi chưa được chọn hoặc chưa xuất bản.
              </span>
            </div>
          )}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <CheckCircle2 size={15} className="text-emerald-600" /> Nội dung
              từng kỹ năng được soạn ở trang quản lý của kỹ năng đó
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={save}
                disabled={busy || !selectedId}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold transition hover:border-slate-400 disabled:opacity-50"
              >
                {busy ? (
                  <Loader2 className="animate-spin" size={16} />
                ) : (
                  "Lưu bản nháp"
                )}
              </button>
              <button
                type="button"
                onClick={publish}
                disabled={
                  busy || !selectedId || active?.publicationStatus !== "DRAFT"
                }
                className="rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-700 disabled:opacity-50"
              >
                Xuất bản
              </button>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-500">
            <Link
              href="/admin/exams"
              className="inline-flex items-center gap-1 hover:text-slate-900"
            >
              Sửa phần L&R <ExternalLink size={13} />
            </Link>
            <Link
              href="/admin/speaking"
              className="inline-flex items-center gap-1 hover:text-slate-900"
            >
              Sửa phần Speaking <ExternalLink size={13} />
            </Link>
            <Link
              href="/admin/toeic/writing-sets"
              className="inline-flex items-center gap-1 hover:text-slate-900"
            >
              Sửa phần Writing <ExternalLink size={13} />
            </Link>
          </div>
        </section>
        )}
      </section>
    </main>
  );
}

function SourceSelect({
  label,
  value,
  onChange,
  onChangeString,
  sources,
  empty,
  stringValue = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onChangeString?: (value: string) => void;
  sources: Source[];
  empty: string;
  stringValue?: boolean;
}) {
  return (
    <label className="block text-sm font-semibold">
      {label}
      <select
        value={value}
        onChange={(event) =>
          stringValue
            ? onChangeString?.(event.target.value)
            : onChange(event.target.value)
        }
        className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-normal outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
      >
        <option value="">{empty}</option>
        {sources.map((source) => (
          <option key={String(source.id)} value={String(source.id)}>
            {source.title}{" "}
            {source.publicationStatus ? `· ${source.publicationStatus === "PUBLISHED" ? "Đã xuất bản" : "Bản nháp"}` : ""}
          </option>
        ))}
      </select>
    </label>
  );
}
