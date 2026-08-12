"use client";

import { useQuery } from "@tanstack/react-query";
import { Plus, Search, Edit2, Trash2, Loader2, BookOpen } from "lucide-react";
import { useState } from "react";
import { courseService } from "@/lib/api/services/course.service";

export default function AdminCoursesPage() {
  const [searchTerm, setSearchTerm] = useState("");

  const { data: courses, isLoading } = useQuery({
    queryKey: ["admin-courses"],
    queryFn: courseService.getAllCourses,
  });

  const filteredCourses = courses?.filter(c => 
    c.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Quản lý Khóa học</h1>
          <p className="text-slate-500 mt-1">Quản lý và tạo mới các khóa học trên hệ thống.</p>
        </div>
        <button className="bg-junior-blue text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-600 transition-colors shadow-sm">
          <Plus size={20} /> Thêm Khóa Học
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
            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-junior-blue focus:ring-1 focus:ring-junior-blue transition-all"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center p-12">
            <Loader2 className="animate-spin text-junior-blue" size={48} />
          </div>
        ) : filteredCourses && filteredCourses.length > 0 ? (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-sm border-b border-slate-200">
                <th className="p-4 font-bold">Tên Khóa Học</th>
                <th className="p-4 font-bold">Cấp độ</th>
                <th className="p-4 font-bold">Giá</th>
                <th className="p-4 font-bold">Số lớp</th>
                <th className="p-4 font-bold text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredCourses.map((course) => (
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
                  <td className="p-4">
                    <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-bold">
                      {course.level || "Tất cả"}
                    </span>
                  </td>
                  <td className="p-4 font-medium text-slate-700">
                    {course.price ? `${course.price.toLocaleString()}đ` : "Miễn phí"}
                  </td>
                  <td className="p-4 font-medium text-slate-700">
                    {course.classes?.length || 0} lớp
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button className="p-2 text-slate-400 hover:text-junior-blue bg-slate-50 hover:bg-sky-100 rounded-lg transition-colors">
                        <Edit2 size={18} />
                      </button>
                      <button className="p-2 text-slate-400 hover:text-red-500 bg-slate-50 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="p-12 text-center">
            <BookOpen size={48} className="mx-auto text-slate-300 mb-4" />
            <h3 className="text-lg font-bold text-slate-700">Chưa có khóa học nào</h3>
            <p className="text-slate-500 mt-1">Nhấn "Thêm Khóa Học" để bắt đầu tạo nội dung.</p>
          </div>
        )}
      </div>
    </div>
  );
}
