"use client";

import { useRef, useState } from "react";
import { Loader2, Volume2 } from "lucide-react";
import toast from "react-hot-toast";
import axiosClient from "@/lib/api/axiosClient";
import { getApiErrorMessage } from "@/lib/utils/apiError";
import { playWordAudio } from "@/modules/vocab/utils/audio";
import { BTN_AI, BTN_PRIMARY, BTN_SECONDARY } from "../cmsButtons";
import { POS_OPTIONS, cefrToCourseLevel } from "./vocabCms";

export type AdminVocabWord = {
  id: number;
  word: string;
  meaning: string;
  pos?: string | null;
  ipaUs?: string | null;
  ipaUk?: string | null;
  audioUs?: string | null;
  audioUk?: string | null;
  exampleEn?: string | null;
  exampleVi?: string | null;
  collocations?: Array<{ phrase: string; meaningVi: string }> | null;
  order: number;
};

type Form = {
  word: string;
  pos: string;
  meaning: string;
  ipaUs: string;
  ipaUk: string;
  exampleEn: string;
  exampleVi: string;
  audioUs: string;
  audioUk: string;
};

const FIELD =
  "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200";

const fromWord = (word: AdminVocabWord | null): Form => ({
  word: word?.word ?? "",
  pos: word?.pos || "noun",
  meaning: word?.meaning ?? "",
  ipaUs: word?.ipaUs ?? "",
  ipaUk: word?.ipaUk ?? "",
  exampleEn: word?.exampleEn ?? "",
  exampleVi: word?.exampleVi ?? "",
  audioUs: word?.audioUs ?? "",
  audioUk: word?.audioUk ?? "",
});

/**
 * One word, edited in its row (or as "Từ mới" under the list). Enter saves;
 * a new word can be saved and the form cleared for the next one.
 */
export default function VocabWordForm({
  topicId,
  word,
  level,
  nextOrder,
  onSaved,
  onCancel,
}: {
  topicId: number;
  word: AdminVocabWord | null;
  level?: string | null;
  nextOrder: number;
  onSaved: (keepOpen: boolean) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<Form>(() => fromWord(word));
  const [collocations, setCollocations] = useState(word?.collocations ?? null);
  const [saving, setSaving] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const firstField = useRef<HTMLInputElement>(null);
  const set = (key: keyof Form, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  const save = async (keepOpen: boolean) => {
    if (!form.word.trim() || !form.meaning.trim()) {
      toast.error("Cần nhập từ và nghĩa tiếng Việt.");
      return;
    }
    setSaving(true);
    const payload = {
      word: form.word.trim(),
      pos: form.pos,
      meaning: form.meaning.trim(),
      ipaUs: form.ipaUs.trim(),
      ipaUk: form.ipaUk.trim(),
      exampleEn: form.exampleEn.trim(),
      exampleVi: form.exampleVi.trim(),
      audioUs: form.audioUs.trim(),
      audioUk: form.audioUk.trim(),
      ...(collocations?.length ? { collocations } : {}),
    };
    try {
      if (word) {
        await axiosClient.patch(
          `/admin/vocab/topics/${topicId}/words/${word.id}`,
          payload,
        );
      } else {
        await axiosClient.post(`/admin/vocab/topics/${topicId}/words`, {
          ...payload,
          order: nextOrder,
        });
      }
      toast.success(word ? "Đã lưu từ." : `Đã thêm "${payload.word}".`);
      if (keepOpen) {
        setForm(fromWord(null));
        setCollocations(null);
        firstField.current?.focus();
      }
      onSaved(keepOpen);
    } catch (err: any) {
      toast.error(getApiErrorMessage(err, "Không thể lưu từ."));
    } finally {
      setSaving(false);
    }
  };

  const suggest = async () => {
    if (!form.word.trim()) {
      toast.error("Nhập từ trước khi nhờ AI gợi ý.");
      return;
    }
    setSuggesting(true);
    try {
      const response: any = await axiosClient.post(
        "/admin/vocab/ai/suggest-word",
        { word: form.word.trim(), level: cefrToCourseLevel(level) },
      );
      const data = response?.data ?? response;
      // Fills only the empty fields; what the admin typed stays.
      setForm((current) => ({
        ...current,
        pos: current.pos === "noun" && data.pos ? data.pos : current.pos,
        meaning: current.meaning || data.meaning || "",
        ipaUs: current.ipaUs || data.ipaUs || "",
        ipaUk: current.ipaUk || data.ipaUk || "",
        exampleEn: current.exampleEn || data.exampleEn || "",
        exampleVi: current.exampleVi || data.exampleVi || "",
      }));
      if (Array.isArray(data.collocations)) setCollocations(data.collocations);
      toast.success("Đã điền các ô còn trống từ gợi ý AI. Hãy kiểm tra lại.");
    } catch (err: any) {
      toast.error(getApiErrorMessage(err, "Không thể lấy gợi ý AI lúc này."));
    } finally {
      setSuggesting(false);
    }
  };

  const listen = (accent: "us" | "uk") =>
    void playWordAudio(
      form.word,
      (accent === "us" ? form.audioUs : form.audioUk) || undefined,
      accent,
    );

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void save(!word);
      }}
      className="mt-3 border-t border-slate-100 pt-3"
    >
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_160px_minmax(0,1fr)]">
        <label className="text-sm font-medium text-slate-800">
          Từ
          <input
            ref={firstField}
            autoFocus
            value={form.word}
            onChange={(event) => set("word", event.target.value)}
            className={FIELD}
          />
        </label>
        <label className="text-sm font-medium text-slate-800">
          Loại từ
          <select
            value={form.pos}
            onChange={(event) => set("pos", event.target.value)}
            className={FIELD}
          >
            {POS_OPTIONS.map((pos) => (
              <option key={pos} value={pos}>
                {pos}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium text-slate-800">
          Nghĩa tiếng Việt
          <input
            value={form.meaning}
            onChange={(event) => set("meaning", event.target.value)}
            className={FIELD}
          />
        </label>
        <label className="text-sm font-medium text-slate-800">
          Phiên âm US
          <input
            value={form.ipaUs}
            onChange={(event) => set("ipaUs", event.target.value)}
            placeholder="/əˈdʒendə/"
            className={FIELD}
          />
        </label>
        <label className="text-sm font-medium text-slate-800">
          Phiên âm UK
          <input
            value={form.ipaUk}
            onChange={(event) => set("ipaUk", event.target.value)}
            className={FIELD}
          />
        </label>
        <div className="flex items-end gap-2">
          <button
            type="button"
            onClick={() => listen("us")}
            disabled={!form.word.trim()}
            className={BTN_SECONDARY}
          >
            <Volume2 size={16} /> Nghe US
          </button>
          <button
            type="button"
            onClick={() => listen("uk")}
            disabled={!form.word.trim()}
            className={BTN_SECONDARY}
          >
            <Volume2 size={16} /> UK
          </button>
        </div>
        <label className="text-sm font-medium text-slate-800 md:col-span-3">
          Câu ví dụ (tiếng Anh)
          <input
            value={form.exampleEn}
            onChange={(event) => set("exampleEn", event.target.value)}
            className={FIELD}
          />
        </label>
        <label className="text-sm font-medium text-slate-800 md:col-span-3">
          Dịch câu ví dụ
          <input
            value={form.exampleVi}
            onChange={(event) => set("exampleVi", event.target.value)}
            className={FIELD}
          />
        </label>
        <details className="text-sm md:col-span-3">
          <summary className="cursor-pointer font-semibold text-slate-700 hover:text-slate-900">
            Audio riêng (tuỳ chọn) — không có thì học viên nghe giọng máy
          </summary>
          <div className="mt-2 grid gap-3 md:grid-cols-2">
            <label className="text-sm font-medium text-slate-800">
              Link audio US
              <input
                value={form.audioUs}
                onChange={(event) => set("audioUs", event.target.value)}
                className={FIELD}
              />
            </label>
            <label className="text-sm font-medium text-slate-800">
              Link audio UK
              <input
                value={form.audioUk}
                onChange={(event) => set("audioUk", event.target.value)}
                className={FIELD}
              />
            </label>
          </div>
        </details>
        {collocations && collocations.length > 0 && (
          <p className="text-sm text-slate-600 md:col-span-3">
            Cụm từ đi kèm:{" "}
            {collocations.map((c) => `${c.phrase} (${c.meaningVi})`).join(" · ")}
          </p>
        )}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="submit" disabled={saving} className={BTN_PRIMARY}>
          {saving && <Loader2 size={14} className="animate-spin" />}
          {word ? "Lưu từ" : "Lưu & thêm từ tiếp"}
        </button>
        {!word && (
          <button
            type="button"
            disabled={saving}
            onClick={() => void save(false)}
            className={BTN_SECONDARY}
          >
            Lưu và đóng
          </button>
        )}
        <button type="button" onClick={onCancel} className={BTN_SECONDARY}>
          Hủy
        </button>
        <button
          type="button"
          onClick={() => void suggest()}
          disabled={suggesting}
          title="AI điền nghĩa, phiên âm và câu ví dụ vào các ô còn trống."
          className={`${BTN_AI} ml-auto`}
        >
          {suggesting && <Loader2 size={14} className="animate-spin" />}
          Gợi ý bằng AI
        </button>
      </div>
    </form>
  );
}
