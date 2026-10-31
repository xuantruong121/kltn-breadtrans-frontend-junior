"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Loader2, Mic, Plus, Save, Send } from "lucide-react";
import toast from "react-hot-toast";
import axiosClient from "@/lib/api/axiosClient";
import { getApiErrorMessage } from "@/lib/utils/apiError";
import ImageUploadField from "@/components/admin/ImageUploadField";
import RequiredMediaNotice from "@/components/admin/RequiredMediaNotice";

type TaskType = "READ_ALOUD" | "DESCRIBE_PICTURE" | "RESPOND_TO_QUESTION" | "RESPOND_USING_INFORMATION" | "EXPRESS_OPINION";
type Stimulus = { id: number; kind: "INFORMATION" | "IMAGE"; title?: string | null; content?: string | null; imageUrl?: string | null };
type Exercise = { id: number; title: string; targetText: string; taskType: TaskType; imageUrl?: string | null; stimulusId?: number | null; publicationStatus: "DRAFT" | "PUBLISHED"; order?: number | null };
type PracticeSet = { id: string; title: string; scope: "EXAM_INTERNAL"; publicationStatus: "DRAFT" | "PUBLISHED"; exercises: Exercise[] };

const SLOT_TYPES: readonly TaskType[] = [
  "READ_ALOUD", "READ_ALOUD", "DESCRIBE_PICTURE", "DESCRIBE_PICTURE",
  "RESPOND_TO_QUESTION", "RESPOND_TO_QUESTION", "RESPOND_TO_QUESTION",
  "RESPOND_USING_INFORMATION", "RESPOND_USING_INFORMATION", "RESPOND_USING_INFORMATION",
  "EXPRESS_OPINION",
];
const TASK_LABELS: Record<TaskType, string> = {
  READ_ALOUD: "Đọc thành tiếng",
  DESCRIBE_PICTURE: "Mô tả hình ảnh",
  RESPOND_TO_QUESTION: "Trả lời câu hỏi",
  RESPOND_USING_INFORMATION: "Trả lời dựa trên thông tin",
  EXPRESS_OPINION: "Trình bày ý kiến",
};
const IMAGE_SLOTS = new Set([3, 4]);
const INFORMATION_SLOTS = new Set([8, 9, 10]);
const unwrap = <T,>(value: any): T => (value?.data ?? value) as T;
const inputClassName = () => "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200";

export default function ToeicSpeakingExamComposer({ examId, onChanged }: { examId: number; onChanged?: () => void }) {
  const [source, setSource] = useState<PracticeSet | null>(null);
  const [stimuli, setStimuli] = useState<Stimulus[]>([]);
  const [selectedSlot, setSelectedSlot] = useState(1);
  const [form, setForm] = useState({ title: "", targetText: "", imageUrl: "", stimulusId: "" });
  const [newStimulusTitle, setNewStimulusTitle] = useState("");
  const [newStimulusContent, setNewStimulusContent] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isCreatingStimulus, setIsCreatingStimulus] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const selectedType = SLOT_TYPES[selectedSlot - 1];
  const selectedExercise = source?.exercises.find((exercise) => exercise.order === selectedSlot);
  const readyCount = useMemo(() => source?.exercises.filter((exercise) => exercise.order).length ?? 0, [source]);

  const load = async () => {
    setIsLoading(true);
    try {
      const [sourceResponse, stimuliResponse] = await Promise.all([
        axiosClient.get(`/admin/exams/${examId}/speaking`),
        axiosClient.get(`/admin/exams/${examId}/speaking/stimuli`),
      ]);
      setSource(unwrap<PracticeSet>(sourceResponse));
      setStimuli(unwrap<Stimulus[]>(stimuliResponse));
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Không thể tải nguồn Speaking của đề."));
    } finally { setIsLoading(false); }
  };

  useEffect(() => {
    // Initial request synchronizes the contextual editor with the Exam source.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    // `load` is intentionally scoped to this component and keyed by Exam id.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examId]);
  useEffect(() => {
    const exercise = source?.exercises.find((candidate) => candidate.order === selectedSlot);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm({ title: exercise?.title ?? `TOEIC Speaking — Câu ${selectedSlot}`, targetText: exercise?.targetText ?? "", imageUrl: exercise?.imageUrl ?? "", stimulusId: exercise?.stimulusId ? String(exercise.stimulusId) : "" });
  }, [selectedSlot, source]);

  const save = async () => {
    if (!form.title.trim() || !form.targetText.trim()) { toast.error("Cần nhập tiêu đề và prompt cho câu Speaking."); return; }
    setIsSaving(true);
    try {
      const payload = { title: form.title.trim(), targetText: form.targetText.trim(), taskType: selectedType, difficulty: "INTERMEDIATE", order: selectedSlot, imageUrl: IMAGE_SLOTS.has(selectedSlot) ? form.imageUrl.trim() || null : null, stimulusId: INFORMATION_SLOTS.has(selectedSlot) ? Number(form.stimulusId) || null : null };
      if (selectedExercise) await axiosClient.patch(`/admin/exams/${examId}/speaking/exercises/${selectedExercise.id}`, { ...payload, order: undefined });
      else await axiosClient.post(`/admin/exams/${examId}/speaking/exercises`, payload);
      toast.success(`Đã lưu câu ${selectedSlot}.`);
      await load(); onChanged?.();
    } catch (error) { toast.error(getApiErrorMessage(error, "Không thể lưu câu Speaking.")); }
    finally { setIsSaving(false); }
  };

  const createStimulus = async () => {
    if (!newStimulusContent.trim()) return;
    setIsCreatingStimulus(true);
    try {
      const response: any = await axiosClient.post(`/admin/exams/${examId}/speaking/stimuli`, { kind: "INFORMATION", title: newStimulusTitle.trim() || undefined, content: newStimulusContent.trim() });
      const stimulus = unwrap<Stimulus>(response);
      setNewStimulusTitle(""); setNewStimulusContent(""); setForm((current) => ({ ...current, stimulusId: String(stimulus.id) }));
      await load(); toast.success("Đã tạo stimulus INFORMATION.");
    } catch (error) { toast.error(getApiErrorMessage(error, "Không thể tạo stimulus.")); }
    finally { setIsCreatingStimulus(false); }
  };

  const publishSource = async () => {
    setIsPublishing(true);
    try { await axiosClient.post(`/admin/exams/${examId}/speaking/publish`); toast.success("Đã xuất bản nguồn Speaking nội bộ; parent Exam vẫn là bản nháp."); await load(); onChanged?.(); }
    catch (error) { toast.error(getApiErrorMessage(error, "Nguồn Speaking chưa đủ điều kiện xuất bản.")); }
    finally { setIsPublishing(false); }
  };

  if (isLoading) return <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500"><Loader2 className="animate-spin" size={16} /> Đang tải trình soạn Speaking...</div>;
  if (!source) return null;

  return <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-4">
      <div><div className="flex items-center gap-2 text-sm font-bold text-slate-900"><Mic size={17} className="text-indigo-600" /> Speaking nội bộ của Exam</div><p className="mt-1 text-xs text-slate-500">Bộ câu này chỉ dùng trong đề thi, không hiện trong mục luyện nói. Trạng thái xuất bản do đề thi quản lý.</p></div>
      <div className="flex items-center gap-2 text-sm"><span className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-700">{readyCount}/11 sẵn sàng</span>{source.publicationStatus === "DRAFT" && <button type="button" onClick={() => void publishSource()} disabled={isPublishing || readyCount !== 11} className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50">{isPublishing ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Xuất bản nguồn</button>}</div>
    </div>
    <div className="grid gap-5 lg:grid-cols-[minmax(190px,0.75fr)_minmax(0,1.5fr)]">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2">{SLOT_TYPES.map((type, index) => { const order = index + 1; const exercise = source.exercises.find((candidate) => candidate.order === order); const active = order === selectedSlot; return <button key={order} type="button" onClick={() => setSelectedSlot(order)} className={`rounded-xl border p-3 text-left transition ${active ? "border-indigo-300 bg-indigo-50 ring-2 ring-indigo-100" : "border-slate-200 bg-slate-50 hover:border-indigo-200 hover:bg-indigo-50/50"}`} aria-label={`Mở câu ${order}`}><div className="flex items-center justify-between gap-2"><span className="text-xs font-black text-slate-900">Q{order}</span>{exercise?.publicationStatus === "PUBLISHED" ? <CheckCircle2 size={14} className="text-emerald-600" /> : null}</div><p className="mt-1 line-clamp-2 text-xs leading-4 text-slate-600">{TASK_LABELS[type]}</p></button>; })}</div>
      <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-xs font-bold uppercase tracking-[.14em] text-slate-500">Câu {selectedSlot}</p><h3 className="mt-1 text-lg font-bold text-slate-950">{TASK_LABELS[selectedType]}</h3></div><span className="rounded-full border border-indigo-200 bg-white px-3 py-1 text-xs font-semibold text-indigo-700">{selectedType}</span></div>
        <label className="block text-sm font-semibold text-slate-700">Tiêu đề câu<input className={inputClassName()} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} aria-label={`Tiêu đề câu ${selectedSlot}`} /></label>
        <label className="block text-sm font-semibold text-slate-700">Prompt / target text<textarea className={`${inputClassName()} min-h-28 resize-y`} value={form.targetText} onChange={(event) => setForm({ ...form, targetText: event.target.value })} aria-label={`Prompt câu ${selectedSlot}`} /></label>
        {IMAGE_SLOTS.has(selectedSlot) && <div className="space-y-2"><ImageUploadField label="Ảnh mô tả *" value={form.imageUrl} onChange={(imageUrl) => setForm({ ...form, imageUrl })} helperText="Dùng ảnh PNG, JPG hoặc WEBP cho câu mô tả hình." />{!form.imageUrl.trim() && <RequiredMediaNotice />}</div>}
        {INFORMATION_SLOTS.has(selectedSlot) && <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50/70 p-3"><label className="block text-sm font-semibold text-slate-700">Stimulus INFORMATION dùng chung Q8–Q10<select className={inputClassName()} value={form.stimulusId} onChange={(event) => setForm({ ...form, stimulusId: event.target.value })} aria-label={`Stimulus câu ${selectedSlot}`}><option value="">Chọn stimulus</option>{stimuli.filter((stimulus) => stimulus.kind === "INFORMATION").map((stimulus) => <option key={stimulus.id} value={stimulus.id}>{stimulus.title || `Stimulus #${stimulus.id}`}</option>)}</select></label><input className={inputClassName()} value={newStimulusTitle} onChange={(event) => setNewStimulusTitle(event.target.value)} placeholder="Tên lịch / bảng thông tin mới" aria-label="Tên stimulus mới" /><textarea className={`${inputClassName()} min-h-20 resize-y`} value={newStimulusContent} onChange={(event) => setNewStimulusContent(event.target.value)} placeholder="Nội dung lịch hội thảo, sự kiện hoặc thông tin dịch vụ..." aria-label="Nội dung stimulus mới" /><button type="button" onClick={() => void createStimulus()} disabled={isCreatingStimulus || !newStimulusContent.trim()} className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-white px-3 py-2 text-xs font-semibold text-amber-800 transition hover:bg-amber-100 disabled:opacity-50">{isCreatingStimulus ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Tạo stimulus INFORMATION</button></div>}
        <div className="flex justify-end border-t border-slate-200 pt-3"><button type="button" onClick={() => void save()} disabled={isSaving} className="inline-flex items-center gap-1.5 rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50">{isSaving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Lưu câu {selectedSlot}</button></div>
      </div>
    </div>
  </section>;
}
