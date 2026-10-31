"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { BookOpenCheck, Loader2, Volume2 } from "lucide-react";
import toast from "react-hot-toast";
import axiosClient from "@/lib/api/axiosClient";
import { getApiErrorMessage } from "@/lib/utils/apiError";
import { playWordAudio } from "@/modules/vocab/utils/audio";
import { vocabService } from "@/lib/api/services/vocab.service";
import { BTN_AI, BTN_PRIMARY, BTN_SECONDARY } from "../cmsButtons";
import AudioClipField from "../AudioClipField";
import {
  DICTIONARY_STATUS,
  POS_OPTIONS,
  cefrToCourseLevel,
  entryToWord,
  isBareNumber,
  sharedEntryNote,
  type DictionaryEntry,
} from "./vocabCms";

/** IPA symbols that are not on a keyboard, inserted at the cursor. */
const IPA_SYMBOLS = [
  "ə", "ɪ", "ʊ", "æ", "ʌ", "ɑ", "ɔ", "ɜ", "ɒ", "eɪ", "aɪ", "ɔɪ", "əʊ", "oʊ", "aʊ",
  "θ", "ð", "ʃ", "ʒ", "tʃ", "dʒ", "ŋ", "ˈ", "ˌ", "ː",
];

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
  /** Decks sharing this word's dictionary entry. */
  usedInDecks?: number;
};

export type WordPayload = Record<string, unknown> & { word: string };

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
  "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200 disabled:bg-slate-100 disabled:text-slate-600";

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
 * a new word can be saved and the form cleared for the next one. In a deck,
 * a new word is first looked up in the dictionary store so a known entry is
 * linked instead of typed again. `save` replaces the deck endpoints (the
 * dictionary page uses it).
 */
export default function VocabWordForm({
  topicId,
  word,
  level,
  save: saveWord,
  onSaved,
  onCancel,
}: {
  topicId?: number;
  word: AdminVocabWord | null;
  level?: string | null;
  save?: (payload: WordPayload, isNew: boolean) => Promise<unknown>;
  onSaved: (keepOpen: boolean) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<Form>(() => fromWord(word));
  const [collocations, setCollocations] = useState(word?.collocations ?? null);
  const linkable = !word && topicId !== undefined && !saveWord;
  const [suggestions, setSuggestions] = useState<DictionaryEntry[]>([]);
  const [picked, setPicked] = useState<DictionaryEntry | null>(null);
  const [saving, setSaving] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [lookingUp, setLookingUp] = useState(false);
  const firstField = useRef<HTMLInputElement>(null);
  // The IPA field the symbol row writes into.
  const ipaTarget = useRef<"ipaUs" | "ipaUk">("ipaUs");
  const ipaInputs = {
    ipaUs: useRef<HTMLInputElement>(null),
    ipaUk: useRef<HTMLInputElement>(null),
  };
  const set = (key: keyof Form, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  // Store entries matching the word being typed for a deck.
  const typed = form.word.trim();
  const searching = linkable && !picked && typed.length >= 2;
  const shownSuggestions = searching ? suggestions : [];
  useEffect(() => {
    if (!searching) return;
    let live = true;
    const timer = setTimeout(async () => {
      try {
        const res: any = await axiosClient.get("/admin/dictionary", {
          params: { q: typed, pageSize: 6 },
        });
        const items: DictionaryEntry[] = (res?.data ?? res)?.items ?? [];
        if (live)
          setSuggestions(items.filter((entry) => entry.status !== "REJECTED"));
      } catch {
        if (live) setSuggestions([]);
      }
    }, 250);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [searching, typed]);

  const pick = (entry: DictionaryEntry) => {
    setPicked(entry);
    setSuggestions([]);
    setForm(fromWord(entryToWord(entry)));
    setCollocations(entry.collocations ?? null);
  };

  const unpick = () => {
    setPicked(null);
    setForm(fromWord(null));
    setCollocations(null);
    requestAnimationFrame(() => firstField.current?.focus());
  };

  const save = async (keepOpen: boolean) => {
    if (!form.word.trim() || !form.meaning.trim()) {
      toast.error("Cần nhập từ và nghĩa tiếng Việt.");
      return;
    }
    if (isBareNumber(form.word)) {
      toast.error("Số không dùng làm từ vựng flashcard.");
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
      const response: any = saveWord
        ? await saveWord(payload, !word)
        : word
          ? await axiosClient.patch(
              `/admin/vocab/topics/${topicId}/words/${word.id}`,
              payload,
            )
          : // The server appends a new word after the last one, linking the
            // store's entry for the same word and part of speech if one exists.
            await axiosClient.post(`/admin/vocab/topics/${topicId}/words`, payload);
      const reused = Boolean((response?.data ?? response)?.reusedEntry);
      toast.success(
        word
          ? "Đã lưu từ."
          : reused
            ? `Đã thêm "${payload.word}" từ kho từ điển.`
            : `Đã thêm "${payload.word}".`,
      );
      if (keepOpen) {
        setPicked(null);
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

  /** Phonetics and pronunciation audio from the learner's dictionary lookup. */
  const lookupPhonetics = async () => {
    if (!form.word.trim()) {
      toast.error("Nhập từ trước.");
      return;
    }
    setLookingUp(true);
    try {
      const result = await vocabService.lookupWord(form.word.trim());
      const entry = result.entries?.[0];
      const local = result.matches?.[0];
      const ipaUs = entry?.ipaUs || local?.ipaUs || "";
      const ipaUk = entry?.ipaUk || local?.ipaUk || "";
      if (!ipaUs && !ipaUk) {
        toast.error("Từ điển chưa có phiên âm cho từ này. Thử 'Gợi ý bằng AI'.");
        return;
      }
      setForm((current) => ({
        ...current,
        ipaUs: ipaUs || current.ipaUs,
        ipaUk: ipaUk || current.ipaUk,
        audioUs: current.audioUs || entry?.audio?.us || "",
        audioUk: current.audioUk || entry?.audio?.uk || "",
      }));
      toast.success("Đã điền phiên âm từ từ điển. Kiểm tra lại trước khi lưu.");
    } catch (err: any) {
      toast.error(getApiErrorMessage(err, "Không tra được từ điển lúc này."));
    } finally {
      setLookingUp(false);
    }
  };

  const insertSymbol = (symbol: string) => {
    const key = ipaTarget.current;
    const input = ipaInputs[key].current;
    const value = form[key];
    const start = input?.selectionStart ?? value.length;
    const end = input?.selectionEnd ?? value.length;
    set(key, value.slice(0, start) + symbol + value.slice(end));
    requestAnimationFrame(() => {
      input?.focus();
      input?.setSelectionRange(start + symbol.length, start + symbol.length);
    });
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
      {sharedEntryNote(word?.usedInDecks) && (
        <p className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {sharedEntryNote(word?.usedInDecks)}
        </p>
      )}
      {picked && (
        <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-slate-800">
          <p className="min-w-0 flex-1">
            <span className="font-semibold">{picked.displayWord}</span> ({picked.pos}) đã có
            trong kho từ điển
            {picked.usedInDecks ? `, đang dùng ở ${picked.usedInDecks} bộ` : ""}. Lưu sẽ thêm
            đúng mục này vào bộ; muốn sửa nội dung thì sửa trong{" "}
            <Link
              href="/admin/dictionary"
              className="font-semibold text-blue-700 underline-offset-4 hover:underline"
            >
              Kho từ điển
            </Link>
            .
          </p>
          <button type="button" onClick={unpick} className={BTN_SECONDARY}>
            Chọn từ khác
          </button>
        </div>
      )}
      <fieldset disabled={Boolean(picked)} className="grid min-w-0 gap-3 md:grid-cols-3">
        <div className="relative text-sm font-medium text-slate-800">
          <label htmlFor={`word-${word?.id ?? "new"}`}>Từ</label>
          <input
            id={`word-${word?.id ?? "new"}`}
            ref={firstField}
            autoFocus
            autoComplete="off"
            value={form.word}
            onChange={(event) => set("word", event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") setSuggestions([]);
            }}
            className={FIELD}
          />
          {shownSuggestions.length > 0 && (
            <div className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
              <p className="border-b border-slate-100 px-3 py-1.5 text-xs font-normal text-slate-600">
                Có sẵn trong kho từ điển: chọn để thêm vào bộ
              </p>
              <ul>
                {shownSuggestions.map((entry) => (
                  <li key={entry.id}>
                    <button
                      type="button"
                      onClick={() => pick(entry)}
                      className="flex w-full cursor-pointer items-baseline gap-2 px-3 py-2 text-left hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none"
                    >
                      <span className="font-semibold text-slate-950">{entry.displayWord}</span>
                      <span className="text-xs font-normal text-slate-600">{entry.pos}</span>
                      <span className="min-w-0 flex-1 truncate font-normal text-slate-700">
                        {entry.meaningVi}
                      </span>
                      {entry.status !== "APPROVED" && (
                        <span
                          className={`flex-none rounded-md px-1.5 py-0.5 text-xs font-semibold ${DICTIONARY_STATUS[entry.status].tone}`}
                        >
                          {DICTIONARY_STATUS[entry.status].label}
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <label className="text-sm font-medium text-slate-800">
          Loại từ
          <select
            value={form.pos}
            onChange={(event) => set("pos", event.target.value)}
            className={FIELD}
          >
            {/* A stored part of speech outside the list (e.g. from an
                external dictionary) stays selectable, so saving keeps it. */}
            {[
              ...((POS_OPTIONS as readonly string[]).includes(form.pos) ? [] : [form.pos]),
              ...POS_OPTIONS,
            ].map((pos) => (
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
        {(["ipaUs", "ipaUk"] as const).map((key) => {
          const accent = key === "ipaUs" ? "us" : "uk";
          return (
            <div key={key} className="text-sm font-medium text-slate-800">
              <label htmlFor={`${key}-${word?.id ?? "new"}`}>
                Phiên âm {accent.toUpperCase()}
              </label>
              <div className="mt-1 flex gap-2">
                <input
                  id={`${key}-${word?.id ?? "new"}`}
                  ref={ipaInputs[key]}
                  value={form[key]}
                  onFocus={() => (ipaTarget.current = key)}
                  onChange={(event) => set(key, event.target.value)}
                  placeholder={key === "ipaUs" ? "/əˈdʒendə/" : "/əˈdʒendə/"}
                  className={`${FIELD} mt-0 min-w-0 flex-1`}
                />
                <button
                  type="button"
                  onClick={() => listen(accent)}
                  disabled={!form.word.trim()}
                  aria-label={`Nghe giọng ${accent.toUpperCase()}`}
                  title={`Nghe giọng ${accent.toUpperCase()}`}
                  className={BTN_SECONDARY}
                >
                  <Volume2 size={16} /> {accent.toUpperCase()}
                </button>
              </div>
            </div>
          );
        })}
        <div className="flex items-end">
          <button
            type="button"
            onClick={() => void lookupPhonetics()}
            disabled={lookingUp || !form.word.trim()}
            title="Lấy phiên âm US/UK và audio từ từ điển mà học viên dùng khi tra từ."
            className={`${BTN_SECONDARY} w-full`}
          >
            {lookingUp ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <BookOpenCheck size={16} />
            )}
            Lấy phiên âm
          </button>
        </div>
        <div className="md:col-span-3">
          <p className="text-xs text-slate-600">
            Ký hiệu IPA (chèn vào ô phiên âm đang chọn):
          </p>
          <div className="mt-1 flex flex-wrap gap-1">
            {IPA_SYMBOLS.map((symbol) => (
              <button
                key={symbol}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => insertSymbol(symbol)}
                className="min-h-8 min-w-8 cursor-pointer rounded-md border border-slate-200 bg-white px-1.5 text-sm text-slate-800 hover:border-slate-400 hover:bg-slate-50"
              >
                {symbol}
              </button>
            ))}
          </div>
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
        <details
          className="text-sm md:col-span-3"
          open={Boolean(form.audioUs || form.audioUk)}
        >
          <summary className="cursor-pointer font-semibold text-slate-700 hover:text-slate-900">
            Audio phát âm (tuỳ chọn) · không có thì học viên nghe giọng đọc
            máy của trình duyệt
          </summary>
          <div className="mt-2 grid gap-4 md:grid-cols-2">
            <AudioClipField
              label="Giọng US"
              value={form.audioUs}
              onChange={(url) => set("audioUs", url)}
              fileName={`${form.word.trim() || "word"}-us`}
            />
            <AudioClipField
              label="Giọng UK"
              value={form.audioUk}
              onChange={(url) => set("audioUk", url)}
              fileName={`${form.word.trim() || "word"}-uk`}
            />
          </div>
        </details>
        {collocations && collocations.length > 0 && (
          <p className="text-sm text-slate-600 md:col-span-3">
            Cụm từ đi kèm:{" "}
            {collocations.map((c) => `${c.phrase} (${c.meaningVi})`).join(" · ")}
          </p>
        )}
      </fieldset>
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
          disabled={suggesting || Boolean(picked)}
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
