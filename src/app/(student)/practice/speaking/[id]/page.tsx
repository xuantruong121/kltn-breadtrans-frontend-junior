"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Gauge, Loader2, Mic, StopCircle, Star, Volume2, Activity, CheckCircle2, AlertTriangle, Target, Square, Info, Award } from "lucide-react";
import { speakingService } from "@/lib/api/services/speaking.service";
import { BackButton } from "@/components/ui";
import { motion } from "framer-motion";
import toast from "react-hot-toast";

const encodeWAV = (samples: Float32Array, sampleRate = 16000): Blob => {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const writeString = (offset: number, value: string) => {
    for (let index = 0; index < value.length; index += 1) view.setUint8(offset + index, value.charCodeAt(index));
  };
  writeString(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, "data");
  view.setUint32(40, samples.length * 2, true);
  for (let index = 0, offset = 44; index < samples.length; index += 1, offset += 2) {
    const sample = Math.max(-1, Math.min(1, samples[index]));
    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
  }
  return new Blob([view], { type: "audio/wav" });
};

const TTS_SPEED_OPTIONS = [
  { value: 0.5, label: "0.5x", sublabel: "Rất chậm", title: "0.5x - Rất chậm: Nghe rõ từng âm vị & khẩu hình" },
  { value: 0.75, label: "0.75x", sublabel: "Chậm", title: "0.75x - Chậm: Luyện nối âm & ngữ điệu câu" },
  { value: 1.0, label: "1.0x", sublabel: "Chuẩn", title: "1.0x - Chuẩn: Tốc độ đàm thoại & chuẩn thi TOEIC" },
  { value: 1.2, label: "1.2x", sublabel: "Nhanh", title: "1.2x - Nhanh: Thử thách phản xạ nghe" },
  { value: 1.5, label: "1.5x", sublabel: "Rất nhanh", title: "1.5x - Rất nhanh: Tốc độ nâng cao" },
] as const;

const detectVoiceGender = (name: string): "female" | "male" | "unknown" => {
  const n = name.toLowerCase();
  if (
    n.includes("female") ||
    n.includes("zira") ||
    n.includes("susan") ||
    n.includes("hazel") ||
    n.includes("aria") ||
    n.includes("jenny") ||
    n.includes("sonia") ||
    n.includes("catherine") ||
    n.includes("libby")
  ) {
    return "female";
  }
  if (
    n.includes("male") ||
    n.includes("david") ||
    n.includes("mark") ||
    n.includes("george") ||
    n.includes("guy") ||
    n.includes("ryan") ||
    n.includes("oliver")
  ) {
    return "male";
  }
  return "unknown";
};

export default function SpeakingExerciseDetailPage() {
  const { id } = useParams();
  const exerciseId = Number(id);
  const queryClient = useQueryClient();

  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const MAX_RECORDING_SECONDS = 45;

  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const recordedSamplesRef = useRef<Float32Array[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [isPlayingTTS, setIsPlayingTTS] = useState(false);
  const [ttsRate, setTtsRate] = useState<number>(1.0);
  const [ttsAccent, setTtsAccent] = useState<"US" | "UK">("US");
  const [ttsGender, setTtsGender] = useState<"female" | "male">("female");
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [activeVoiceName, setActiveVoiceName] = useState<string>("");
  const playTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load and listen for available synthesis voices in the browser
  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    const updateVoices = () => {
      const all = window.speechSynthesis.getVoices();
      const english = all.filter((v) => v.lang.toLowerCase().startsWith("en"));
      setAvailableVoices(english);
    };

    updateVoices();
    window.speechSynthesis.onvoiceschanged = updateVoices;
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, []);

  const { data: exercise, isLoading } = useQuery({
    queryKey: ["speaking-exercise", exerciseId],
    queryFn: () => speakingService.getExerciseById(exerciseId),
    enabled: !!exerciseId,
  });

  const submitAudioMut = useMutation({
    mutationFn: (blob: Blob) => speakingService.submitAudio(exerciseId, blob),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myQuests"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
      queryClient.invalidateQueries({ queryKey: ["daily-quests"] });
      queryClient.invalidateQueries({ queryKey: ["user-stats"] });
      queryClient.invalidateQueries({ queryKey: ["myPet"] });
      toast.success("AI đã hoàn thành chấm điểm phát âm!");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Có lỗi xảy ra khi chấm điểm.");
    },
  });

  // Clean up audio URL, media tracks, audio context, timer and speech on unmount
  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }
      if (playTimeoutRef.current) clearTimeout(playTimeoutRef.current);
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [audioUrl]);

  const startRecording = async () => {
    try {
      setRecordingSeconds(0);
      recordedSamplesRef.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      mediaStreamRef.current = stream;

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx({ sampleRate: 16000 });
      audioContextRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      const processor = audioCtx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        recordedSamplesRef.current.push(new Float32Array(inputData));
      };

      source.connect(processor);
      processor.connect(audioCtx.destination);

      setIsRecording(true);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Không thể truy cập Microphone. Vui lòng kiểm tra và cấp quyền micro trong trình duyệt.");
    }
  };

  const stopRecording = useCallback(() => {
    setIsRecording(false);

    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    if (audioContextRef.current) {
      const actualSampleRate = audioContextRef.current.sampleRate || 16000;
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;

      const chunks = recordedSamplesRef.current;
      let totalLength = 0;
      for (const chunk of chunks) totalLength += chunk.length;

      if (totalLength > 0) {
        const merged = new Float32Array(totalLength);
        let offset = 0;
        for (const chunk of chunks) {
          merged.set(chunk, offset);
          offset += chunk.length;
        }

        const wavBlob = encodeWAV(merged, actualSampleRate);
        setAudioBlob(wavBlob);
        setAudioUrl(URL.createObjectURL(wavBlob));
      }
    }
  }, []);

  // Handle countdown timer when recording.
  useEffect(() => {
    if (isRecording) {
      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds((previous) => {
          if (previous + 1 >= MAX_RECORDING_SECONDS) {
            stopRecording();
            return MAX_RECORDING_SECONDS;
          }
          return previous + 1;
        });
      }, 1000);
    } else if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [isRecording, stopRecording]);

  const handleSubmit = () => {
    if (audioBlob) {
      submitAudioMut.mutate(audioBlob);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // Check if current browser has any British (UK) voices installed
  const hasUkVoices = availableVoices.some((v) => {
    const l = v.lang.toLowerCase().replace("_", "-");
    const n = v.name.toLowerCase();
    return l.includes("gb") || l.includes("uk") || n.includes("united kingdom") || n.includes("uk ");
  });

  const getFilteredVoice = useCallback(
    (accent: "US" | "UK", gender: "female" | "male"): SpeechSynthesisVoice | undefined => {
      const isUk = accent === "UK";
      const accentVoices = availableVoices.filter((v) => {
        const l = v.lang.toLowerCase().replace("_", "-");
        const n = v.name.toLowerCase();
        return isUk
          ? l.includes("gb") || l.includes("uk") || n.includes("united kingdom") || n.includes("uk ")
          : l.includes("us") || n.includes("united states") || n.includes("us ");
      });

      const pool = accentVoices.length > 0 ? accentVoices : availableVoices;
      const genderMatch = pool.find((v) => detectVoiceGender(v.name) === gender);
      return genderMatch || pool[0];
    },
    [availableVoices]
  );

  const handlePlayTTS = useCallback(
    (overrides?: { rate?: number; accent?: "US" | "UK"; gender?: "female" | "male" }) => {
      if (!exercise?.targetText || typeof window === "undefined" || !("speechSynthesis" in window)) return;

      const rate = overrides?.rate ?? ttsRate;
      const accent = overrides?.accent ?? ttsAccent;
      const gender = overrides?.gender ?? ttsGender;

      if (playTimeoutRef.current) clearTimeout(playTimeoutRef.current);
      window.speechSynthesis.cancel();

      // Small delay prevents Chromium race condition where synchronous cancel drops next utterance
      playTimeoutRef.current = setTimeout(() => {
        const utterance = new SpeechSynthesisUtterance(exercise.targetText);
        utterance.rate = Number(rate);
        utterance.pitch = 1.0;

        const voice = getFilteredVoice(accent, gender);
        if (voice) {
          utterance.voice = voice;
          utterance.lang = voice.lang;
          setActiveVoiceName(voice.name);
        } else {
          utterance.lang = accent === "US" ? "en-US" : "en-GB";
          setActiveVoiceName("");
        }

        utterance.onstart = () => setIsPlayingTTS(true);
        utterance.onend = () => setIsPlayingTTS(false);
        utterance.onerror = (e) => {
          if (e.error !== "canceled" && e.error !== "interrupted") {
            console.error("TTS speech error:", e);
          }
          setIsPlayingTTS(false);
        };

        setIsPlayingTTS(true);
        window.speechSynthesis.speak(utterance);
      }, 50);
    },
    [exercise, ttsRate, ttsAccent, ttsGender, getFilteredVoice]
  );

  const handleStopTTS = useCallback(() => {
    if (playTimeoutRef.current) clearTimeout(playTimeoutRef.current);
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setIsPlayingTTS(false);
  }, []);

  const handleTogglePlayTTS = () => {
    if (isPlayingTTS) {
      handleStopTTS();
    } else {
      handlePlayTTS();
    }
  };

  const handleRateChange = (newRate: number) => {
    setTtsRate(newRate);
    if (isPlayingTTS) {
      handlePlayTTS({ rate: newRate });
    }
  };

  const handleAccentChange = (newAccent: "US" | "UK") => {
    setTtsAccent(newAccent);
    if (isPlayingTTS) {
      handlePlayTTS({ accent: newAccent });
    }
  };

  const handleGenderChange = (newGender: "female" | "male") => {
    setTtsGender(newGender);
    if (isPlayingTTS) {
      handlePlayTTS({ gender: newGender });
    }
  };

  const renderColoredText = (text: string, assessmentResult?: any) => {
    if (!assessmentResult) {
      const words = text.split(/\s+/);
      return words.map((word, index) => (
        <span key={index} className="inline-block px-1">
          {word}
        </span>
      ));
    }

    // Nếu im lặng hoặc điểm = 0
    if (assessmentResult.isSilentOrNoSpeech || assessmentResult.overallScore === 0) {
      const words = text.split(/\s+/);
      return words.map((word, index) => (
        <span
          key={index}
          className="inline-block px-1 text-slate-400 font-medium italic underline decoration-slate-300 decoration-dashed underline-offset-4"
          title="Chưa đọc từ này"
        >
          {word}
        </span>
      ));
    }

    // 1. Ưu tiên sử dụng danh sách words phân tích chi tiết từ Backend
    if (assessmentResult.words && assessmentResult.words.length > 0) {
      return assessmentResult.words.map((item: any, index: number) => {
        if (item.isCorrect) {
          return (
            <span
              key={index}
              className="inline-block px-1 text-emerald-600 font-bold drop-shadow-xs"
              title={`Phát âm chuẩn: ${item.accuracyScore || 85}%`}
            >
              {item.word}
            </span>
          );
        } else if (item.errorType === "Mispronunciation") {
          return (
            <span
              key={index}
              className="inline-block px-1 text-rose-600 font-bold underline decoration-rose-400 decoration-wavy underline-offset-4"
              title={`Phát âm chưa chuẩn: ${item.accuracyScore || 0}%`}
            >
              {item.word}
            </span>
          );
        } else {
          // Omission / Unspoken
          return (
            <span
              key={index}
              className="inline-block px-1 text-slate-400 font-medium italic underline decoration-slate-300 decoration-dashed underline-offset-4"
              title="Chưa đọc / Bỏ sót"
            >
              {item.word}
            </span>
          );
        }
      });
    }

    // 2. Fallback: Nếu không có mảng words chi tiết
    const problematicWords = assessmentResult.problematicWords || [];
    const badWords = problematicWords.map((w: string) =>
      w.toLowerCase().replace(/[.,!?;:]/g, "")
    );
    const words = text.split(/\s+/);

    return words.map((word, index) => {
      const cleanWord = word.toLowerCase().replace(/[.,!?;:]/g, "");
      const isBad = badWords.includes(cleanWord);
      return (
        <span
          key={index}
          className={`inline-block px-1 ${
            isBad
              ? "text-rose-600 font-bold underline decoration-rose-300 decoration-wavy underline-offset-4"
              : "text-emerald-600 font-bold"
          }`}
        >
          {word}
        </span>
      );
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="animate-spin text-purple-500" size={48} />
      </div>
    );
  }

  if (!exercise) {
    return <div className="text-center mt-12">Không tìm thấy bài tập.</div>;
  }

  const result = submitAudioMut.data?.assessment;

  return (
    <div className="w-full space-y-6 pb-20">
      {/* TOP HEADER BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:px-7 rounded-3xl border border-slate-200/90 shadow-xs">
        <div className="flex items-center gap-4">
          <BackButton href="/practice/speaking" label="Quay lại danh sách bài nói" />
          <div className="h-6 w-px bg-slate-200 hidden sm:block" />
          <div>
            <h1 className="text-lg sm:text-xl font-black text-slate-800 line-clamp-1">{exercise.title}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase">{exercise.category}</span>
              <span className="bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase">{exercise.difficulty}</span>
            </div>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-2 text-xs font-bold text-slate-500 bg-slate-50 px-3.5 py-1.5 rounded-xl border border-slate-200/60">
          <Activity size={15} className="text-amber-600" />
          <span>Luyện Phát Âm Trực Tuyến • Chuẩn Âm Vị AI</span>
        </div>
      </div>

      {/* 3-COLUMN RESPONSIVE LAYOUT */}
      <div className="grid grid-cols-12 gap-6 xl:gap-8 items-start">
        {/* A. LEFT COLUMN (lg:col-span-3, order-3 on mobile): Guidance & Rewards */}
        <div className="order-3 lg:order-1 col-span-12 lg:col-span-3 space-y-6">
          {/* Image & Topic Info Card */}
          {exercise.imageUrl && (
            <div className="bg-white p-4 rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
              <div className="rounded-2xl overflow-hidden border border-slate-100 max-h-48 mb-2.5">
                <img src={exercise.imageUrl} alt="Exercise image" className="w-full h-full object-cover" />
              </div>
              <p className="text-xs text-slate-500 font-bold text-center">Hình ảnh minh họa ngữ cảnh bài nói</p>
            </div>
          )}

          {/* Speaking Guidance Tips */}
          <div className="bg-purple-50/60 border border-purple-100 rounded-3xl p-5 sm:p-6 space-y-4 shadow-2xs">
            <h3 className="font-bold text-purple-950 text-sm sm:text-base flex items-center gap-2.5">
              <Mic size={18} className="text-purple-600" />
              <span>Bí Quyết Đạt Điểm Cao</span>
            </h3>

            <ul className="space-y-3 text-xs sm:text-sm text-purple-900 font-medium">
              <li className="bg-white/95 p-3.5 rounded-2xl border border-purple-100/80 flex items-start gap-3 shadow-2xs">
                <span className="size-6 rounded-full bg-purple-100 text-purple-700 font-extrabold flex items-center justify-center text-xs shrink-0 mt-0.5">1</span>
                <span>Bấm <strong>Nghe mẫu</strong> để làm quen với ngữ điệu và trọng âm câu trước khi nói.</span>
              </li>
              <li className="bg-white/95 p-3.5 rounded-2xl border border-purple-100/80 flex items-start gap-3 shadow-2xs">
                <span className="size-6 rounded-full bg-purple-100 text-purple-700 font-extrabold flex items-center justify-center text-xs shrink-0 mt-0.5">2</span>
                <span>Nói to, rõ ràng, giữ khoảng cách khoảng 10-15cm so với micro của thiết bị.</span>
              </li>
              <li className="bg-white/95 p-3.5 rounded-2xl border border-purple-100/80 flex items-start gap-3 shadow-2xs">
                <span className="size-6 rounded-full bg-purple-100 text-purple-700 font-extrabold flex items-center justify-center text-xs shrink-0 mt-0.5">3</span>
                <span>Phát âm rõ các âm đuôi quan trọng như <em>/s/, /ed/, /t/, /d/</em>.</span>
              </li>
            </ul>
          </div>

          {/* Gamification Reward Card */}
          <div className="bg-gradient-to-br from-amber-50/80 to-orange-50/60 border border-amber-200/90 p-5 rounded-3xl flex items-center gap-4 shadow-2xs">
            <div className="size-12 rounded-2xl bg-amber-400 text-amber-950 flex items-center justify-center shadow-xs shrink-0">
              <Award size={24} />
            </div>
            <div>
              <p className="font-bold text-slate-800 text-sm">Phần Thưởng Luyện Nói</p>
              <p className="text-xs font-black text-amber-800 mt-0.5">+25 EXP khi đạt điểm &ge; 8.0/10</p>
            </div>
          </div>
        </div>

        {/* B. CENTER COLUMN (lg:col-span-6, order-1 on mobile): Primary Practice Canvas */}
        <div className="order-1 lg:order-2 col-span-12 lg:col-span-6 space-y-6">
          <div className="bg-white p-6 sm:p-8 lg:p-9 rounded-3xl border border-slate-200/90 shadow-sm space-y-7">
            {/* Target Text Box */}
            <div className="bg-gradient-to-b from-amber-50/40 via-orange-50/20 to-white p-7 sm:p-9 lg:p-11 rounded-3xl border border-amber-200/70 text-center relative overflow-hidden">
              <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-amber-100/90 text-amber-900 text-xs sm:text-sm font-extrabold tracking-wider uppercase mb-5">
                <Target size={15} className="text-amber-700" />
                <span>Đoạn văn cần đọc</span>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-3 text-2xl sm:text-3xl md:text-4xl lg:text-[2.5rem] font-black text-slate-900 leading-relaxed sm:leading-relaxed lg:leading-normal tracking-tight px-3 break-words max-w-4xl mx-auto">
                {renderColoredText(exercise.targetText, result)}
              </div>

              {/* Color coding legend */}
              {result && (
                <div className="mt-6 pt-4 border-t border-amber-100/80 flex flex-wrap items-center justify-center gap-5 text-xs sm:text-sm font-bold">
                  <span className="flex items-center gap-1.5 text-emerald-600">
                    <span className="size-2.5 rounded-full bg-emerald-500" /> Phát âm chuẩn
                  </span>
                  <span className="flex items-center gap-1.5 text-rose-600">
                    <span className="size-2.5 rounded-full bg-rose-500" /> Cần cải thiện
                  </span>
                  <span className="flex items-center gap-1.5 text-slate-400">
                    <span className="size-2.5 rounded-full bg-slate-300" /> Chưa đọc / Bỏ sót
                  </span>
                </div>
              )}
            </div>

            {/* Audio Sample & Pronunciation Control Deck */}
            <div className="w-full bg-slate-50/80 rounded-2xl border border-slate-200/90 p-4 sm:p-5 flex flex-col gap-3.5 shadow-2xs">
              {/* Top Row: Main Play/Stop Button + Accent & Gender Selectors */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={handleTogglePlayTTS}
                  aria-pressed={isPlayingTTS}
                  aria-label={isPlayingTTS ? "Dừng nghe phát âm mẫu" : "Nghe phát âm mẫu"}
                  className={`inline-flex items-center justify-center gap-2.5 px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all active:scale-95 cursor-pointer shadow-xs ${
                    isPlayingTTS
                      ? "bg-rose-600 hover:bg-rose-700 text-white"
                      : "bg-amber-600 hover:bg-amber-700 text-white"
                  }`}
                  title={isPlayingTTS ? "Dừng nghe mẫu" : "Nghe phát âm chuẩn giọng bản xứ"}
                >
                  {isPlayingTTS ? (
                    <>
                      <Square size={15} className="fill-white shrink-0" />
                      <span>Dừng phát âm</span>
                      <span className="flex items-center gap-0.5 h-3.5 ml-1">
                        <span className="w-1.5 h-2 bg-white rounded-full animate-bounce [animation-delay:-0.3s]" />
                        <span className="w-1.5 h-3.5 bg-white rounded-full animate-bounce [animation-delay:-0.15s]" />
                        <span className="w-1.5 h-2 bg-white rounded-full animate-bounce" />
                      </span>
                    </>
                  ) : (
                    <>
                      <Volume2 size={18} className="shrink-0" />
                      <span>Nghe mẫu phát âm</span>
                    </>
                  )}
                </button>

                <div className="flex flex-wrap items-center gap-2.5">
                  {/* Accent Selector */}
                  <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200" role="group" aria-label="Chọn vùng miền giọng đọc">
                    {(["US", "UK"] as const).map((accent) => {
                      const selected = ttsAccent === accent;
                      return (
                        <button
                          key={accent}
                          type="button"
                          onClick={() => handleAccentChange(accent)}
                          aria-pressed={selected}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            selected
                              ? "bg-amber-100 text-amber-900 font-extrabold"
                              : "text-slate-600 hover:text-slate-900"
                          }`}
                        >
                          {accent === "US" ? "🇺🇸 US" : "🇬🇧 UK"}
                        </button>
                      );
                    })}
                  </div>

                  {/* Gender Selector */}
                  <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200" role="group" aria-label="Chọn giới tính giọng đọc">
                    {(
                      [
                        { id: "female", label: "Nữ" },
                        { id: "male", label: "Nam" },
                      ] as const
                    ).map((genderOption) => {
                      const selected = ttsGender === genderOption.id;
                      return (
                        <button
                          key={genderOption.id}
                          type="button"
                          onClick={() => handleGenderChange(genderOption.id)}
                          aria-pressed={selected}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            selected
                              ? "bg-amber-100 text-amber-900 font-extrabold"
                              : "text-slate-600 hover:text-slate-900"
                          }`}
                        >
                          {genderOption.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Notice if system has no native UK voice */}
              {ttsAccent === "UK" && !hasUkVoices && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 rounded-lg border border-amber-200 text-amber-800 text-xs">
                  <Info size={14} className="shrink-0 text-amber-600" />
                  <span>Đang phát bằng giọng chuẩn tương thích nhất trên trình duyệt.</span>
                </div>
              )}

              {/* Bottom Row: Speed Multipliers */}
              <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2.5 border-t border-slate-200/70">
                <div className="flex items-center gap-1.5 text-slate-500 font-bold text-xs shrink-0">
                  <Gauge size={14} className="text-amber-600" />
                  <span>Tốc độ:</span>
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto" role="group" aria-label="Chọn tốc độ đọc">
                  {TTS_SPEED_OPTIONS.map((option) => {
                    const selected = ttsRate === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => handleRateChange(option.value)}
                        title={option.title}
                        aria-pressed={selected}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          selected
                            ? "bg-amber-500 text-white font-extrabold shadow-2xs"
                            : "bg-white text-slate-600 hover:text-slate-900 border border-slate-200"
                        }`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Recording & Submission Dock */}
            <div className="flex flex-col items-center justify-center gap-5 pt-3">
              {!audioBlob ? (
                <div className="flex flex-col items-center gap-4 w-full max-w-lg mx-auto">
                  {isRecording && (
                    <div className="w-full flex flex-col items-center gap-3">
                      {/* Wave animation */}
                      <div className="flex gap-1.5 items-end h-10">
                        {[...Array(20)].map((_, i) => (
                          <motion.div
                            key={i}
                            animate={{ height: ["15%", "100%", "15%"] }}
                            transition={{
                              repeat: Infinity,
                              duration: 0.7,
                              delay: (i * 0.04) % 0.4,
                              ease: "easeInOut",
                            }}
                            className={`w-1.5 rounded-full ${
                              recordingSeconds > 35
                                ? "bg-rose-500"
                                : recordingSeconds > 25
                                ? "bg-amber-500"
                                : "bg-emerald-500"
                            }`}
                          />
                        ))}
                      </div>

                      {/* Timer Badge */}
                      <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-800 text-white font-mono font-bold text-xs sm:text-sm shadow-xs">
                        <span
                          className={`size-2.5 rounded-full animate-ping ${
                            recordingSeconds > 35 ? "bg-rose-400" : "bg-emerald-400"
                          }`}
                        />
                        <span>{formatTime(recordingSeconds)}</span>
                        <span className="text-slate-400">/ 00:45</span>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden border border-slate-200">
                        <div
                          className={`h-full transition-all duration-300 ${
                            recordingSeconds > 35
                              ? "bg-rose-500"
                              : recordingSeconds > 25
                              ? "bg-amber-500"
                              : "bg-emerald-500"
                          }`}
                          style={{ width: `${(recordingSeconds / MAX_RECORDING_SECONDS) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={isRecording ? stopRecording : startRecording}
                    className={`size-24 sm:size-28 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                      isRecording
                        ? "bg-rose-500 text-white animate-pulse shadow-xl shadow-rose-500/30 scale-105"
                        : "bg-gradient-to-br from-amber-500 to-orange-500 text-white hover:scale-105 shadow-lg shadow-amber-500/25"
                    }`}
                    title={isRecording ? "Dừng ghi âm" : "Bắt đầu thu âm"}
                  >
                    {isRecording ? <StopCircle size={44} /> : <Mic size={44} />}
                  </button>

                  <div className="text-center">
                    <p className={`font-bold text-sm sm:text-base ${isRecording ? "text-rose-600 font-black" : "text-slate-700"}`}>
                      {isRecording ? "Đang ghi âm... Nhấn vào nút để dừng" : "Nhấn vào Micro để bắt đầu đọc"}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Tối đa 45s/câu • Chuẩn âm vị Azure AI Speech
                    </p>
                  </div>
                </div>
              ) : (
                <div className="w-full max-w-lg flex flex-col items-center gap-4 bg-slate-50 p-5 rounded-2xl border border-slate-200">
                  <audio src={audioUrl!} controls className="w-full h-11" />

                  <div className="flex gap-3 w-full">
                    <button
                      type="button"
                      onClick={() => {
                        setAudioBlob(null);
                        setAudioUrl(null);
                        submitAudioMut.reset();
                      }}
                      className="flex-1 py-3 px-4 rounded-xl font-bold text-xs sm:text-sm text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                      Thu lại
                    </button>
                    <button
                      type="button"
                      onClick={handleSubmit}
                      disabled={submitAudioMut.isPending}
                      className="flex-1 py-3 px-4 rounded-xl font-bold text-xs sm:text-sm text-white bg-blue-600 hover:bg-blue-700 shadow-xs transition-all disabled:opacity-70 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {submitAudioMut.isPending ? <Loader2 className="animate-spin" size={18} /> : <Activity size={18} />}
                      <span>Chấm điểm phát âm</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Error handling */}
            {submitAudioMut.isError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 sm:p-5 rounded-2xl flex items-start gap-3">
                <AlertTriangle className="shrink-0 mt-0.5" size={20} />
                <div className="text-xs sm:text-sm">
                  <h3 className="font-bold mb-0.5">Lỗi phân tích</h3>
                  <p>{(submitAudioMut.error as any)?.response?.data?.message || "Đã xảy ra lỗi khi chấm điểm. Vui lòng thử lại."}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* C. RIGHT COLUMN (lg:col-span-3, order-2 on mobile): Real-time Evaluation Report (100% Light Theme) */}
        <div className="order-2 lg:order-3 col-span-12 lg:col-span-3 space-y-6">
          {submitAudioMut.isPending ? (
            <div className="bg-white border border-slate-200 rounded-3xl shadow-xs p-8 text-center space-y-3.5">
              <Loader2 className="animate-spin text-blue-600 mx-auto" size={36} />
              <p className="font-bold text-slate-800 text-sm">Đang chấm điểm phát âm...</p>
              <p className="text-xs text-slate-400 leading-relaxed">Azure AI Speech đang phân tích từng âm vị và độ trôi chảy.</p>
            </div>
          ) : result ? (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white border border-slate-200 rounded-3xl shadow-sm p-5 sm:p-6 space-y-5"
            >
              {/* Header */}
              <div className="flex items-center gap-3 pb-3.5 border-b border-slate-100">
                <div className="p-2 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 shrink-0">
                  <Star size={18} className="fill-amber-400 text-amber-400" />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-black text-slate-800 leading-tight">Báo cáo Phát âm Chi tiết</h2>
                  <p className="text-xs font-medium text-slate-400">Azure AI Speech chuẩn âm vị</p>
                </div>
              </div>

              {/* Silence Alert Banner */}
              {(result.isSilentOrNoSpeech || result.overallScore === 0) && (
                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-amber-900 text-xs sm:text-sm flex items-start gap-2.5">
                  <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={18} />
                  <div>
                    <span className="font-bold">Chưa nhận diện giọng nói:</span> Vui lòng kiểm tra lại micro và đọc to hơn nhé.
                  </div>
                </div>
              )}

              {/* Overall Score Highlight Card */}
              <div className="bg-emerald-50/90 border border-emerald-200 rounded-3xl p-5 text-center shadow-2xs">
                <p className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">Điểm Tổng</p>
                <div className="text-5xl font-black text-emerald-700 my-1.5">
                  {result.overallScore} <span className="text-lg font-bold text-emerald-600/60">/ 10</span>
                </div>
                <p className="text-xs font-bold text-emerald-700">
                  {result.overallScore >= 8 ? "Phát âm rất chuẩn" : result.overallScore >= 5 ? "Khá tốt, hãy luyện thêm" : "Cần rèn luyện thêm"}
                </p>
              </div>

              {/* Accuracy & Fluency Metric Pills */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 border border-slate-200/80 p-3 rounded-2xl text-center">
                  <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Chính xác</span>
                  <span className="text-xl font-black text-slate-800">{result.accuracyScore || 0}%</span>
                </div>
                <div className="bg-slate-50 border border-slate-200/80 p-3 rounded-2xl text-center">
                  <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Trôi chảy</span>
                  <span className="text-xl font-black text-slate-800">{result.fluencyScore || 0}%</span>
                </div>
              </div>

              {/* Evaluation Feedback */}
              <div className="bg-blue-50/70 border border-blue-100 rounded-2xl p-4 space-y-1.5">
                <h3 className="text-xs sm:text-sm font-bold text-blue-900 flex items-center gap-1.5">
                  <CheckCircle2 size={15} className="text-blue-600" />
                  <span>Đánh giá phát âm</span>
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
                  {result.feedback}
                </p>
              </div>

              {/* Problematic Words */}
              {result.problematicWords && result.problematicWords.length > 0 && (
                <div className="bg-rose-50/60 border border-rose-100 rounded-2xl p-4 space-y-2">
                  <p className="text-xs font-bold text-rose-800 uppercase tracking-wider">Từ cần luyện thêm:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {result.problematicWords.map((word: string, i: number) => (
                      <span key={i} className="bg-white text-rose-700 px-2.5 py-1 rounded-lg text-xs sm:text-sm font-bold border border-rose-200 shadow-2xs">
                        {word}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Suggestions */}
              {result.suggestions && result.suggestions.length > 0 && (
                <div className="bg-amber-50/60 border border-amber-100 rounded-2xl p-4 space-y-2">
                  <h3 className="text-xs sm:text-sm font-bold text-amber-900 flex items-center gap-1.5">
                    <Target size={15} className="text-amber-600" />
                    <span>Gợi ý cải thiện</span>
                  </h3>
                  <ul className="space-y-2 text-xs sm:text-sm text-slate-600">
                    {result.suggestions.map((sug: string, i: number) => (
                      <li key={i} className="flex items-start gap-2 leading-snug">
                        <span className="shrink-0 size-4 rounded-full bg-amber-200 text-amber-900 flex items-center justify-center text-[10px] font-bold mt-0.5">
                          {i + 1}
                        </span>
                        <span>{sug}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </motion.div>
          ) : (
            /* EMPTY / INITIAL STATE */
            <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-8 sm:p-10 text-center text-slate-400 space-y-3.5 shadow-2xs">
              <div className="size-14 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mx-auto text-slate-400">
                <Activity size={26} />
              </div>
              <p className="text-sm sm:text-base font-bold text-slate-700">Báo cáo phát âm chi tiết</p>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-xs mx-auto">
                Thu âm câu nói và bấm <strong>&ldquo;Chấm điểm phát âm&rdquo;</strong> để xem kết quả chi tiết từng âm vị tại đây.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

