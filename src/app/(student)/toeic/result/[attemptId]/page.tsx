"use client";

import { useQuery } from "@tanstack/react-query";
import { use } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, XCircle, Award } from "lucide-react";
import axiosClient from "@/lib/api/axiosClient";

export default function ToeicResultPage(props: { params: Promise<{ attemptId: string }> }) {
  const params = use(props.params);
  const router = useRouter();
  const attemptId = parseInt(params.attemptId);

  const { data: result, isLoading } = useQuery({
    queryKey: ["toeic-result", attemptId],
    queryFn: async () => {
      try {
        const res = await axiosClient.get(`/toeic/attempts/${attemptId}/result`);
        return res;
      } catch (err) {
        // Mock fallback
        return {
          id: attemptId,
          totalScore: 850,
          listeningScore: 450,
          readingScore: 400,
          answers: [
             { questionId: 1, selectedIndex: 0 },
             { questionId: 2, selectedIndex: 1 }
          ],
          exam: {
            title: "Mock TOEIC Test",
            groups: [
              {
                questions: [
                  { id: 1, questionNumber: 1, text: "Cau 1", correctIndex: 0, explanation: "Vì A đúng" },
                  { id: 2, questionNumber: 2, text: "Cau 2", correctIndex: 2, explanation: "Vì C đúng" }
                ]
              }
            ]
          }
        };
      }
    }
  });

  if (isLoading) return <p className="p-8">Đang tải kết quả...</p>;
  if (!result) return <p className="p-8">Không tìm thấy kết quả</p>;

  // @ts-ignore
  const allQuestions = result.exam?.groups?.flatMap(g => g.questions) || [];

  return (
    <div className="max-w-4xl mx-auto pb-12">
      <button 
        onClick={() => router.push("/toeic")}
        className="flex items-center gap-2 text-slate-500 hover:text-slate-800 font-bold mb-8 transition-colors"
      >
        <ArrowLeft size={20} /> Về Trang Chủ TOEIC
      </button>

      {/* Score Banner */}
      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-3xl p-8 mb-8 flex flex-col md:flex-row items-center justify-between shadow-lg">
        <div>
          <h1 className="text-3xl font-bold mb-2">Kết quả bài làm</h1>
          <p className="text-blue-200">Đề thi: {result.exam?.title}</p>
        </div>
        <div className="flex gap-6 mt-6 md:mt-0 text-center">
          <div className="bg-white/10 rounded-2xl p-4 backdrop-blur-sm min-w-[100px]">
            <p className="text-sm text-blue-200 font-bold mb-1">Listening</p>
            <p className="text-2xl font-bold">{result.listeningScore || 0}</p>
          </div>
          <div className="bg-white/10 rounded-2xl p-4 backdrop-blur-sm min-w-[100px]">
            <p className="text-sm text-blue-200 font-bold mb-1">Reading</p>
            <p className="text-2xl font-bold">{result.readingScore || 0}</p>
          </div>
          <div className="bg-white text-blue-600 rounded-2xl p-4 min-w-[120px] shadow-sm transform scale-110">
            <p className="text-sm font-bold mb-1">Total Score</p>
            <p className="text-4xl font-black">{result.totalScore || 0}</p>
          </div>
        </div>
      </div>

      {/* Detail Review */}
      <h2 className="text-2xl font-bold text-slate-800 mb-6">Chi tiết đáp án</h2>
      <div className="space-y-6">
        {allQuestions.map((q: any) => {
          const userAnswerObj = (result.answers as any[]).find(a => a.questionId === q.id);
          const userAnswer = userAnswerObj ? userAnswerObj.selectedIndex : null;
          const isCorrect = userAnswer === q.correctIndex;

          return (
            <div key={q.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex gap-4 items-start mb-4">
                <div className={`mt-1 flex-shrink-0 ${isCorrect ? 'text-green-500' : 'text-red-500'}`}>
                  {isCorrect ? <CheckCircle2 size={24} /> : <XCircle size={24} />}
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-lg">Câu {q.questionNumber}</h3>
                  <p className="text-slate-600 mt-1">{q.text}</p>
                </div>
              </div>
              
              <div className="ml-10 bg-slate-50 p-4 rounded-xl text-sm mb-4">
                <p><span className="font-bold">Đáp án của bạn:</span> {userAnswer !== null ? String.fromCharCode(65 + userAnswer) : "Chưa chọn"}</p>
                <p className="text-green-600 mt-1"><span className="font-bold">Đáp án đúng:</span> {String.fromCharCode(65 + q.correctIndex)}</p>
              </div>

              {q.explanation && (
                <div className="ml-10 text-sm text-slate-500 italic border-l-4 border-blue-200 pl-4">
                  Giải thích: {q.explanation}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
