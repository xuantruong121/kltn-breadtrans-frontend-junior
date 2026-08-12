"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Search, Loader2, Mail, Calendar, Shield, UserPlus,
  Phone, User, Trash2, BookOpen
} from "lucide-react";
import { useState } from "react";
import axiosClient from "@/lib/api/axiosClient";
import toast from "react-hot-toast";

type UserData = {
  id: number;
  email: string;
  role: string;
  createdAt: string;
  lastLoginAt: string | null;
  loginCount: number;
  profile: { fullName: string; avatar: string | null; phone: string | null } | null;
};

const ROLE_FILTER_OPTIONS = [
  { label: "Tất cả", value: "" },
  { label: "Học viên", value: "STUDENT" },
  { label: "Giáo viên", value: "TEACHER" },
  { label: "Quản trị", value: "ADMIN" },
];

export default function AdminUsersPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [form, setForm] = useState({
    fullName: "", email: "", password: "", role: "STUDENT", phone: ""
  });

  const { data: users, isLoading } = useQuery<UserData[]>({
    queryKey: ["admin-users", roleFilter],
    queryFn: async () => {
      const res = await axiosClient.get("/admin/users", {
        params: roleFilter ? { role: roleFilter } : undefined,
      });
      return res.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const res = await axiosClient.post("/admin/users", data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setShowCreateModal(false);
      setForm({ fullName: "", email: "", password: "", role: "STUDENT", phone: "" });
      toast.success("Tạo tài khoản thành công!");
    },
    onError: () => toast.error("Lỗi! Email có thể đã tồn tại."),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await axiosClient.delete(`/admin/users/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("Đã xóa tài khoản.");
    },
  });

  const filteredUsers = users?.filter((u) =>
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.profile?.fullName || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const roleBadge = (role: string) => {
    const map: Record<string, string> = {
      ADMIN: "bg-purple-100 text-purple-700",
      TEACHER: "bg-orange-100 text-orange-700",
      STUDENT: "bg-green-100 text-green-700",
    };
    const labels: Record<string, string> = {
      ADMIN: "Quản trị", TEACHER: "Giáo viên", STUDENT: "Học viên"
    };
    return (
      <span className={`px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1 w-max ${map[role] || "bg-slate-100 text-slate-600"}`}>
        <Shield size={11} /> {labels[role] || role}
      </span>
    );
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Quản lý Người dùng</h1>
          <p className="text-slate-500 mt-1">Danh sách tất cả tài khoản trong hệ thống.</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-colors shadow-sm"
        >
          <UserPlus size={18} /> Thêm người dùng
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 mb-6 flex gap-4 items-center flex-wrap">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Tìm kiếm tên hoặc email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-blue-500 transition-all text-sm"
          />
        </div>
        <div className="flex gap-2">
          {ROLE_FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setRoleFilter(opt.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                roleFilter === opt.value
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center p-12">
            <Loader2 className="animate-spin text-blue-600" size={40} />
          </div>
        ) : filteredUsers && filteredUsers.length > 0 ? (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-sm border-b border-slate-200">
                <th className="p-4 font-semibold">Người dùng</th>
                <th className="p-4 font-semibold">Vai trò</th>
                <th className="p-4 font-semibold">SĐT</th>
                <th className="p-4 font-semibold">Ngày tham gia</th>
                <th className="p-4 font-semibold">Đăng nhập cuối</th>
                <th className="p-4 font-semibold text-center">Lần đăng nhập</th>
                <th className="p-4 font-semibold text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      {user.profile?.avatar ? (
                        <img src={user.profile.avatar} alt="" className="w-10 h-10 rounded-full object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-500 flex items-center justify-center flex-shrink-0">
                          <User size={18} />
                        </div>
                      )}
                      <div>
                        <p className="font-semibold text-slate-800 text-sm">{user.profile?.fullName || "—"}</p>
                        <p className="text-xs text-slate-400 flex items-center gap-1"><Mail size={11} /> {user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">{roleBadge(user.role)}</td>
                  <td className="p-4 text-sm text-slate-500">
                    {user.profile?.phone ? (
                      <span className="flex items-center gap-1"><Phone size={13} /> {user.profile.phone}</span>
                    ) : "—"}
                  </td>
                  <td className="p-4 text-sm text-slate-500 flex items-center gap-1">
                    <Calendar size={13} /> {new Date(user.createdAt).toLocaleDateString("vi-VN")}
                  </td>
                  <td className="p-4 text-sm text-slate-500">
                    {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString("vi-VN") : "Chưa đăng nhập"}
                  </td>
                  <td className="p-4 text-center">
                    <span className="text-sm font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded-lg">
                      {user.loginCount}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <button
                      onClick={() => {
                        if (confirm(`Xóa tài khoản ${user.email}?`)) deleteMutation.mutate(user.id);
                      }}
                      className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="p-16 text-center">
            <BookOpen size={40} className="text-slate-300 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-slate-700">Không tìm thấy người dùng</h3>
            <p className="text-slate-400 text-sm mt-1">Thử thay đổi bộ lọc hoặc thêm người dùng mới.</p>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold text-slate-800 mb-5 flex items-center gap-2">
              <UserPlus size={22} className="text-blue-500" /> Thêm người dùng mới
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Họ và tên *</label>
                <input
                  type="text" placeholder="Nguyễn Văn A"
                  value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
                <input
                  type="email" placeholder="email@example.com"
                  value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Mật khẩu *</label>
                <input
                  type="password" placeholder="Ít nhất 6 ký tự"
                  value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Số điện thoại</label>
                <input
                  type="tel" placeholder="0912345678"
                  value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Vai trò *</label>
                <select
                  value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-blue-500 bg-white"
                >
                  <option value="STUDENT">Học viên</option>
                  <option value="TEACHER">Giáo viên</option>
                  <option value="ADMIN">Quản trị viên</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 py-2.5 border border-slate-200 rounded-xl font-medium text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={() => createMutation.mutate(form)}
                disabled={createMutation.isPending || !form.email || !form.password || !form.fullName}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
              >
                {createMutation.isPending ? <Loader2 size={18} className="animate-spin" /> : <UserPlus size={18} />}
                Tạo tài khoản
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
