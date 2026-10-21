"use client";

import React, { useRef, useState } from "react";
import { Image as ImageIcon, Loader2, Trash2, Upload } from "lucide-react";
import toast from "react-hot-toast";
import axiosClient from "@/lib/api/axiosClient";
import { getApiErrorMessage } from "@/lib/utils/apiError";

interface ImageUploadFieldProps {
  label?: string;
  value: string;
  onChange: (url: string) => void;
  disabled?: boolean;
  helperText?: string;
  compact?: boolean;
}

const ACCEPTED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const UNSUPPORTED_IMAGE_MESSAGE =
  "Định dạng SVG không được hỗ trợ. Vui lòng dùng PNG, JPG hoặc WEBP.";

export default function ImageUploadField({
  label = "Ảnh bìa",
  value,
  onChange,
  disabled = false,
  helperText = "Hỗ trợ định dạng JPG, PNG, WEBP tối đa 10MB.",
  compact = false,
}: ImageUploadFieldProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ACCEPTED_IMAGE_TYPES.has(file.type)) {
      toast.error(UNSUPPORTED_IMAGE_MESSAGE);
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Kích thước ảnh không được vượt quá 10MB.");
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
        toast.success("Tải ảnh lên thành công!");
      } else {
        toast.error("Không nhận được URL ảnh sau khi tải lên.");
      }
    } catch (err) {
      toast.error(
        getApiErrorMessage(err, "Không thể tải ảnh lên. Vui lòng thử lại."),
      );
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

  return (
    <div className="space-y-2">
      <label className="block text-sm font-semibold text-slate-800">
        {label}
      </label>

      <div className={`rounded-lg border border-slate-200 bg-slate-50/50 ${compact ? "p-3" : "p-4"}`}>
        {value ? (
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="relative h-28 w-44 shrink-0 overflow-hidden rounded-md border border-slate-200 bg-slate-100">
              <img
                src={value}
                alt="Preview"
                className="h-full w-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "";
                }}
              />
            </div>
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={disabled || uploading}
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
                >
                  {uploading ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <Upload size={13} />
                  )}
                  {uploading ? "Đang tải..." : "Thay đổi ảnh"}
                </button>
                <button
                  type="button"
                  disabled={disabled || uploading}
                  onClick={handleRemove}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors disabled:opacity-50"
                >
                  <Trash2 size={13} />
                  Xóa ảnh
                </button>
              </div>
              <p className="text-xs text-slate-500">{helperText}</p>
            </div>
          </div>
        ) : (
          <div className={`flex flex-col items-center justify-center text-center ${compact ? "py-4" : "py-6"}`}>
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-400">
              <ImageIcon size={20} />
            </div>
            <p className="text-sm font-medium text-slate-700">
              Chưa có ảnh bìa
            </p>
            <p className="mt-1 text-xs text-slate-500 mb-3">{helperText}</p>
            <button
              type="button"
              disabled={disabled || uploading}
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors disabled:opacity-50"
            >
              {uploading ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Upload size={14} />
              )}
              {uploading ? "Đang tải ảnh lên..." : "Tải ảnh từ máy tính"}
            </button>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={handleFileChange}
          disabled={disabled || uploading}
        />
      </div>
    </div>
  );
}
