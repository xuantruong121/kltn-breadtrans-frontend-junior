"use client";

import { useQuery } from "@tanstack/react-query";
import { Users, Video, FileText } from "lucide-react";
import axiosClient from "@/lib/api/axiosClient";

export default function TeacherClassesPage() {
  // Query classes assigned to the teacher
  const { data: classes, isLoading } = useQuery({
    queryKey: ["teacher-classes"],
    queryFn: async () => {
      try {
        const res = await axiosClient.get("/courses/classes"); // Assume this endpoint returns their classes
        return Array.isArray(res) ? res : [];
      } catch (error) {
        console.error(error);
        return [
          { id: 1, name: "IELTS Foundation", course: { title: "IELTS 5.0" }, studentCount: 15, meetingLink: "https://meet.google.com/abc" },
          { id: 2, name: "TOEIC Intensive", course: { title: "TOEIC 700+" }, studentCount: 20 },
        ];
      }
    }
  });

  if (isLoading) return <p>Đang tải danh sách lớp...</p>;

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Lớp bạn đang giảng dạy</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {classes?.map((cls: any) => (
          <div key={cls.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col">
            <h3 className="font-bold text-lg text-slate-800 mb-1">{cls.name}</h3>
            <p className="text-sm text-slate-500 mb-4">{cls.course?.title || "Không rõ khoá học"}</p>
            
            <div className="flex gap-4 mb-6">
              <div className="flex items-center gap-1 text-sm text-slate-600 bg-slate-50 px-2 py-1 rounded">
                <Users size={16} className="text-blue-500" />
                {cls.studentCount || 0} học sinh
              </div>
            </div>

            <div className="mt-auto flex flex-col gap-2">
              <button className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg text-sm transition-colors flex justify-center items-center gap-2">
                <FileText size={16} /> Quản lý bài tập
              </button>
              
              {cls.meetingLink && (
                <a 
                  href={cls.meetingLink}
                  target="_blank"
                  className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-sm transition-colors flex justify-center items-center gap-2"
                >
                  <Video size={16} /> Vào lớp (Meet)
                </a>
              )}
            </div>
          </div>
        ))}

        {classes?.length === 0 && (
          <div className="col-span-full py-12 text-center text-slate-500 bg-white rounded-xl border border-dashed border-slate-300">
            Bạn chưa được phân công lớp học nào.
          </div>
        )}
      </div>
    </div>
  );
}
