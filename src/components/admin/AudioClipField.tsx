"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Mic, Square, Trash2, Upload } from "lucide-react";
import toast from "react-hot-toast";
import axiosClient from "@/lib/api/axiosClient";
import { getApiErrorMessage } from "@/lib/utils/apiError";
import { BTN_DANGER, BTN_SECONDARY } from "./cmsButtons";
import { audioFileProblem, recordedFileType } from "./audioClip";

const MAX_RECORDING_SECONDS = 15;

/**
 * A short pronunciation clip: record it with the microphone or pick a file;
 * either is uploaded to storage and the field keeps the playable URL.
 */
export default function AudioClipField({
  label,
  value,
  onChange,
  fileName,
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
  /** Used for the uploaded file name, e.g. "agenda-us". */
  fileName: string;
}) {
  const [uploading, setUploading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(
    () => () => {
      if (timer.current) clearInterval(timer.current);
      recorder.current?.stream.getTracks().forEach((track) => track.stop());
    },
    [],
  );

  const upload = async (file: File) => {
    const problem = audioFileProblem(file);
    if (problem) {
      toast.error(problem);
      return;
    }
    const body = new FormData();
    body.append("file", file);
    setUploading(true);
    try {
      const res: any = await axiosClient.post("/upload", body, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const url = res?.url || res?.data?.url;
      if (!url) throw new Error("Không nhận được đường dẫn audio.");
      onChange(url);
      toast.success("Đã tải audio lên. Bấm Lưu từ để giữ.");
    } catch (err: any) {
      toast.error(getApiErrorMessage(err, "Không tải được audio lên."));
    } finally {
      setUploading(false);
    }
  };

  const stop = () => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    if (recorder.current?.state === "recording") recorder.current.stop();
  };

  const start = async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      toast.error("Trình duyệt này không ghi âm được. Hãy chọn file audio.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const media = new MediaRecorder(stream);
      chunks.current = [];
      media.ondataavailable = (event) => {
        if (event.data.size) chunks.current.push(event.data);
      };
      media.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        setRecording(false);
        const { type, extension } = recordedFileType(media.mimeType);
        const blob = new Blob(chunks.current, { type });
        if (!blob.size) return;
        void upload(new File([blob], `${fileName}.${extension}`, { type }));
      };
      recorder.current = media;
      media.start();
      setRecording(true);
      setSeconds(0);
      timer.current = setInterval(() => {
        setSeconds((value) => {
          if (value + 1 >= MAX_RECORDING_SECONDS) stop();
          return value + 1;
        });
      }, 1000);
    } catch {
      toast.error("Chưa được phép dùng micro. Hãy cho phép trong trình duyệt.");
    }
  };

  return (
    <div className="text-sm font-medium text-slate-800">
      {label}
      {value && !recording && (
        <audio controls src={value} className="mt-1 h-10 w-full" aria-label={label} />
      )}
      <div className="mt-2 flex flex-wrap gap-2">
        {recording ? (
          <button type="button" onClick={stop} className={BTN_DANGER}>
            <Square size={14} /> Dừng ({seconds}s)
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void start()}
            disabled={uploading}
            className={BTN_SECONDARY}
          >
            <Mic size={16} /> {value ? "Ghi lại" : "Ghi âm"}
          </button>
        )}
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          disabled={uploading || recording}
          className={BTN_SECONDARY}
        >
          {uploading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Upload size={16} />
          )}
          Chọn file
        </button>
        {value && !recording && (
          <button
            type="button"
            onClick={() => onChange("")}
            aria-label={`Bỏ ${label}`}
            className={BTN_DANGER}
          >
            <Trash2 size={14} />
          </button>
        )}
        <input
          ref={fileInput}
          type="file"
          accept="audio/*"
          className="sr-only"
          tabIndex={-1}
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) void upload(file);
          }}
        />
      </div>
    </div>
  );
}
