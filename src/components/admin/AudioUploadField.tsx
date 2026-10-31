"use client";

import React, { useRef, useState } from "react";
import { Volume2, Loader2, Trash2, Upload, ChevronDown, ChevronUp, Link as LinkIcon } from "lucide-react";
import toast from "react-hot-toast";
import axiosClient from "@/lib/api/axiosClient";
import { getApiErrorMessage } from "@/lib/utils/apiError";

interface AudioUploadFieldProps {
  label?: string;
  value: string;
  onChange: (url: string) => void;
  disabled?: boolean;
  helperText?: string;
  /** Playable URL when `value` is a stored key, not a URL (signed by the API). */
  previewUrl?: string;
}

export default function AudioUploadField({
  label = "Tệp âm thanh nghe (Audio)",
  value,
  onChange,
  disabled = false,
  helperText = "Hỗ trợ định dạng MP3, WAV, AAC, M4A tối đa 50MB.",
  previewUrl,
}: AudioUploadFieldProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [showExternalInput, setShowExternalInput] = useState(false);
  const [externalUrl, setExternalUrl] = useState("");
  const [showTechnicalUrl, setShowTechnicalUrl] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("audio/") && !file.name.match(/\.(mp3|wav|m4a|aac|ogg)$/i)) {
      toast.error("Vui lòng chọn file âm thanh hợp lệ (MP3, WAV, M4A, AAC, OGG).");
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      toast.error("Kích thước file âm thanh không được vượt quá 50MB.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    setUploading(true);
    try {
      const res: any = await axiosClient.post("/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const uploadedUrl = res?.url || res?.data?.url;
      if (uploadedUrl) {
        onChange(uploadedUrl);
        toast.success("Tải tệp âm thanh lên thành công!");
      } else {
        toast.error("Không nhận được URL âm thanh sau khi tải lên.");
      }
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Không thể tải file âm thanh lên. Vui lòng thử lại."));
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemove = () => {
    onChange("");
  };

  const applyExternalUrl = () => {
    if (!externalUrl.trim()) {
      toast.error("Vui lòng nhập đường dẫn URL âm thanh hợp lệ.");
      return;
    }
    onChange(externalUrl.trim());
    setExternalUrl("");
    setShowExternalInput(false);
    toast.success("Đã áp dụng URL âm thanh bên ngoài!");
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-slate-700">{label}</label>
        {value && (
          <button
            type="button"
            onClick={() => setShowTechnicalUrl(!showTechnicalUrl)}
            className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 transition-colors"
          >
            Thông tin kỹ thuật {showTechnicalUrl ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
          </button>
        )}
      </div>

      <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3.5 space-y-3">
        {value ? (
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                <Volume2 size={14} className="text-emerald-600 shrink-0" />
                <span>Đã có tệp âm thanh</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={disabled || uploading}
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
                >
                  {uploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                  {uploading ? "Đang tải..." : "Thay tệp mới"}
                </button>
                <button
                  type="button"
                  disabled={disabled || uploading}
                  onClick={handleRemove}
                  className="inline-flex items-center gap-1 rounded-md border border-rose-200 bg-white px-2 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50 transition-colors disabled:opacity-50"
                  title="Gỡ bỏ âm thanh"
                >
                  <Trash2 size={12} />
                  Gỡ bỏ
                </button>
              </div>
            </div>

            <audio controls src={previewUrl ?? value} className="w-full h-9 rounded" aria-label="Audio player preview">
              Trình duyệt không hỗ trợ thẻ audio.
            </audio>

            {showTechnicalUrl && (
              <p className="text-xs font-mono text-slate-500 break-all bg-white p-2 rounded border border-slate-200">
                {value}
              </p>
            )}
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 py-1">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400">
                <Volume2 size={18} />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-700">Chưa có tệp âm thanh</p>
                <p className="text-xs text-slate-400">{helperText}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                disabled={disabled || uploading}
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 transition-colors disabled:opacity-50"
              >
                {uploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                {uploading ? "Đang tải..." : "Tải tệp âm thanh"}
              </button>
              <button
                type="button"
                onClick={() => setShowExternalInput(!showExternalInput)}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                title="Dùng liên kết bên ngoài"
              >
                <LinkIcon size={12} />
                URL ngoài
              </button>
            </div>
          </div>
        )}

        {/* SECONDARY EXTERNAL URL INPUT */}
        {showExternalInput && !value && (
          <div className="pt-2 border-t border-slate-200 flex items-center gap-2">
            <input
              type="url"
              placeholder="https://example.com/audio.mp3 (URL âm thanh bên ngoài)"
              value={externalUrl}
              onChange={(e) => setExternalUrl(e.target.value)}
              className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 outline-none focus:border-slate-400 font-mono"
            />
            <button
              type="button"
              onClick={applyExternalUrl}
              className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700"
            >
              Áp dụng
            </button>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
    </div>
  );
}
