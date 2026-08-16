"use client";

import { useState, useRef, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Mic, StopCircle, Star, Sparkles, Volume2, Activity, CheckCircle2, AlertTriangle } from "lucide-react";
import { speakingService } from "@/lib/api/services/speaking.service";
import { motion } from "framer-motion";

export default function SpeakingExerciseDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const exerciseId = Number(id);

  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [isPlayingTTS, setIsPlayingTTS] = useState(false);

  const { data: exercise, isLoading } = useQuery({
    queryKey: ["speaking-exercise", exerciseId],
    queryFn: () => speakingService.getExerciseById(exerciseId),
    enabled: !!exerciseId,
  });

  const submitAudioMut = useMutation({
    mutationFn: (blob: Blob) => speakingService.submitAudio(exerciseId, blob),
  });

  // Clean up audio URL on unmount
  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      window.speechSynthesis.cancel();
    };
  }, [audioUrl]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        setAudioBlob(audioBlob);
        setAudioUrl(URL.createObjectURL(audioBlob));
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Không thể truy cập Microphone. Vui lòng cấp quyền.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      // Stop all tracks to release mic
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  const handleSubmit = () => {
    if (audioBlob) {
      submitAudioMut.mutate(audioBlob);
    }
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

  // Helper function to render text with color-coded problematic words
  const renderColoredText = (text: string, problematicWords: string[]) => {
    if (!problematicWords || problematicWords.length === 0) {
      return <span className="text-emerald-500">{text}</span>;
    }

    // Convert problematic words to lowercase for easy matching, and remove punctuation
    const badWords = problematicWords.map(w => w.toLowerCase().replace(/[.,!?;:]/g, ""));
    const words = text.split(" ");

    return words.map((word, index) => {
      const cleanWord = word.toLowerCase().replace(/[.,!?;:]/g, "");
      const isBad = badWords.includes(cleanWord);
      return (
        <span 
          key={index} 
          className={`mx-1 ${isBad ? "text-red-500 font-bold underline decoration-red-300 decoration-wavy underline-offset-4" : "text-emerald-500"}`}
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
    <div className="max-w-4xl mx-auto pb-20">
      <button 
        onClick={() => router.back()}
        className="flex items-center gap-2 text-slate-500 hover:text-slate-800 font-bold mb-8 transition-colors"
      >
        <ArrowLeft size={20} /> Quay lại
      </button>

      <div className="bg-white p-8 rounded-[2rem] border-4 border-slate-100 shadow-sm mb-8">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 mb-2">{exercise.title}</h1>
            <div className="flex gap-2">
              <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-bold uppercase">{exercise.category}</span>
              <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-xs font-bold uppercase">{exercise.difficulty}</span>
            </div>
          </div>
          <button 
            onClick={handlePlayTTS}
            className={`p-4 rounded-2xl transition-all shadow-sm ${isPlayingTTS ? 'bg-blue-500 text-white animate-pulse' : 'bg-blue-50 text-blue-500 hover:bg-blue-100'}`}
            title="Nghe mẫu"
          >
            <Volume2 size={32} />
          </button>
        </div>

        {exercise.imageUrl && (
          <div className="mb-8 rounded-2xl overflow-hidden border-2 border-slate-200">
            <img src={exercise.imageUrl} alt="Exercise image" className="w-full h-auto object-cover max-h-64" />
          </div>
        )}

        <div className="bg-gradient-to-br from-purple-50 to-blue-50 p-8 rounded-[2rem] border-2 border-purple-100/50 mb-8 text-center relative overflow-hidden">
          {/* Decorative background elements */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-200 rounded-full blur-3xl opacity-50 -mr-10 -mt-10"></div>
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-200 rounded-full blur-3xl opacity-50 -ml-10 -mb-10"></div>
          
          <p className="text-sm font-bold text-purple-400 uppercase tracking-wider mb-4 relative z-10">Đoạn văn cần đọc</p>
          <div className="text-3xl font-medium text-slate-700 leading-relaxed relative z-10 px-4">
            {result ? (
              // Show color-coded text after submission
              renderColoredText(exercise.targetText, result.problematicWords)
            ) : (
              // Default text before submission
              `"${exercise.targetText}"`
            )}
          </div>
        </div>

        {/* Recording Controls */}
        <div className="flex flex-col items-center justify-center gap-6 mt-12 pt-8">
          {!audioBlob ? (
            <div className="flex flex-col items-center gap-6">
              {isRecording && (
                <div className="flex gap-1 items-end h-8 mb-4">
                  {[...Array(12)].map((_, i) => (
                    <motion.div
                      key={i}
                      animate={{ height: ["20%", "100%", "20%"] }}
                      transition={{ 
                        repeat: Infinity, 
                        duration: 0.8, 
                        delay: i * 0.05,
                        ease: "easeInOut"
                      }}
                      className="w-1.5 bg-red-400 rounded-full"
                    />
                  ))}
                </div>
              )}
              
              <button
                onClick={isRecording ? stopRecording : startRecording}
                className={`w-28 h-28 rounded-full flex items-center justify-center transition-all ${
                  isRecording 
                    ? 'bg-red-500 text-white animate-pulse shadow-xl shadow-red-500/40 scale-110' 
                    : 'bg-gradient-to-br from-purple-500 to-indigo-500 text-white hover:scale-105 shadow-xl shadow-purple-500/30'
                }`}
              >
                {isRecording ? <StopCircle size={48} /> : <Mic size={48} />}
              </button>
              <p className={`font-bold ${isRecording ? 'text-red-500' : 'text-slate-500'}`}>
                {isRecording ? 'Đang ghi âm... Nhấn để dừng' : 'Nhấn vào Micro để bắt đầu đọc'}
              </p>
            </div>
          ) : (
            <div className="w-full max-w-md flex flex-col items-center gap-6 bg-slate-50 p-6 rounded-3xl border-2 border-slate-100">
              <audio src={audioUrl!} controls className="w-full h-12" />
              
              <div className="flex gap-4 w-full">
                <button 
                  onClick={() => { setAudioBlob(null); setAudioUrl(null); submitAudioMut.reset(); }}
                  className="flex-1 py-3.5 px-4 rounded-xl font-bold text-slate-500 bg-white border-2 border-slate-200 hover:bg-slate-100 transition-colors"
                >
                  Thu lại
                </button>
                <button 
                  onClick={handleSubmit}
                  disabled={submitAudioMut.isPending}
                  className="flex-1 py-3.5 px-4 rounded-xl font-bold text-white bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 shadow-lg shadow-purple-500/30 transition-all disabled:opacity-70 flex items-center justify-center gap-2"
                >
                  {submitAudioMut.isPending ? <Loader2 className="animate-spin" size={20} /> : <Sparkles size={20} />}
                  Chấm điểm AI
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Error handling */}
      {submitAudioMut.isError && (
        <div className="bg-red-50 border-2 border-red-200 text-red-600 p-6 rounded-2xl flex items-start gap-4">
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
          className="bg-gradient-to-br from-indigo-900 via-purple-900 to-indigo-800 p-8 rounded-[2rem] text-white shadow-2xl overflow-hidden relative"
        >
          {/* Decorative background vectors */}
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
            <Activity size={200} />
          </div>

          <div className="flex items-center gap-4 mb-8 relative z-10">
            <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-md">
              <Star size={32} className="text-yellow-400 fill-yellow-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Báo cáo Phát âm</h2>
              <p className="text-indigo-200">AI đã phân tích từng âm tiết của bạn</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 relative z-10">
            <div className="col-span-2 bg-white/10 backdrop-blur-md p-6 rounded-3xl border border-white/20 flex flex-col items-center justify-center text-center">
              <div className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400 mb-2">
                {result.overallScore} <span className="text-2xl text-white/50">/ 10</span>
              </div>
              <p className="font-bold text-indigo-200 uppercase tracking-wider text-sm">Điểm Tổng</p>
            </div>
            
            <div className="bg-white/10 backdrop-blur-md p-6 rounded-3xl border border-white/20 flex flex-col items-center justify-center text-center">
              <div className="text-4xl font-bold text-white mb-2">{result.accuracyScore || 0}</div>
              <p className="font-bold text-indigo-300 uppercase tracking-wider text-[10px]">Chính xác (Accuracy)</p>
            </div>
            
            <div className="bg-white/10 backdrop-blur-md p-6 rounded-3xl border border-white/20 flex flex-col items-center justify-center text-center">
              <div className="text-4xl font-bold text-white mb-2">{result.fluencyScore || 0}</div>
              <p className="font-bold text-indigo-300 uppercase tracking-wider text-[10px]">Trôi chảy (Fluency)</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6 relative z-10">
            <div className="bg-white text-slate-800 p-6 rounded-3xl shadow-lg">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-indigo-600">
                <CheckCircle2 size={20} /> Nhận xét chi tiết
              </h3>
              <p className="text-slate-600 leading-relaxed font-medium">
                {result.feedback}
              </p>
              
              {result.problematicWords && result.problematicWords.length > 0 && (
                <div className="mt-6 pt-6 border-t border-slate-100">
                  <p className="text-sm font-bold text-red-500 mb-3 uppercase tracking-wider">Các từ cần cải thiện:</p>
                  <div className="flex flex-wrap gap-2">
                    {result.problematicWords.map((word: string, i: number) => (
                      <span key={i} className="bg-red-50 text-red-600 px-3 py-1.5 rounded-lg font-bold text-sm border border-red-100">
                        {word}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="bg-indigo-800/50 backdrop-blur-md border border-indigo-400/30 p-6 rounded-3xl">
              <h3 className="font-bold text-lg mb-4 text-indigo-100 flex items-center gap-2">
                <Sparkles size={20} className="text-yellow-400" /> Gợi ý luyện tập
              </h3>
              {result.suggestions && result.suggestions.length > 0 ? (
                <ul className="space-y-4">
                  {result.suggestions.map((sug: string, i: number) => (
                    <li key={i} className="flex gap-3 text-indigo-50">
                      <span className="shrink-0 w-6 h-6 rounded-full bg-indigo-500/50 flex items-center justify-center text-xs font-bold text-indigo-100">{i + 1}</span>
                      <span className="leading-relaxed text-sm font-medium">{sug}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-indigo-200 text-sm">Tuyệt vời! Hãy tiếp tục duy trì phong độ này nhé.</p>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
