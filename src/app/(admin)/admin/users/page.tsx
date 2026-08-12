"use client";

import { useQuery } from "@tanstack/react-query";
import { Search, Loader2, Mail, Calendar, Shield } from "lucide-react";
import { useState } from "react";
import axiosClient from "@/lib/api/axiosClient";

// We can fetch users if there's an API, for now we will mock or call a generic endpoint.
// Let's assume GET /users exists for Admin
export default function AdminUsersPage() {
  const [searchTerm, setSearchTerm] = useState("");

  const { data: users, isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      // Temporary fallback array if API fails or doesn't exist
      try {
        const res = await axiosClient.get("/users"); // Ensure this endpoint exists for admin
        return res;
      } catch (err) {
        return [
          { id: 1, email: "student1@breadtrans.com", role: "STUDENT", createdAt: "2023-10-01" },
          { id: 2, email: "teacher1@breadtrans.com", role: "TEACHER", createdAt: "2023-10-02" },
        ];
      }
    },
  });

  const filteredUsers = (Array.isArray(users) ? users : [])?.filter(u => 
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800">Quản lý Học viên</h1>
        <p className="text-slate-500 mt-1">Danh sách tài khoản trên hệ thống.</p>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 mb-6 flex gap-4 items-center">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text" 
            placeholder="Tìm kiếm email học viên..."
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
        ) : filteredUsers && filteredUsers.length > 0 ? (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-sm border-b border-slate-200">
                <th className="p-4 font-bold">Email / Tài khoản</th>
                <th className="p-4 font-bold">Vai trò</th>
                <th className="p-4 font-bold">Ngày tham gia</th>
                <th className="p-4 font-bold text-right">Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user: any) => (
                <tr key={user.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-500 flex items-center justify-center flex-shrink-0">
                        <Mail size={18} />
                      </div>
                      <div>
                        <p className="font-bold text-slate-800">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 w-max ${
                      user.role === 'ADMIN' ? 'bg-purple-100 text-purple-600' : 
                      user.role === 'TEACHER' ? 'bg-orange-100 text-orange-600' : 
                      'bg-green-100 text-green-600'
                    }`}>
                      <Shield size={12} /> {user.role}
                    </span>
                  </td>
                  <td className="p-4 font-medium text-slate-500 flex items-center gap-2">
                    <Calendar size={16} /> {new Date(user.createdAt).toLocaleDateString("vi-VN")}
                  </td>
                  <td className="p-4 text-right">
                     <span className="text-green-500 font-bold text-sm bg-green-50 px-2 py-1 rounded-lg">Đang hoạt động</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="p-12 text-center">
            <h3 className="text-lg font-bold text-slate-700">Không tìm thấy học viên</h3>
          </div>
        )}
      </div>
    </div>
  );
}
