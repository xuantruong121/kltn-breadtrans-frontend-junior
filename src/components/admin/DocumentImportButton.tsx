"use client";

import { useRef, useState } from "react";
import { FileUp, Loader2, X } from "lucide-react";
import toast from "react-hot-toast";
import axiosClient from "@/lib/api/axiosClient";
import { getApiErrorMessage } from "@/lib/utils/apiError";
import { BTN_SECONDARY } from "@/components/admin/cmsButtons";

type DocumentText = { text: string; totalChars: number; truncated: boolean };

/** Reads a PDF, DOCX or TXT in the browser's place; the file itself is not kept. */
export default function DocumentImportButton({
  onText,
  disabled,
}: {
  onText: (text: string) => void;
  disabled?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [reading, setReading] = useState(false);
  const [loaded, setLoaded] = useState<{
    name: string;
    truncated: boolean;
    used: number;
    total: number;
  } | null>(null);

  const read = async (file?: File) => {
    if (!file) return;
    setReading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const response: any = await axiosClient.post("/admin/ai/document-text", body, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const data = (response?.data ?? response) as DocumentText;
      onText(data.text);
      setLoaded({
        name: file.name,
        truncated: data.truncated,
        used: data.text.length,
        total: data.totalChars,
      });
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Không đọc được tệp này."));
    } finally {
      setReading(false);
      if (input.current) input.current.value = "";
    }
  };

  if (loaded)
    return (
      <span className="inline-flex min-h-10 max-w-full items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700">
        <span className="truncate" title={loaded.name}>
          {loaded.name}
          {loaded.truncated
            ? ` · dùng ${loaded.used.toLocaleString("vi-VN")}/${loaded.total.toLocaleString("vi-VN")} ký tự`
            : ""}
        </span>
        <button
          type="button"
          aria-label="Bỏ tài liệu"
          onClick={() => {
            setLoaded(null);
            onText("");
          }}
          className="rounded p-0.5 hover:bg-slate-200"
        >
          <X size={14} />
        </button>
      </span>
    );

  return (
    <>
      <input
        ref={input}
        type="file"
        accept=".pdf,.docx,.txt"
        className="hidden"
        aria-label="Chọn tài liệu"
        onChange={(event) => void read(event.target.files?.[0])}
      />
      <button
        type="button"
        disabled={disabled || reading}
        onClick={() => input.current?.click()}
        title="PDF, DOCX hoặc TXT có chữ, tối đa 10 MB. Chỉ dùng tài liệu được phép sử dụng."
        className={BTN_SECONDARY}
      >
        {reading ? (
          <Loader2 size={15} className="animate-spin" />
        ) : (
          <FileUp size={15} />
        )}
        Nhập từ tài liệu
      </button>
    </>
  );
}
