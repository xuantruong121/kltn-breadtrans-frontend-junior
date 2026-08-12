"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { FileText, Plus, X, Search, MoreVertical, Edit, Upload } from "lucide-react";
import { useSocket } from "@/lib/providers/SocketProvider";
import { useEffect } from "react";
import { useApiQuery } from "@/hooks/useApiQuery";
import { useApiMutation } from "@/hooks/useApiMutation";
import axiosClient from "@/lib/api/axiosClient";

export default function TeacherCoursesPage() {
  const queryClient = useQueryClient();
  const { socket } = useSocket();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newCourse, setNewCourse] = useState({ title: "", description: "", price: 0 });

  // Query courses created by this teacher
  const { data: courses, isLoading } = useApiQuery(
    ["teacherCourses"],
    "/courses/my-courses"
  );

  useEffect(() => {
    if (!socket) return;
    
    socket.on("courseUpdated", () => {
      // Refresh list immediately when backend broadcasts an update
      queryClient.invalidateQueries({ queryKey: ["teacherCourses"] });
    });

    return () => {
      socket.off("courseUpdated");
    };
  }, [socket, queryClient]);

  // Create course mutation
  const createCourseMutation = useApiMutation("/courses", "POST", {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teacherCourses"] });
      setIsModalOpen(false);
      setNewCourse({ title: "", description: "", price: 0 });
    },
  });

  const handleCreateCourse = (e: React.FormEvent) => {
    e.preventDefault();
    createCourseMutation.mutate(newCourse);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PUBLISHED":
        return <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">Đã xuất bản</span>;
      case "PENDING_REVIEW":
        return <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs font-medium">Chờ duyệt</span>;
      case "REJECTED":
        return <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium">Bị từ chối</span>;
      default:
        return <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs font-medium">Bản nháp</span>;
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 relative">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-8 py-5 flex items-center justify-between sticky top-0 z-10">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Quản lý Khóa học</h1>
          <p className="text-slate-500 text-sm mt-1">Soạn giáo trình, tạo khóa học mới để chờ duyệt</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-medium transition-colors shadow-sm shadow-blue-200"
        >
          <Plus size={18} />
          Tạo Khóa học mới
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-6xl mx-auto">
          {/* Controls */}
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Tìm kiếm khóa học..." 
                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Course Grid */}
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : courses && courses.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {courses.map((course: any) => (
                <div key={course.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-lg transition-shadow group">
                  <div className="h-40 bg-slate-100 relative group-hover:bg-slate-200 transition-colors flex items-center justify-center">
                    {course.thumbnail ? (
                      <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover" />
                    ) : (
                      <FileText size={48} className="text-slate-300" />
                    )}
                    <div className="absolute top-3 right-3">
                      {getStatusBadge(course.status)}
                    </div>
                  </div>
                  <div className="p-5">
                    <h3 className="font-bold text-slate-800 text-lg mb-1 truncate">{course.title}</h3>
                    <p className="text-slate-500 text-sm mb-4 line-clamp-2">{course.description || "Chưa có mô tả"}</p>
                    
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
                      <div className="text-sm font-medium text-slate-700">
                        {course.price === 0 ? "Miễn phí" : `${course.price.toLocaleString()} VNĐ`}
                      </div>
                      <div className="flex gap-2">
                        <button className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                          <Edit size={18} />
                        </button>
                        <button className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
                          <MoreVertical size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center flex flex-col items-center">
              <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                <FileText size={28} className="text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">Chưa có khóa học nào</h3>
              <p className="text-slate-500 max-w-sm mb-6">Bạn chưa tạo khóa học nào. Hãy bắt đầu bằng cách tạo khóa học đầu tiên của mình.</p>
              <button 
                onClick={() => setIsModalOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-medium transition-colors"
              >
                Tạo Khóa học
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Modal Tạo Khóa Học */}
      {isModalOpen && (
        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="font-bold text-lg text-slate-800">Tạo Khóa Học Mới</h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleCreateCourse} className="p-5 flex flex-col gap-4 overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tên khóa học <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  value={newCourse.title}
                  onChange={(e) => setNewCourse({...newCourse, title: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="VD: Tiếng Anh Giao Tiếp Cơ Bản"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Mô tả khóa học</label>
                <textarea 
                  value={newCourse.description}
                  onChange={(e) => setNewCourse({...newCourse, description: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px]"
                  placeholder="Giới thiệu về nội dung khóa học..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Giá (VNĐ)</label>
                <input 
                  type="number" 
                  value={newCourse.price}
                  onChange={(e) => setNewCourse({...newCourse, price: Number(e.target.value)})}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="0"
                  step="1000"
                />
              </div>

              <div className="pt-2 flex justify-end gap-3 mt-4 border-t border-slate-100">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-medium transition-colors"
                >
                  Hủy
                </button>
                <button 
                  type="submit"
                  disabled={createCourseMutation.isPending || !newCourse.title}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 text-white rounded-xl font-medium transition-colors flex items-center gap-2"
                >
                  {createCourseMutation.isPending ? "Đang lưu..." : "Lưu bản nháp"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
