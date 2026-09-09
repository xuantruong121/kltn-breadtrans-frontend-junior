"use client";

import React from "react";
import {
  SpeakingSubmissionDetail,
  WordAssessmentItem,
} from "@/lib/api/services/speaking.service";
import {
  AlertTriangle,
  RefreshCw,
  Volume2,
  Award,
  Loader2,
} from "lucide-react";

interface PronunciationReportCardProps {
  submission: SpeakingSubmissionDetail | null;
  targetText: string;
  isPolling?: boolean;
  onRetry?: () => void;
  onSelectWord?: (word: string) => void;
  onPlaySample?: (word: string) => void;
  userAudioUrl?: string | null;
}

export const PronunciationReportCard: React.FC<PronunciationReportCardProps> = ({
  submission,
  targetText,
  isPolling,
  onRetry,
  onSelectWord,
  onPlaySample,
  userAudioUrl,
}) => {
  if (!submission && !isPolling) {
    return null;
  }

  // State 1: PENDING or PROCESSING
  if (isPolling || submission?.status === "PENDING" || submission?.status === "PROCESSING") {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-6 text-center animate-in fade-in">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-600">
          <Loader2 className="h-7 w-7 animate-spin" />
        </div>
        <h3 className="mt-4 text-base font-semibold text-slate-800">
          {submission?.status === "PROCESSING"
            ? "Hệ thống đang phân tích ngữ âm..."
            : "Đang xếp hàng chờ đánh giá phát âm..."}
        </h3>
        <p className="mt-1 text-sm text-slate-600 max-w-sm mx-auto">
          Bản ghi âm đã được tiếp nhận an toàn. Kết quả điểm chi tiết sẽ hiển thị tự động sau vài giây.
        </p>
      </div>
    );
  }

  // State 2: FAILED
  if (submission?.status === "FAILED") {
    const isTimeout = submission.lastErrorCode === "PROVIDER_TIMEOUT";
    const isInvalid = submission.lastErrorCode === "INVALID_AUDIO";

    return (
      <div className="rounded-2xl border border-red-200 bg-red-50/60 p-6 text-center animate-in fade-in">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-red-600">
          <AlertTriangle className="h-7 w-7" />
        </div>
        <h3 className="mt-4 text-base font-semibold text-red-900">
          {isInvalid
            ? "Tệp âm thanh không hợp lệ"
            : isTimeout
              ? "Dịch vụ đánh giá phản hồi chậm"
              : "Không thể hoàn tất chấm điểm"}
        </h3>
        <p className="mt-1 text-sm text-red-700 max-w-md mx-auto">
          {submission.lastErrorCode === "INVALID_AUDIO"
            ? "Bản ghi âm chưa đạt chuẩn kỹ thuật (mono 16kHz WAV). Vui lòng thử ghi âm lại trực tiếp trên trình duyệt."
            : submission.lastErrorCode === "PROVIDER_TIMEOUT"
              ? "Hệ thống đánh giá phát âm bị quá tải trong giây lát. Bạn hãy thử nộp lại nhé."
              : "Hệ thống đã lưu nhận bài nhưng chưa thể trích xuất kết quả. Vui lòng ghi âm lại."}
        </p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-400"
          >
            <RefreshCw className="h-4 w-4" />
            Thử lại bài nộp
          </button>
        )}
      </div>
    );
  }

  // State 3: COMPLETED
  const feedback = submission?.aiFeedback;
  const overallScore = submission?.overallScore;
  const isNoSpeech =
    submission?.lastErrorCode === "NO_SPEECH" ||
    feedback?.isSilentOrNoSpeech === true;
  const displayScore = overallScore ?? 0;

  const accuracy = feedback?.accuracyScore ?? 0;
  const fluency = feedback?.fluencyScore ?? 0;
  const completeness = feedback?.completenessScore ?? 0;
  const wordsList: WordAssessmentItem[] = feedback?.words || [];

  return (
    <div className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm animate-in fade-in">
      {/* Header / Score Overview */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pb-6 border-b border-slate-100">
        <div className="flex items-center gap-4">
          <div
            className={`flex h-20 w-20 flex-col items-center justify-center rounded-2xl border text-center shadow-inner ${
              isNoSpeech
                ? "border-slate-300 bg-slate-100 text-slate-600"
                : displayScore >= 8
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : displayScore >= 6
                    ? "border-blue-200 bg-blue-50 text-blue-700"
                    : displayScore >= 4
                      ? "border-amber-200 bg-amber-50 text-amber-700"
                      : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            <span className="text-3xl font-extrabold leading-none">
              {isNoSpeech ? "—" : displayScore.toFixed(1)}
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mt-1">
              Điểm / 10
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-slate-900">
                {isNoSpeech
                  ? "Chưa phát hiện giọng nói"
                    : displayScore >= 8
                      ? "Phát âm xuất sắc"
                      : displayScore >= 6
                        ? "Phát âm khá tốt"
                        : displayScore >= 4
                        ? "Cần luyện tập thêm"
                        : "Phát âm cần cải thiện"}
              </h3>
              {!isNoSpeech && displayScore >= 8 && (
                <Award className="h-5 w-5 text-emerald-600" />
              )}
            </div>
            <p className="mt-1 text-sm text-slate-600 max-w-md">
              {feedback?.feedback ||
                (isNoSpeech
                  ? "Micro chưa thu được âm thanh rõ nét. Hãy kiểm tra âm lượng micro và đọc to rõ ràng từng từ."
                  : `Bạn đạt ${displayScore.toFixed(1)}/10 điểm cho lượt đọc này.`)}
            </p>
          </div>
        </div>

        {/* User Recording Playback */}
        {(submission?.audioUrl || userAudioUrl) && (
          <div className="flex items-center gap-2">
            <audio
              src={submission?.audioUrl || userAudioUrl || ""}
              controls
              className="h-10 max-w-[240px]"
            />
          </div>
        )}
      </div>

      {/* Breakdown Scores */}
      {!isNoSpeech && (
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-100 text-center">
            <span className="text-xs font-semibold text-slate-500 uppercase">
              Chính xác
            </span>
            <p className="mt-1 text-xl font-bold text-slate-800">{accuracy}%</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-100 text-center">
            <span className="text-xs font-semibold text-slate-500 uppercase">
              Trôi chảy
            </span>
            <p className="mt-1 text-xl font-bold text-slate-800">{fluency}%</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-100 text-center">
            <span className="text-xs font-semibold text-slate-500 uppercase">
              Hoàn thiện
            </span>
            <p className="mt-1 text-xl font-bold text-slate-800">{completeness}%</p>
          </div>
        </div>
      )}

      {/* Transcript comparison */}
      <div className="space-y-2 rounded-xl bg-slate-50/70 p-4 border border-slate-200">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
          <span>CHI TIẾT TỪNG TỪ ĐÃ NÓI</span>
          <span className="italic">Nhấn vào từ để tra từ điển & nghe mẫu</span>
        </div>

        {/* Word chips */}
        <div className="flex flex-wrap gap-2 pt-1">
          {wordsList.length > 0 ? (
            wordsList.map((item, idx) => {
              const isCorrect = item.isCorrect && item.errorType === "None";
              const isMispronounced = item.errorType === "Mispronunciation";
              const isOmitted = item.errorType === "Omission" || item.errorType === "Unspoken";
              const isInserted = item.errorType === "Insertion";

              return (
                <button
                  key={`${item.word}-${idx}`}
                  type="button"
                  onClick={() => onSelectWord && onSelectWord(item.word)}
                  className={`group inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-sm font-medium border transition-all ${
                    isCorrect
                      ? "border-emerald-200 bg-emerald-50/80 text-emerald-800 hover:bg-emerald-100"
                      : isMispronounced
                        ? "border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100"
                        : isOmitted
                          ? "border-red-200 bg-red-50 text-red-800 hover:bg-red-100 line-through opacity-80"
                          : isInserted
                            ? "border-blue-200 bg-blue-50 text-blue-800 hover:bg-blue-100"
                            : "border-slate-200 bg-white text-slate-700"
                  }`}
                  title={`${item.word}: ${
                    isCorrect
                      ? `Chuẩn (${item.accuracyScore}%)`
                      : isMispronounced
                        ? `Phát âm chưa chuẩn (${item.accuracyScore}%)`
                        : isOmitted
                          ? "Bị bỏ sót / chưa đọc"
                          : "Từ nói thêm"
                  }`}
                >
                  <span>{item.word}</span>
                  {onPlaySample && (
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        onPlaySample(item.word);
                      }}
                      className="rounded p-0.5 text-slate-400 hover:text-slate-700"
                      title="Nghe phát âm mẫu"
                    >
                      <Volume2 className="h-3 w-3" />
                    </span>
                  )}
                </button>
              );
            })
          ) : (
            <p className="text-sm text-slate-600">{targetText}</p>
          )}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 pt-3 text-[11px] text-slate-500 border-t border-slate-200/60">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            Phát âm đúng
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
            Cần chỉnh lại
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
            Bỏ sót
          </span>
          {submission?.transcript && (
            <span className="ml-auto text-slate-400">
              Nhận diện: &ldquo;{submission.transcript}&rdquo;
            </span>
          )}
        </div>
      </div>

      {/* Actionable suggestions */}
      {feedback?.suggestions && feedback.suggestions.length > 0 && (
        <div className="rounded-xl bg-amber-50/60 p-4 border border-amber-100 text-sm">
          <h4 className="font-semibold text-amber-900 text-xs uppercase tracking-wider mb-2">
            Gợi ý cải thiện
          </h4>
          <ul className="space-y-1.5 text-slate-700 text-xs">
            {feedback.suggestions.map((sug, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-amber-500 font-bold">•</span>
                <span>{sug}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
