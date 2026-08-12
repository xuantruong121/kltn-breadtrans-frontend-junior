"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, Loader2, CheckCircle, XCircle, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { useState } from "react";
import { courseService } from "@/lib/api/services/course.service";
import axiosClient from "@/lib/api/axiosClient";

export default function AdminCoursesPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("PUBLISHED"); // "PENDING_REVIEW", "PUBLISHED", "REJECTED"
  const queryClient = useQueryClient();

  const { data: courses, isLoading } = useQuery({
    queryKey: ["admin-courses"],
    queryFn: courseService.getAllCourses,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number, status: string }) => {
      const response = await axiosClient.post(`/courses/${id}/status`, { status });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-courses"] });
    }
  });

  const deleteCourseMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await axiosClient.delete(`/courses/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-courses"] });
      toast.success("Xóa khóa học thành công!");
    }
  });

  const filteredCourses = courses?.filter(c => 
    c.title.toLowerCase().includes(searchTerm.toLowerCase()) && 
    (c.status === activeTab || (activeTab === "PUBLISHED" && !c.status) || (activeTab === "PENDING_REVIEW" && c.status === "DRAFT"))
  );

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Quản lý Khóa học</h1>
          <p className="text-slate-500 mt-1">Duyệt và quản lý các khóa học trên hệ thống.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b border-slate-200">
        <button 
          onClick={() => setActiveTab("PUBLISHED")}
          className={`pb-3 px-4 font-medium text-sm transition-colors relative ${activeTab === 'PUBLISHED' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Đang hoạt động
          {activeTab === 'PUBLISHED' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 rounded-t-full"></div>}
        </button>
        <button 
          onClick={() => setActiveTab("PENDING_REVIEW")}
          className={`pb-3 px-4 font-medium text-sm transition-colors relative flex items-center gap-2 ${activeTab === 'PENDING_REVIEW' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Chờ duyệt
          {courses && courses.filter((c: any) => c.status === "PENDING_REVIEW" || c.status === "DRAFT").length > 0 && (
            <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
              {courses.filter((c: any) => c.status === "PENDING_REVIEW" || c.status === "DRAFT").length}
            </span>
          )}
          {activeTab === 'PENDING_REVIEW' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 rounded-t-full"></div>}
        </button>
        <button 
          onClick={() => setActiveTab("REJECTED")}
          className={`pb-3 px-4 font-medium text-sm transition-colors relative ${activeTab === 'REJECTED' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Đã từ chối
          {activeTab === 'REJECTED' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 rounded-t-full"></div>}
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 mb-6 flex gap-4 items-center">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text" 
            placeholder="Tìm kiếm khóa học..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center p-12">
            <Loader2 className="animate-spin text-blue-600" size={48} />
          </div>
        ) : filteredCourses && filteredCourses.length > 0 ? (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-sm border-b border-slate-200">
                <th className="p-4 font-bold">Tên Khóa Học</th>
                <th className="p-4 font-bold">Giáo viên</th>
                <th className="p-4 font-bold">Trạng thái</th>
                <th className="p-4 font-bold text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredCourses.map((course: any) => (
                <tr key={course.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg bg-sky-100 overflow-hidden flex-shrink-0">
                        {course.thumbnailUrl ? (
                          <img src={course.thumbnailUrl} alt={course.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-slate-200"></div>
                        )}
                      </div>
                      <div>
                        <p className="font-bold text-slate-800 line-clamp-1">{course.title}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 font-medium text-slate-700">
                    {course.teacher?.profile?.fullName || course.teacher?.email || "Chưa gán"}
                  </td>
                  <td className="p-4">
                    {course.status === "PENDING_REVIEW" && (
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs font-bold">Chờ duyệt</span>
                    )}
                    {course.status === "PUBLISHED" && (
                      <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-bold">Đang hoạt động</span>
                    )}
                    {course.status === "REJECTED" && (
                      <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-bold">Bị từ chối</span>
                    )}
                    {!course.status && (
                      <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs font-bold">Bản nháp</span>
                    )}
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {(course.status === "PENDING_REVIEW" || course.status === "DRAFT") && (
                        <>
                          <button 
                            onClick={() => updateStatusMutation.mutate({ id: course.id, status: 'PUBLISHED' })}
                            className="px-3 py-1.5 text-green-700 bg-green-50 hover:bg-green-100 font-medium rounded-lg transition-colors flex items-center gap-1"
                            disabled={updateStatusMutation.isPending}
                          >
                            <CheckCircle size={16} /> Duyệt
                          </button>
                          <button 
                            onClick={() => updateStatusMutation.mutate({ id: course.id, status: 'REJECTED' })}
                            className="px-3 py-1.5 text-orange-700 bg-orange-50 hover:bg-orange-100 font-medium rounded-lg transition-colors flex items-center gap-1"
                            disabled={updateStatusMutation.isPending}
                          >
                            <XCircle size={16} /> Từ chối
                          </button>
                        </>
                      )}
                      
                      <button 
                        onClick={() => {
                          toast((t) => (
                            <div className="flex flex-col gap-3">
                              <p className="font-medium text-slate-800">Bạn có chắc chắn muốn xóa khóa học này?</p>
                              <div className="flex gap-2 justify-end mt-2">
                                <button className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors" onClick={() => toast.dismiss(t.id)}>Hủy</button>
                                <button className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors" onClick={() => { deleteCourseMutation.mutate(course.id); toast.dismiss(t.id); }}>Xóa</button>
                              </div>
                            </div>
                          ), { duration: Infinity });
                        }}
                        className="px-3 py-1.5 text-red-700 bg-red-50 hover:bg-red-100 font-medium rounded-lg transition-colors flex items-center gap-1"
                        disabled={deleteCourseMutation.isPending}
                      >
                        <Trash2 size={16} /> Xóa
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="p-12 text-center text-slate-500">
            Không tìm thấy khóa học nào.
          </div>
        )}
      </div>
    </div>
  );
}
