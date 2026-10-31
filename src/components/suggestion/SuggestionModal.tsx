"use client";

import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { ExternalLink, FileText, ImagePlus, Link2, Loader2, MessageSquare, Paperclip, Trash2, X } from "lucide-react";
import { useModalAccessibility } from "@/hooks/useModalAccessibility";
import {
  SuggestionAttachment,
  SuggestionCategory,
  SuggestionStatus,
  suggestionService,
} from "@/lib/api/services/suggestion.service";
import { getApiErrorMessage } from "@/lib/utils/apiError";

const categoryOptions: Array<{ value: SuggestionCategory; label: string }> = [
  { value: "FEATURE", label: "Tính năng" },
  { value: "CONTENT", label: "Nội dung học" },
  { value: "UI", label: "Giao diện" },
  { value: "BUG", label: "Lỗi kỹ thuật" },
  { value: "OTHER", label: "Khác" },
];

const statusLabels: Record<SuggestionStatus, string> = {
  PENDING: "Đã nhận", REVIEWING: "Đang xem xét", RESPONDED: "Đã phản hồi", RESOLVED: "Đã hoàn tất", REJECTED: "Chưa áp dụng",
};

function isHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch { return false; }
}

export function SuggestionModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const modalRef = useRef<HTMLDivElement>(null);
  const firstControlRef = useRef<HTMLButtonElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"new" | "mine">("new");
  const [category, setCategory] = useState<SuggestionCategory>("FEATURE");
  const [content, setContent] = useState("");
  const [attachments, setAttachments] = useState<SuggestionAttachment[]>([]);
  const [linkValue, setLinkValue] = useState("");
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [uploading, setUploading] = useState(false);

  useModalAccessibility({ isOpen, onClose, modalRef, initialFocusRef: firstControlRef });

  const mineQuery = useQuery({
    queryKey: ["suggestions", "mine"],
    queryFn: () => suggestionService.listMine({ limit: 30 }),
    enabled: isOpen && tab === "mine",
  });

  const createMutation = useMutation({
    mutationFn: () => suggestionService.create({ category, content: content.trim(), attachments }),
    onSuccess: () => {
      toast.success("Đã gửi đề xuất. Cảm ơn bạn đã góp ý cho BreadTrans.");
      setContent(""); setAttachments([]); setLinkValue(""); setShowLinkInput(false); setTab("mine");
      queryClient.invalidateQueries({ queryKey: ["suggestions", "mine"] });
    },
    onError: (error) => toast.error(getApiErrorMessage(error, "Không thể gửi đề xuất lúc này.")),
  });

  if (!isOpen || typeof document === "undefined") return null;

  const addLink = () => {
    const url = linkValue.trim();
    if (!isHttpUrl(url)) { toast.error("Liên kết cần bắt đầu bằng http:// hoặc https://."); return; }
    if (attachments.length >= 5) { toast.error("Bạn chỉ có thể đính kèm tối đa 5 mục."); return; }
    const host = new URL(url).hostname.replace(/^www\./, "");
    setAttachments((current) => [...current, { type: "LINK", name: host, url }]);
    setLinkValue(""); setShowLinkInput(false);
  };

  const upload = async (file?: File) => {
    if (!file) return;
    if (attachments.length >= 5) { toast.error("Bạn chỉ có thể đính kèm tối đa 5 mục."); return; }
    const image = file.type.startsWith("image/");
    const accepted = image
      ? ["image/jpeg", "image/png", "image/webp"].includes(file.type)
      : ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "text/plain"].includes(file.type);
    if (!accepted || file.size > 10 * 1024 * 1024) { toast.error("Chỉ nhận PNG/JPG/WEBP hoặc PDF/DOC/DOCX/TXT, tối đa 10 MB."); return; }
    setUploading(true);
    try {
      const attachment = await suggestionService.uploadAttachment(file);
      setAttachments((current) => [...current, attachment]);
    }
    catch (error) { toast.error(getApiErrorMessage(error, "Không thể tải tệp lên.")); }
    finally { setUploading(false); }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-slate-950/45 p-0 sm:p-5" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div ref={modalRef} role="dialog" aria-modal="true" aria-labelledby="suggestion-modal-title" tabIndex={-1} className="w-full sm:max-w-2xl max-h-[92dvh] overflow-y-auto rounded-t-3xl sm:rounded-3xl border border-slate-200 bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-100 bg-white/95 px-5 py-4 backdrop-blur sm:px-6">
          <div><h2 id="suggestion-modal-title" className="flex items-center gap-2 text-lg font-black text-slate-900"><MessageSquare size={19} className="text-orange-600" />Đề xuất & Góp ý</h2><p className="mt-1 text-xs text-slate-500">Ý kiến của bạn giúp trải nghiệm học tốt hơn.</p></div>
          <button ref={firstControlRef} type="button" onClick={onClose} className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500" aria-label="Đóng"><X size={19} /></button>
        </div>
        <div className="px-5 pt-4 sm:px-6"><div role="tablist" aria-label="Đề xuất của bạn" className="grid grid-cols-2 rounded-xl bg-slate-100 p-1 text-sm font-bold"><button role="tab" aria-selected={tab === "new"} onClick={() => setTab("new")} className={`rounded-lg px-3 py-2 transition ${tab === "new" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}>Gửi đề xuất</button><button role="tab" aria-selected={tab === "mine"} onClick={() => setTab("mine")} className={`rounded-lg px-3 py-2 transition ${tab === "mine" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}>Đề xuất của tôi</button></div></div>
        {tab === "new" ? <form className="space-y-4 p-5 sm:p-6" onSubmit={(event) => { event.preventDefault(); if (content.trim().length < 10) { toast.error("Vui lòng mô tả ít nhất 10 ký tự."); return; } createMutation.mutate(); }}>
          <label className="block text-sm font-bold text-slate-700">Nhóm góp ý<select value={category} onChange={(event) => setCategory(event.target.value as SuggestionCategory)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100">{categoryOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
          <label className="block text-sm font-bold text-slate-700">Nội dung<textarea value={content} onChange={(event) => setContent(event.target.value.slice(0, 2000))} rows={5} placeholder="Mô tả điều bạn muốn cải thiện hoặc gặp khó khăn..." className="mt-1.5 w-full resize-y rounded-xl border border-slate-200 px-3 py-2.5 text-sm leading-6 outline-none placeholder:text-slate-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-100" /><span className="mt-1 block text-right text-xs text-slate-400">{content.length}/2000 · tối thiểu 10 ký tự</span></label>
          <div><p className="text-sm font-bold text-slate-700">Đính kèm <span className="font-normal text-slate-400">(tối đa 5)</span></p><div className="mt-2 flex flex-wrap gap-2"><button type="button" disabled={uploading} onClick={() => imageInputRef.current?.click()} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:border-orange-300 hover:bg-orange-50 disabled:opacity-60"><ImagePlus size={15} />Ảnh</button><button type="button" disabled={uploading} onClick={() => fileInputRef.current?.click()} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:border-orange-300 hover:bg-orange-50 disabled:opacity-60"><Paperclip size={15} />Tệp</button><button type="button" disabled={uploading} onClick={() => setShowLinkInput((value) => !value)} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:border-orange-300 hover:bg-orange-50 disabled:opacity-60"><Link2 size={15} />Liên kết</button>{uploading && <span className="inline-flex items-center gap-1.5 px-2 text-xs text-slate-500"><Loader2 size={14} className="animate-spin" />Đang tải</span>}</div><input ref={imageInputRef} className="hidden" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { void upload(event.target.files?.[0]); event.currentTarget.value = ""; }} /><input ref={fileInputRef} className="hidden" type="file" accept=".pdf,.doc,.docx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain" onChange={(event) => { void upload(event.target.files?.[0]); event.currentTarget.value = ""; }} />
          {showLinkInput && <div className="mt-2 flex gap-2"><input value={linkValue} onChange={(event) => setLinkValue(event.target.value)} placeholder="https://..." className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400" /><button type="button" onClick={addLink} className="rounded-xl bg-slate-900 px-3 text-xs font-bold text-white hover:bg-slate-700">Thêm</button></div>}
          {attachments.length > 0 && <ul className="mt-3 space-y-2">{attachments.map((attachment, index) => <li key={`${attachment.url}-${index}`} className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-700"><FileText size={15} className="shrink-0 text-slate-400" /><span className="min-w-0 flex-1 truncate">{attachment.name}</span><button type="button" aria-label={`Bỏ ${attachment.name}`} onClick={() => setAttachments((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 size={14} /></button></li>)}</ul>}</div>
          <div className="flex justify-end border-t border-slate-100 pt-4"><button type="submit" disabled={createMutation.isPending || uploading} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-orange-600 px-5 text-sm font-bold text-white shadow-sm transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60">{createMutation.isPending && <Loader2 size={16} className="animate-spin" />}Gửi đề xuất</button></div>
        </form> : <div className="space-y-3 p-5 sm:p-6">{mineQuery.isLoading ? <div className="flex justify-center py-10 text-slate-400"><Loader2 className="animate-spin" /></div> : mineQuery.data?.data.length ? mineQuery.data.data.map((item) => <article key={item.id} className="rounded-2xl border border-slate-200 p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-bold text-slate-900">{categoryOptions.find((option) => option.value === item.category)?.label}</p><p className="mt-1 text-xs text-slate-500">{new Date(item.createdAt).toLocaleDateString("vi-VN")}</p></div><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">{statusLabels[item.status]}</span></div><p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">{item.content}</p>{item.attachments.length > 0 && <AttachmentList attachments={item.attachments} />}{item.adminResponse && <div className="mt-3 rounded-xl border border-orange-100 bg-orange-50 p-3"><p className="text-xs font-black text-orange-800">Phản hồi từ BreadTrans</p><p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-orange-950">{item.adminResponse}</p></div>}</article>) : <div className="py-10 text-center"><MessageSquare className="mx-auto text-slate-300" /><p className="mt-3 text-sm font-bold text-slate-600">Bạn chưa gửi đề xuất nào.</p></div>}</div>}
      </div>
    </div>, document.body);
}

export function AttachmentList({ attachments }: { attachments: SuggestionAttachment[] }) {
  if (!attachments.length) return null;
  return <div className="mt-3 flex flex-wrap gap-2">{attachments.map((attachment, index) => attachment.type === "IMAGE" ? <a key={`${attachment.url}-${index}`} href={attachment.url} target="_blank" rel="noopener noreferrer" className="overflow-hidden rounded-lg border border-slate-200"><img src={attachment.url} alt={attachment.name} className="size-14 object-cover" /></a> : <a key={`${attachment.url}-${index}`} href={attachment.url} target="_blank" rel="noopener noreferrer" className="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold text-slate-700 hover:border-orange-300 hover:text-orange-700"><FileText size={13} /><span className="max-w-40 truncate">{attachment.name}</span><ExternalLink size={12} /></a>)}</div>;
}
