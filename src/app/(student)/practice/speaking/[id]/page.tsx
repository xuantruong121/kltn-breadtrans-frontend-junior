"use client";

import { useState, useRef, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Mic, StopCircle, Star, Sparkles, Volume2, Activity, CheckCircle2, AlertTriangle } from "lucide-react";
import { speakingService } from "@/lib/api/services/speaking.service";
import { BackButton } from "@/components/ui";
import { motion } from "framer-motion";
import { useGamificationStore } from "@/stores/gamificationStore";
import toast from "react-hot-toast";

export default function SpeakingExerciseDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const exerciseId = Number(id);
  const queryClient = useQueryClient();
  const { addBreads, addExp } = useGamificationStore();

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

  const { data: exercise, isLoading } = useQuery({
    queryKey: ["speaking-exercise", exerciseId],
    queryFn: () => speakingService.getExerciseById(exerciseId),
    enabled: !!exerciseId,
  });

  const submitAudioMut = useMutation({
    mutationFn: (blob: Blob) => speakingService.submitAudio(exerciseId, blob),
    onSuccess: (data: any) => {
      const assessment = data?.assessment;
      if (assessment && !assessment.isSilentOrNoSpeech && assessment.overallScore > 0) {
        if (assessment.overallScore >= 8) {
          addExp(25);
        }
        addBreads(5);
      }
      queryClient.invalidateQueries({ queryKey: ["myQuests"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
      queryClient.invalidateQueries({ queryKey: ["myPet"] });
      toast.success("AI đã hoàn thành chấm điểm phát âm!");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Có lỗi xảy ra khi chấm điểm.");
    },
  });

  // Clean up audio URL, media tracks, audio context and timer on unmount
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
      window.speechSynthesis.cancel();
    };
  }, [audioUrl]);

  // Handle countdown timer when recording
  useEffect(() => {
    if (isRecording) {
      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds((prev) => {
          if (prev + 1 >= MAX_RECORDING_SECONDS) {
            stopRecording();
            return MAX_RECORDING_SECONDS;
          }
          return prev + 1;
        });
      }, 1000);
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [isRecording]);

  // Helper encode Float32 PCM samples into standard 16-bit 16kHz mono WAV Blob
  const encodeWAV = (samples: Float32Array, sampleRate = 16000): Blob => {
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);

    const writeString = (offset: number, str: string) => {
      for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i));
      }
    };

    writeString(0, "RIFF");
    view.setUint32(4, 36 + samples.length * 2, true);
    writeString(8, "WAVE");
    writeString(12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM format
    view.setUint16(22, 1, true); // Mono (1 channel)
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true); // Byte rate
    view.setUint16(32, 2, true); // Block align
    view.setUint16(34, 16, true); // 16 bits per sample
    writeString(36, "data");
    view.setUint32(40, samples.length * 2, true);

    let offset = 44;
    for (let i = 0; i < samples.length; i++, offset += 2) {
      const s = Math.max(-1, Math.min(1, samples[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }

    return new Blob([view], { type: "audio/wav" });
  };

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

  const stopRecording = () => {
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
  };

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

  const handlePlayTTS = () => {
    if (!exercise?.targetText) return;
    
    if (isPlayingTTS) {
      window.speechSynthesis.cancel();
      setIsPlayingTTS(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(exercise.targetText);
    utterance.lang = "en-US";
    utterance.rate = 0.9; // Slightly slower for clear pronunciation
    
    utterance.onend = () => setIsPlayingTTS(false);
    utterance.onerror = () => setIsPlayingTTS(false);
    
    setIsPlayingTTS(true);
    window.speechSynthesis.speak(utterance);
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
    <div className="max-w-6xl mx-auto space-y-6 pb-20">
      {/* TOP HEADER BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border-4 border-slate-100 shadow-sm">
        <div className="flex items-center gap-4">
          <BackButton href="/practice/speaking" label="Quay lại danh sách bài nói" />
          <div className="h-6 w-0.5 bg-slate-200 hidden sm:block"></div>
          <div>
            <h1 className="text-xl font-black text-slate-800 line-clamp-1">{exercise.title}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase">{exercise.category}</span>
              <span className="bg-purple-100 text-purple-700 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase">{exercise.difficulty}</span>
            </div>
          </div>
        </div>

        {/* Sample Audio Button */}
        <button 
          onClick={handlePlayTTS}
          className={`flex items-center gap-2 px-4 py-2 rounded-2xl transition-all font-bold text-sm shadow-sm cursor-pointer ${
            isPlayingTTS 
              ? 'bg-blue-500 text-white animate-pulse' 
              : 'bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200'
          }`}
          title="Nghe audio mẫu"
        >
          <Volume2 size={20} />
          <span>{isPlayingTTS ? "Đang đọc mẫu..." : "Nghe mẫu chuẩn"}</span>
        </button>
      </div>

      {/* 2-COLUMN MAIN LAYOUT */}
      <div className="grid grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: SPEAKING EXERCISE & FEEDBACK */}
        <div className="col-span-12 lg:col-span-8 space-y-6">
          <div className="bg-white p-6 sm:p-8 rounded-[2.5rem] border-4 border-slate-100 shadow-sm">
            {/* Target Text Box */}
            <div className="bg-gradient-to-br from-purple-50/80 to-blue-50/80 p-6 sm:p-8 rounded-3xl border-2 border-purple-100/60 mb-8 text-center relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-purple-200 rounded-full blur-3xl opacity-50 -mr-10 -mt-10"></div>
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-200 rounded-full blur-3xl opacity-50 -ml-10 -mb-10"></div>
              
              <p className="text-xs font-bold text-purple-500 uppercase tracking-wider mb-4 relative z-10">Đoạn văn cần đọc</p>
              <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-2 text-xl sm:text-2xl md:text-3xl font-medium text-slate-700 leading-relaxed relative z-10 px-2 break-words max-w-full">
                {renderColoredText(exercise.targetText, result)}
              </div>

              {/* Color coding legend */}
              {result && (
                <div className="mt-6 pt-4 border-t border-purple-100 flex flex-wrap items-center justify-center gap-4 text-xs font-bold relative z-10">
                  <span className="flex items-center gap-1.5 text-emerald-600">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Phát âm chuẩn
                  </span>
                  <span className="flex items-center gap-1.5 text-red-600">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span> Cần cải thiện
                  </span>
                  <span className="flex items-center gap-1.5 text-slate-500">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-300"></span> Chưa đọc / Bỏ sót
                  </span>
                </div>
              )}
            </div>

            {/* Recording Controls */}
            <div className="flex flex-col items-center justify-center gap-6 pt-2">
              {!audioBlob ? (
                <div className="flex flex-col items-center gap-5 w-full max-w-sm">
                  {isRecording && (
                    <div className="w-full flex flex-col items-center gap-3">
                      {/* Wave animation */}
                      <div className="flex gap-1.5 items-end h-9">
                        {[...Array(14)].map((_, i) => (
                          <motion.div
                            key={i}
                            animate={{ height: ["15%", "100%", "15%"] }}
                            transition={{ 
                              repeat: Infinity, 
                              duration: 0.7, 
                              delay: (i * 0.05) % 0.4,
                              ease: "easeInOut"
                            }}
                            className={`w-1.5 rounded-full ${
                              recordingSeconds > 35 ? "bg-rose-500" : recordingSeconds > 25 ? "bg-amber-500" : "bg-emerald-500"
                            }`}
                          />
                        ))}
                      </div>

                      {/* Timer Badge */}
                      <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900 text-white font-mono font-black text-sm shadow-md">
                        <span className={`w-2.5 h-2.5 rounded-full animate-ping ${
                          recordingSeconds > 35 ? "bg-rose-400" : "bg-emerald-400"
                        }`} />
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
                    onClick={isRecording ? stopRecording : startRecording}
                    className={`w-24 h-24 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                      isRecording 
                        ? 'bg-rose-500 text-white animate-pulse shadow-xl shadow-rose-500/40 scale-110' 
                        : 'bg-gradient-to-br from-purple-500 to-indigo-500 text-white hover:scale-105 shadow-xl shadow-purple-500/30'
                    }`}
                    title={isRecording ? "Dừng ghi âm" : "Bắt đầu thu âm"}
                  >
                    {isRecording ? <StopCircle size={44} /> : <Mic size={44} />}
                  </button>

                  <div className="text-center">
                    <p className={`font-bold text-sm ${isRecording ? 'text-rose-600 font-black' : 'text-slate-600'}`}>
                      {isRecording ? 'Đang ghi âm... Nhấn vào nút đỏ để dừng' : 'Nhấn vào Micro để bắt đầu đọc'}
                    </p>
                    <p className="text-[11px] font-bold text-slate-400 mt-1">
                      ⚡ Tối đa 45s/câu • Chuẩn âm vị Azure AI Speech
                    </p>
                  </div>
                </div>
              ) : (
                <div className="w-full max-w-md flex flex-col items-center gap-5 bg-slate-50 p-6 rounded-3xl border-2 border-slate-100">
                  <audio src={audioUrl!} controls className="w-full h-11" />
                  
                  <div className="flex gap-3 w-full">
                    <button 
                      onClick={() => { setAudioBlob(null); setAudioUrl(null); submitAudioMut.reset(); }}
                      className="flex-1 py-3 px-4 rounded-xl font-bold text-slate-600 bg-white border-2 border-slate-200 hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                      Thu lại
                    </button>
                    <button 
                      onClick={handleSubmit}
                      disabled={submitAudioMut.isPending}
                      className="flex-1 py-3 px-4 rounded-xl font-bold text-white bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 shadow-md transition-all disabled:opacity-70 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {submitAudioMut.isPending ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
                      Chấm điểm AI
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Error handling */}
          {submitAudioMut.isError && (
            <div className="bg-red-50 border-2 border-red-200 text-red-600 p-6 rounded-3xl flex items-start gap-4">
              <AlertTriangle className="shrink-0 mt-1" />
              <div>
                <h3 className="font-bold text-lg mb-1">Lỗi phân tích</h3>
                <p>{(submitAudioMut.error as any)?.response?.data?.message || "Đã xảy ra lỗi khi chấm điểm. Có thể do bạn chưa nói gì, hoặc tạp âm quá ồn."}</p>
              </div>
            </div>
          )}

          {/* AI Feedback Result */}
          {submitAudioMut.isSuccess && result && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-br from-indigo-900 via-purple-900 to-indigo-800 p-6 sm:p-8 rounded-[2.5rem] text-white shadow-2xl overflow-hidden relative"
            >
              <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                <Activity size={200} />
              </div>

              <div className="flex items-center gap-4 mb-6 relative z-10">
                <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-md">
                  <Star size={28} className="text-yellow-400 fill-yellow-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Báo cáo Phát âm Chi tiết</h2>
                  <p className="text-indigo-200 text-xs">AI đã phân tích từng âm tiết theo ngữ âm chuẩn</p>
                </div>
              </div>
              
              {/* Silence Alert Banner */}
              {(result.isSilentOrNoSpeech || result.overallScore === 0) && (
                <div className="mb-6 bg-amber-500/20 border-2 border-amber-400/60 text-amber-100 p-4 rounded-2xl flex items-center gap-3 relative z-10 backdrop-blur-md">
                  <AlertTriangle className="text-amber-400 shrink-0" size={24} />
                  <div className="text-sm font-medium">
                    <span className="font-bold text-amber-300">Không phát hiện giọng nói rõ ràng:</span> Hệ thống chưa nghe thấy bạn đọc đoạn văn. Hãy kiểm tra lại micro, chọn nơi yên tĩnh và đọc to, rõ ràng theo câu mẫu nhé!
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6 relative z-10">
                <div className="col-span-2 bg-white/10 backdrop-blur-md p-5 rounded-3xl border border-white/20 flex flex-col items-center justify-center text-center">
                  <div className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400 mb-1">
                    {result.overallScore} <span className="text-xl text-white/50">/ 10</span>
                  </div>
                  <p className="font-bold text-indigo-200 uppercase tracking-wider text-xs">Điểm Tổng</p>
                </div>
                
                <div className="bg-white/10 backdrop-blur-md p-5 rounded-3xl border border-white/20 flex flex-col items-center justify-center text-center">
                  <div className="text-3xl font-bold text-white mb-1">{result.accuracyScore || 0}</div>
                  <p className="font-bold text-indigo-300 uppercase tracking-wider text-[10px]">Chính xác (Accuracy)</p>
                </div>
                
                <div className="bg-white/10 backdrop-blur-md p-5 rounded-3xl border border-white/20 flex flex-col items-center justify-center text-center">
                  <div className="text-3xl font-bold text-white mb-1">{result.fluencyScore || 0}</div>
                  <p className="font-bold text-indigo-300 uppercase tracking-wider text-[10px]">Trôi chảy (Fluency)</p>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4 relative z-10">
                <div className="bg-white text-slate-800 p-5 rounded-3xl shadow-lg">
                  <h3 className="font-bold text-base mb-3 flex items-center gap-2 text-indigo-600">
                    <CheckCircle2 size={18} /> Nhận xét giáo viên AI
                  </h3>
                  <p className="text-slate-600 text-sm leading-relaxed font-medium">
                    {result.feedback}
                  </p>
                  
                  {result.problematicWords && result.problematicWords.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-slate-100">
                      <p className="text-xs font-bold text-red-500 mb-2 uppercase tracking-wider">Từ cần luyện thêm:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {result.problematicWords.map((word: string, i: number) => (
                          <span key={i} className="bg-red-50 text-red-600 px-2.5 py-1 rounded-lg font-bold text-xs border border-red-100">
                            {word}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="bg-indigo-800/50 backdrop-blur-md border border-indigo-400/30 p-5 rounded-3xl">
                  <h3 className="font-bold text-base mb-3 text-indigo-100 flex items-center gap-2">
                    <Sparkles size={18} className="text-yellow-400" /> Gợi ý cải thiện
                  </h3>
                  {result.suggestions && result.suggestions.length > 0 ? (
                    <ul className="space-y-3">
                      {result.suggestions.map((sug: string, i: number) => (
                        <li key={i} className="flex gap-2.5 text-indigo-50 text-xs">
                          <span className="shrink-0 w-5 h-5 rounded-full bg-indigo-500/50 flex items-center justify-center text-[10px] font-bold text-indigo-100">{i + 1}</span>
                          <span className="leading-relaxed font-medium">{sug}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-indigo-200 text-xs">Tuyệt vời! Hãy tiếp tục duy trì phong độ này nhé.</p>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* RIGHT COLUMN: EXERCISE CONTEXT & PRO TIPS */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
          {/* Image & Topic Info Card */}
          {exercise.imageUrl && (
            <div className="bg-white p-4 rounded-[2rem] border-4 border-slate-100 shadow-sm overflow-hidden">
              <div className="rounded-2xl overflow-hidden border border-slate-100 max-h-48 mb-3">
                <img src={exercise.imageUrl} alt="Exercise image" className="w-full h-full object-cover" />
              </div>
              <p className="text-xs text-slate-500 font-bold text-center">Hình ảnh minh họa ngữ cảnh bài nói</p>
            </div>
          )}

          {/* Speaking Guidance Tips */}
          <div className="bg-gradient-to-br from-purple-50 to-indigo-50 p-6 rounded-[2rem] border-2 border-purple-100 space-y-4">
            <h3 className="font-black text-purple-900 text-base flex items-center gap-2">
              <span>🎙️</span> Bí Quyết Đạt Điểm Cao
            </h3>

            <ul className="space-y-3 text-xs font-bold text-purple-800">
              <li className="bg-white/80 p-3 rounded-xl border border-purple-100 flex items-start gap-2.5">
                <span className="text-purple-600 text-sm mt-0.5">1.</span>
                <span>Bấm nút <strong>Nghe mẫu chuẩn</strong> ở trên để làm quen với ngữ điệu và trọng âm câu.</span>
              </li>
              <li className="bg-white/80 p-3 rounded-xl border border-purple-100 flex items-start gap-2.5">
                <span className="text-purple-600 text-sm mt-0.5">2.</span>
                <span>Nói to, rõ ràng, giữ khoảng cách khoảng 10-15cm so với micro của thiết bị.</span>
              </li>
              <li className="bg-white/80 p-3 rounded-xl border border-purple-100 flex items-start gap-2.5">
                <span className="text-purple-600 text-sm mt-0.5">3.</span>
                <span>Đừng quên phát âm rõ các âm đuôi quan trọng như <em>/s/, /ed/, /t/, /d/</em>.</span>
              </li>
            </ul>
          </div>

          {/* Gamification Reward Card */}
          <div className="bg-purple-50 border-2 border-purple-200 p-5 rounded-[2rem] flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-purple-500 text-white flex items-center justify-center text-2xl shadow-sm shrink-0">
              ⭐
            </div>
            <div>
              <p className="font-black text-slate-800 text-sm">Phần Thưởng Luyện Phát Âm</p>
              <p className="text-xs font-bold text-purple-800 mt-0.5">+25 EXP khi đạt điểm &ge; 8.0/10</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
