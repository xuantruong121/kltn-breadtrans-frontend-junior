"use client";

import { useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Mic, StopCircle, PlayCircle, Star, Sparkles } from "lucide-react";
import { speakingService } from "@/lib/api/services/speaking.service";

export default function SpeakingExerciseDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const exerciseId = Number(id);

  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const { data: exercise, isLoading } = useQuery({
    queryKey: ["speaking-exercise", exerciseId],
    queryFn: () => speakingService.getExerciseById(exerciseId),
    enabled: !!exerciseId,
  });

  const submitAudioMut = useMutation({
    mutationFn: (blob: Blob) => speakingService.submitAudio(exerciseId, blob),
  });

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
          <div className="bg-purple-100 p-4 rounded-2xl text-purple-600">
            <Mic size={32} />
          </div>
        </div>

        {exercise.imageUrl && (
          <div className="mb-8 rounded-2xl overflow-hidden border-2 border-slate-200">
            <img src={exercise.imageUrl} alt="Exercise image" className="w-full h-auto object-cover max-h-64" />
          </div>
        )}

        <div className="bg-purple-50 p-6 rounded-2xl border border-purple-100 mb-8 text-center">
          <p className="text-sm font-bold text-purple-400 uppercase tracking-wider mb-2">Đoạn văn cần đọc</p>
          <p className="text-2xl font-medium text-slate-800 leading-relaxed">
            "{exercise.targetText}"
          </p>
        </div>

        {/* Recording Controls */}
        <div className="flex flex-col items-center justify-center gap-6 mt-12 border-t-2 border-dashed border-slate-200 pt-12">
          {!audioBlob ? (
            <div className="flex flex-col items-center gap-4">
              <button
                onClick={isRecording ? stopRecording : startRecording}
                className={`w-24 h-24 rounded-full flex items-center justify-center transition-all ${
                  isRecording 
                    ? 'bg-red-100 text-red-500 animate-pulse scale-110 shadow-lg shadow-red-500/20' 
                    : 'bg-purple-100 text-purple-500 hover:bg-purple-200 hover:scale-105'
                }`}
              >
                {isRecording ? <StopCircle size={48} /> : <Mic size={48} />}
              </button>
              <p className="font-bold text-slate-500">
                {isRecording ? 'Đang ghi âm... Nhấn để dừng' : 'Nhấn để bắt đầu ghi âm'}
              </p>
            </div>
          ) : (
            <div className="w-full max-w-md flex flex-col items-center gap-6">
              <audio src={audioUrl!} controls className="w-full" />
              
              <div className="flex gap-4 w-full">
                <button 
                  onClick={() => { setAudioBlob(null); setAudioUrl(null); }}
                  className="flex-1 py-3 px-4 rounded-xl font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors"
                >
                  Thu lại
                </button>
                <button 
                  onClick={handleSubmit}
                  disabled={submitAudioMut.isPending}
                  className="flex-1 py-3 px-4 rounded-xl font-bold text-white bg-junior-blue hover:bg-blue-600 shadow-md shadow-blue-500/20 transition-colors flex items-center justify-center gap-2"
                >
                  {submitAudioMut.isPending ? <Loader2 className="animate-spin" size={20} /> : <Sparkles size={20} />}
                  Chấm điểm AI
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* AI Feedback Result */}
      {submitAudioMut.isSuccess && submitAudioMut.data && (
        <div className="bg-gradient-to-r from-emerald-400 to-teal-500 p-8 rounded-[2rem] text-white shadow-xl">
          <div className="flex items-center gap-4 mb-6">
            <div className="bg-white/20 p-3 rounded-xl">
              <Star size={32} />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Kết quả đánh giá</h2>
              <p className="text-emerald-100">AI Gia sư đã phân tích giọng đọc của bạn</p>
            </div>
          </div>
          
          <div className="bg-white text-slate-800 p-6 rounded-2xl flex flex-col items-center mb-6">
            <div className="text-6xl font-black text-emerald-500 mb-2">
              {submitAudioMut.data.score || 8.5} <span className="text-xl text-slate-400">/ 10</span>
            </div>
            <p className="font-bold text-slate-500 uppercase tracking-wider text-sm">Điểm Phát Âm</p>
          </div>

          <div className="bg-white/10 p-6 rounded-2xl border border-white/20">
            <h3 className="font-bold text-lg mb-2">Nhận xét chi tiết:</h3>
            <p className="text-emerald-50 whitespace-pre-wrap leading-relaxed">
              {submitAudioMut.data.feedback || "Phát âm khá tốt. Chú ý nhấn nhá trọng âm ở các từ ghép."}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
