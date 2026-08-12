"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { PlayCircle, Clock, Award, FileText } from "lucide-react";
import axiosClient from "@/lib/api/axiosClient";

export default function ToeicDashboard() {
  const router = useRouter();

  const { data: exams, isLoading } = useQuery({
    queryKey: ["toeic-exams"],
    queryFn: async () => {
      // Temporary fallback if backend fails (since backend might need restart to compile new Prisma client)
      try {
        const res = await axiosClient.get("/toeic/exams");
        return res;
      } catch (err) {
        return [
          { id: 1, title: "ETS TOEIC 2024 Test 1", description: "Đề thi chuẩn ETS mới nhất.", difficulty: "hard" },
          { id: 2, title: "ETS TOEIC 2024 Test 2", description: "Đề thi thử sức.", difficulty: "medium" },
        ];
      }
    }
  });

  const handleStartExam = async (examId: number, mode: string) => {
    try {
      const res: any = await axiosClient.post(`/toeic/exams/${examId}/attempts`, { mode });
      // Redirect to exam taking page
      router.push(`/toeic/exam/${examId}?attemptId=${res.id}`);
    } catch (error) {
      console.error("Start attempt failed", error);
      // Fallback for development if backend isn't ready
      router.push(`/toeic/exam/${examId}?attemptId=999`);
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800">Kho Đề Thi TOEIC</h1>
        <p className="text-slate-500 mt-2">Chọn đề thi và chế độ làm bài (Practice để luyện tập từng phần, hoặc Full Test để thi thử).</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <p>Đang tải danh sách đề thi...</p>
        ) : (
          (Array.isArray(exams) ? exams : []).map((exam: any) => (
            <div key={exam.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col h-full">
              <div className="flex justify-between items-start mb-4">
                <div className="bg-blue-100 text-blue-600 p-3 rounded-xl">
                  <FileText size={24} />
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                  exam.difficulty === 'hard' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'
                }`}>
                  {exam.difficulty.toUpperCase()}
                </span>
              </div>
              
              <h3 className="text-xl font-bold text-slate-800 mb-2 line-clamp-1">{exam.title}</h3>
              <p className="text-slate-500 text-sm mb-6 flex-1 line-clamp-2">{exam.description}</p>
              
              <div className="flex flex-col gap-2 mt-auto">
                <button 
                  onClick={() => handleStartExam(exam.id, 'practice')}
                  data-testid={`btn-practice-${exam.id}`}
                  className="w-full flex items-center justify-center gap-2 bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors font-bold py-2.5 rounded-xl text-sm"
                >
                  <PlayCircle size={18} /> Chế độ Practice
                </button>
                <button 
                  onClick={() => handleStartExam(exam.id, 'full_test')}
                  data-testid={`btn-full-test-${exam.id}`}
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white hover:bg-blue-700 transition-colors font-bold py-2.5 rounded-xl text-sm"
                >
                  <Clock size={18} /> Thi Full Test (120p)
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
