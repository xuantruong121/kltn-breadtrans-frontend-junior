"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Pause, Play, RotateCcw, Volume2, VolumeX } from "lucide-react";
import { quizService } from "@/lib/api/services/quiz.service";

interface ListeningAudioPlayerProps {
  quizId: number;
  questionId: number;
  accent?: string;
  muted?: boolean;
  className?: string;
}

function formatTime(seconds: number): string {
  if (Number.isNaN(seconds) || seconds < 0) return "00:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export function ListeningAudioPlayer({
  quizId,
  questionId,
  accent,
  muted = false,
  className,
}: ListeningAudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  const [loadedQuestionId, setLoadedQuestionId] = useState<number | null>(null);
  const [errorQuestionId, setErrorQuestionId] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const playbackRateRef = useRef(1);

  useEffect(() => {
    playbackRateRef.current = playbackRate;
  }, [playbackRate]);

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [fetchKey, setFetchKey] = useState(0);

  const isLoading = loadedQuestionId !== questionId && errorQuestionId !== questionId;
  const error = errorQuestionId === questionId;

  // Fetch audio blob with AbortController on question change or manual retry
  useEffect(() => {
    const controller = new AbortController();
    const currentAudio = audioRef.current;
    let isMounted = true;

    quizService
      .getQuestionAudioBlob(quizId, questionId, controller.signal)
      .then((blob) => {
        if (!isMounted) return;
        if (objectUrlRef.current) {
          URL.revokeObjectURL(objectUrlRef.current);
        }
        const url = URL.createObjectURL(blob);
        objectUrlRef.current = url;

        if (currentAudio) {
          currentAudio.src = url;
          currentAudio.playbackRate = playbackRateRef.current;
          currentAudio.load();
        }
        setLoadedQuestionId(questionId);
      })
      .catch((err) => {
        // Silently ignore canceled or aborted requests
        if (
          !isMounted ||
          err?.name === "AbortError" ||
          err?.name === "CanceledError" ||
          err?.code === "ERR_CANCELED"
        ) {
          return;
        }
        setErrorQuestionId(questionId);
      });

    return () => {
      isMounted = false;
      controller.abort();
      if (currentAudio) {
        currentAudio.pause();
        currentAudio.src = "";
      }
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, [quizId, questionId, fetchKey]);

  // Handle Play/Pause
  const togglePlay = () => {
    if (!audioRef.current || isLoading || error) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(() => {
        setIsPlaying(false);
      });
    }
  };

  // Rewind 5 seconds
  const rewind5s = () => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 5);
  };

  // Change playback rate
  const handleRateChange = (rate: number) => {
    setPlaybackRate(rate);
    playbackRateRef.current = rate;
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  };

  // Seek bar
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const targetTime = Number(e.target.value);
    setCurrentTime(targetTime);
    if (audioRef.current) {
      audioRef.current.currentTime = targetTime;
    }
  };

  // Handle retry
  const handleRetry = () => {
    setErrorQuestionId(null);
    setLoadedQuestionId(null);
    setFetchKey((k) => k + 1);
  };

  // Keyboard shortcut listener with stable refs (Space: play/pause, Shift+Left: rewind)
  const togglePlayRef = useRef(togglePlay);
  const rewind5sRef = useRef(rewind5s);

  useEffect(() => {
    togglePlayRef.current = togglePlay;
    rewind5sRef.current = rewind5s;
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = (document.activeElement?.tagName || "").toLowerCase();
      if (activeTag === "input" || activeTag === "textarea") return;

      if (e.code === "Space") {
        e.preventDefault();
        togglePlayRef.current();
      } else if (e.shiftKey && e.code === "ArrowLeft") {
        e.preventDefault();
        rewind5sRef.current();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div
      className={
        className ??
        "rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs sm:p-6"
      }
    >
      {/* Hidden native audio element */}
      <audio
        ref={audioRef}
        muted={muted}
        onTimeUpdate={() => {
          if (audioRef.current) {
            setCurrentTime(audioRef.current.currentTime);
          }
        }}
        onLoadedMetadata={() => {
          if (audioRef.current) {
            setDuration(audioRef.current.duration || 0);
            audioRef.current.playbackRate = playbackRateRef.current;
          }
        }}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => {
          setIsPlaying(false);
          setCurrentTime(0);
        }}
        onEmptied={() => {
          setIsPlaying(false);
          setCurrentTime(0);
          setDuration(0);
        }}
      />

      {/* Header bar of audio player */}
      <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
            <Volume2 size={18} aria-hidden="true" />
          </div>
          <div>
            <span className="text-xs font-black uppercase tracking-wider text-amber-700">
              ĐOẠN GHI ÂM
            </span>
            <p className="text-xs text-slate-500 font-medium">Nghe kỹ thông tin để trả lời câu hỏi</p>
          </div>
        </div>

        {accent && (
          <span className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-800">
            Giọng đọc: {accent}
          </span>
        )}
      </div>

      {error ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center">
          <VolumeX size={32} className="text-slate-400" aria-hidden="true" />
          <p className="mt-2 text-sm font-bold text-slate-700">
            Không thể tải audio cho câu hỏi này
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Vui lòng kiểm tra kết nối mạng hoặc thử tải lại.
          </p>
          <button
            type="button"
            onClick={handleRetry}
            className="mt-3.5 inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-amber-500 px-4 text-xs font-extrabold text-white transition hover:bg-amber-600 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 cursor-pointer shadow-xs"
          >
            <RotateCcw size={14} aria-hidden="true" />
            Thử tải lại
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Main Controls: Play/Pause, Rewind, Speed Selector */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={togglePlay}
                disabled={isLoading}
                aria-label={isPlaying ? "Tạm dừng" : "Phát âm thanh"}
                className="flex size-14 items-center justify-center rounded-2xl bg-amber-500 hover:bg-amber-600 text-white shadow-md transition-all active:scale-95 disabled:opacity-50 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 cursor-pointer"
              >
                {isLoading ? (
                  <Loader2 size={24} className="animate-spin" aria-hidden="true" />
                ) : isPlaying ? (
                  <Pause size={24} fill="currentColor" aria-hidden="true" />
                ) : (
                  <Play size={24} fill="currentColor" className="ml-0.5" aria-hidden="true" />
                )}
              </button>

              <button
                type="button"
                onClick={rewind5s}
                disabled={isLoading}
                title="Lùi 5 giây (Shift + Mũi tên trái)"
                className="flex size-11 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 cursor-pointer"
              >
                <RotateCcw size={16} aria-hidden="true" />
                <span className="sr-only">Lùi 5 giây</span>
              </button>
            </div>

            {/* Playback speed selector pills */}
            <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
              {[
                { rate: 0.8, label: "0.8x" },
                { rate: 1.0, label: "1.0x (Chuẩn)" },
                { rate: 1.2, label: "1.2x" },
              ].map(({ rate, label }) => (
                <button
                  key={rate}
                  type="button"
                  onClick={() => handleRateChange(rate)}
                  className={`min-h-9 rounded-lg px-2.5 text-xs font-extrabold transition cursor-pointer ${
                    playbackRate === rate
                      ? "bg-amber-500 text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Timeline & Scrubber */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-3">
              <span className="w-10 text-xs font-bold font-mono text-slate-500">
                {formatTime(currentTime)}
              </span>
              <input
                type="range"
                min={0}
                max={duration || 100}
                step={0.1}
                value={currentTime}
                onChange={handleSeek}
                disabled={isLoading || duration === 0}
                aria-label="Thanh thời gian âm thanh"
                className="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-slate-200 accent-amber-500 focus:outline-hidden"
              />
              <span className="w-10 text-right text-xs font-bold font-mono text-slate-500">
                {formatTime(duration)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
