"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Search,
  Loader2,
  Mail,
  Calendar,
  Shield,
  UserPlus,
  Phone,
  User,
  Trash2,
  Edit2,
  BookOpen,
  X,
  Flame,
  AlertTriangle,
  Lock,
} from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import axiosClient from "@/lib/api/axiosClient";
import toast from "react-hot-toast";

type UserData = {
  id: number;
  email: string;
  role: "STUDENT" | "TEACHER" | "ADMIN";
  createdAt: string;
  lastLoginAt: string | null;
  loginCount: number;
  profile: { fullName: string; avatar: string | null; phone: string | null } | null;
  stats?: { totalBanhRan: number; streakCount: number } | null;
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

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UserData | null>(null);

  // Forms
  const [createForm, setCreateForm] = useState({
    fullName: "",
    email: "",
    password: "",
    role: "STUDENT",
    phone: "",
  });

  const [editForm, setEditForm] = useState({
    fullName: "",
    phone: "",
    role: "STUDENT" as "STUDENT" | "TEACHER" | "ADMIN",
    password: "",
  });

  // Query Users
  const { data: users, isLoading } = useQuery<UserData[]>({
    queryKey: ["admin-users", roleFilter],
    queryFn: async () => {
      const res: any = await axiosClient.get("/admin/users", {
        params: roleFilter ? { role: roleFilter } : undefined,
      });
      return Array.isArray(res) ? res : res?.data || [];
    },
  });

  // Create User Mutation
  const createMutation = useMutation({
    mutationFn: async (data: typeof createForm) => {
      return axiosClient.post("/admin/users", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setShowCreateModal(false);
      setCreateForm({ fullName: "", email: "", password: "", role: "STUDENT", phone: "" });
      toast.success("Tạo tài khoản thành công!");
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || "Lỗi! Email có thể đã tồn tại."),
  });

  // Update User Mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: typeof editForm }) => {
      const payload: any = {
        fullName: data.fullName,
        phone: data.phone,
        role: data.role,
      };
      if (data.password.trim()) {
        payload.password = data.password.trim();
      }
      return axiosClient.patch(`/admin/users/${id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setEditingUser(null);
      toast.success("Đã cập nhật thông tin người dùng!");
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || "Lỗi khi cập nhật tài khoản."),
  });

  // Delete User Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await axiosClient.delete(`/admin/users/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setDeleteTarget(null);
      toast.success("Đã xóa tài khoản thành công.");
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || "Không thể xóa tài khoản."),
  });

  const handleOpenEdit = (user: UserData) => {
    setEditingUser(user);
    setEditForm({
      fullName: user.profile?.fullName || "",
      phone: user.profile?.phone || "",
      role: user.role,
      password: "",
    });
  };

  const filteredUsers = users?.filter(
    (u) =>
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.profile?.fullName || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const roleBadge = (role: string) => {
    const map: Record<string, string> = {
      ADMIN: "bg-purple-100 text-purple-800 border-purple-300",
      TEACHER: "bg-amber-100 text-amber-800 border-amber-300",
      STUDENT: "bg-emerald-100 text-emerald-800 border-emerald-300",
    };
    const labels: Record<string, string> = {
      ADMIN: "Quản trị",
      TEACHER: "Giáo viên",
      STUDENT: "Học viên",
    };
    return (
      <span
        className={`px-3 py-1 rounded-full text-xs font-black border flex items-center gap-1 w-max ${
          map[role] || "bg-slate-100 text-slate-600 border-slate-200"
        }`}
      >
        <Shield size={12} /> {labels[role] || role}
      </span>
    );
  };

  const getActivityBadge = (lastLoginAt: string | null) => {
    if (!lastLoginAt) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-slate-100 text-slate-500 border border-slate-200">
          <span className="w-2 h-2 rounded-full bg-slate-400"></span>
          Chưa đăng nhập
        </span>
      );
    }

    const now = new Date().getTime();
    const loginTime = new Date(lastLoginAt).getTime();
    const diffHours = Math.floor((now - loginTime) / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 24) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          {diffHours < 1 ? "Vừa hoạt động" : `${diffHours} giờ trước`}
        </span>
      );
    } else if (diffDays <= 7) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
          <span className="w-2 h-2 rounded-full bg-amber-500"></span>
          {diffDays} ngày trước
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
          <span className="w-2 h-2 rounded-full bg-slate-400"></span>
          {new Date(lastLoginAt).toLocaleDateString("vi-VN")}
        </span>
      );
    }
  };

  return (
    <div className="max-w-7xl mx-auto pb-20 space-y-8">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-slate-800 tracking-tight">Quản lý Người dùng</h1>
          <p className="text-slate-400 font-bold text-sm mt-1">
            Danh sách tất cả tài khoản học viên, giáo viên và quản trị viên trong hệ thống
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3.5 rounded-2xl font-black flex items-center gap-2 shadow-[0_6px_0_0_#1d4ed8] active:translate-y-1 active:shadow-none transition-all cursor-pointer text-sm"
        >
          <UserPlus size={18} /> Thêm người dùng mới
        </button>
      </div>

      {/* FILTER BAR */}
      <div className="bg-white p-5 rounded-[2rem] border-4 border-slate-200 shadow-[0_8px_0_0_#e2e8f0] flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex-1 w-full relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Tìm kiếm theo tên hoặc email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold outline-none focus:border-blue-500 focus:bg-white text-slate-800 text-sm transition-all"
          />
        </div>
        <div className="flex gap-2 flex-wrap w-full md:w-auto">
          {ROLE_FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setRoleFilter(opt.value)}
              className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                roleFilter === opt.value
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* USERS TABLE */}
      <div className="bg-white rounded-[2.5rem] border-4 border-slate-200 shadow-[0_8px_0_0_#e2e8f0] overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center p-16">
            <Loader2 className="animate-spin text-blue-600" size={48} />
          </div>
        ) : filteredUsers && filteredUsers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-400 text-xs uppercase font-black tracking-wider border-b-2 border-slate-100">
                  <th className="py-4 px-6">Người dùng</th>
                  <th className="py-4 px-6">Vai trò</th>
                  <th className="py-4 px-6">Bánh Mì / Chuỗi</th>
                  <th className="py-4 px-6">SĐT</th>
                  <th className="py-4 px-6">Ngày tham gia</th>
                  <th className="py-4 px-6">Trạng thái hoạt động</th>
                  <th className="py-4 px-6 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-bold text-sm text-slate-700">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        {user.profile?.avatar ? (
                          <img
                            src={user.profile.avatar}
                            alt=""
                            className="w-10 h-10 rounded-2xl object-cover border border-slate-200"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-600 font-black flex items-center justify-center shrink-0">
                            <User size={20} />
                          </div>
                        )}
                        <div>
                          <p className="font-black text-slate-800 text-base">{user.profile?.fullName || "—"}</p>
                          <p className="text-xs text-slate-400 font-medium flex items-center gap-1">
                            <Mail size={12} /> {user.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">{roleBadge(user.role)}</td>
                    <td className="py-4 px-6">
                      {user.role === "STUDENT" ? (
                        <div className="flex items-center gap-2 text-xs">
                          <span className="font-black text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-xl">
                            🍞 {user.stats?.totalBanhRan ?? 0}
                          </span>
                          <span className="font-black text-orange-600 bg-orange-50 border border-orange-200 px-2.5 py-1 rounded-xl flex items-center gap-0.5">
                            <Flame size={12} /> {user.stats?.streakCount ?? 0}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-sm text-slate-600">
                      {user.profile?.phone ? (
                        <span className="flex items-center gap-1">
                          <Phone size={13} className="text-slate-400" /> {user.profile.phone}
                        </span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-xs text-slate-500 font-medium">
                      <span className="flex items-center gap-1">
                        <Calendar size={13} className="text-slate-400" />{" "}
                        {new Date(user.createdAt).toLocaleDateString("vi-VN")}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      {getActivityBadge(user.lastLoginAt)}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(user)}
                          title="Chỉnh sửa thông tin / phân quyền"
                          className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-all border border-blue-200 cursor-pointer"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(user)}
                          title="Xóa tài khoản"
                          className="p-2 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl transition-all border border-rose-200 cursor-pointer"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-16 text-center text-slate-400">
            <BookOpen size={40} className="text-slate-300 mx-auto mb-3" />
            <h3 className="text-lg font-black text-slate-700">Không tìm thấy người dùng</h3>
            <p className="text-sm mt-1">Thử thay đổi bộ lọc hoặc thêm người dùng mới.</p>
          </div>
        )}
      </div>

      {/* ================= MODAL: THÊM NGƯỜI DÙNG ================= */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[2.5rem] border-4 border-slate-200 shadow-2xl w-full max-w-md p-6 md:p-8 space-y-5"
            >
              <div className="flex items-center justify-between border-b-2 border-slate-100 pb-3">
                <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                  <UserPlus size={24} className="text-blue-500" /> Thêm Người Dùng
                </h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4 text-xs font-bold">
                <div>
                  <label className="block text-slate-600 mb-1">Họ và tên <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    placeholder="VD: Nguyễn Văn A"
                    value={createForm.fullName}
                    onChange={(e) => setCreateForm({ ...createForm, fullName: e.target.value })}
                    className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-blue-500 text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1">Email <span className="text-rose-500">*</span></label>
                  <input
                    type="email"
                    placeholder="email@example.com"
                    value={createForm.email}
                    onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                    className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-blue-500 text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1">Mật khẩu ban đầu <span className="text-rose-500">*</span></label>
                  <input
                    type="password"
                    placeholder="Ít nhất 6 ký tự"
                    value={createForm.password}
                    onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                    className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-blue-500 text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1">Số điện thoại</label>
                  <input
                    type="tel"
                    placeholder="0912345678"
                    value={createForm.phone}
                    onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                    className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-blue-500 text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1">Vai trò hệ thống</label>
                  <select
                    value={createForm.role}
                    onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
                    className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-blue-500 bg-white text-slate-800 font-bold"
                  >
                    <option value="STUDENT">Học viên</option>
                    <option value="TEACHER">Giáo viên</option>
                    <option value="ADMIN">Quản trị viên</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t-2 border-slate-100">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-2.5 rounded-xl font-black text-slate-500 hover:bg-slate-100 text-sm"
                >
                  Hủy
                </button>
                <button
                  onClick={() => createMutation.mutate(createForm)}
                  disabled={
                    createMutation.isPending ||
                    !createForm.email ||
                    !createForm.password ||
                    !createForm.fullName
                  }
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black flex items-center justify-center gap-2 transition-all shadow-md text-sm disabled:opacity-50"
                >
                  {createMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
                  Tạo tài khoản
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ================= MODAL: CHỈNH SỬA NGƯỜI DÙNG ================= */}
      <AnimatePresence>
        {editingUser && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[2.5rem] border-4 border-slate-200 shadow-2xl w-full max-w-md p-6 md:p-8 space-y-5"
            >
              <div className="flex items-center justify-between border-b-2 border-slate-100 pb-3">
                <div>
                  <span className="text-xs font-mono font-black text-slate-400">ID #{editingUser.id}</span>
                  <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2 mt-0.5">
                    <Edit2 size={22} className="text-blue-500" /> Sửa Người Dùng
                  </h2>
                </div>
                <button
                  onClick={() => setEditingUser(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4 text-xs font-bold">
                <div>
                  <label className="block text-slate-600 mb-1">Email (Không thể đổi)</label>
                  <input
                    type="email"
                    disabled
                    value={editingUser.email}
                    className="w-full bg-slate-100 border-2 border-slate-200 rounded-xl px-4 py-2.5 text-slate-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1">Họ và tên <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    value={editForm.fullName}
                    onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                    className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-blue-500 text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1">Số điện thoại</label>
                  <input
                    type="tel"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-blue-500 text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1">Vai trò</label>
                  <select
                    value={editForm.role}
                    onChange={(e) => setEditForm({ ...editForm, role: e.target.value as any })}
                    className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-blue-500 bg-white text-slate-800 font-bold"
                  >
                    <option value="STUDENT">Học viên</option>
                    <option value="TEACHER">Giáo viên</option>
                    <option value="ADMIN">Quản trị viên</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 mb-1">Đặt lại Mật khẩu mới (Để trống nếu không đổi)</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                      type="password"
                      placeholder="Nhập mật khẩu mới..."
                      value={editForm.password}
                      onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                      className="w-full pl-10 pr-4 py-2.5 border-2 border-slate-200 rounded-xl outline-none focus:border-blue-500 text-slate-800"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t-2 border-slate-100">
                <button
                  onClick={() => setEditingUser(null)}
                  className="flex-1 py-2.5 rounded-xl font-black text-slate-500 hover:bg-slate-100 text-sm"
                >
                  Hủy
                </button>
                <button
                  onClick={() => updateMutation.mutate({ id: editingUser.id, data: editForm })}
                  disabled={updateMutation.isPending || !editForm.fullName.trim()}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black flex items-center justify-center gap-2 transition-all shadow-md text-sm disabled:opacity-50"
                >
                  {updateMutation.isPending && <Loader2 size={16} className="animate-spin" />}
                  Lưu thay đổi
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ================= MODAL: XÁC NHẬN XÓA ================= */}
      <AnimatePresence>
        {deleteTarget && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[2.5rem] border-4 border-rose-200 shadow-2xl p-6 md:p-8 max-w-md w-full space-y-5 text-center"
            >
              <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-3xl flex items-center justify-center mx-auto">
                <AlertTriangle size={32} />
              </div>

              <div>
                <h3 className="text-2xl font-black text-slate-800">Xóa Tài Khoản?</h3>
                <p className="text-slate-500 text-sm font-bold mt-2">
                  Bạn có chắc chắn muốn xóa tài khoản{" "}
                  <span className="text-rose-600 font-black">
                    "{deleteTarget.profile?.fullName || deleteTarget.email}"
                  </span>{" "}
                  ({deleteTarget.email})? Toàn bộ tiến trình và dữ liệu sẽ bị xóa hoàn toàn.
                </p>
              </div>

              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteTarget(null)}
                  className="px-5 py-2.5 rounded-xl font-black text-slate-500 hover:bg-slate-100 text-sm"
                >
                  Không, giữ lại
                </button>
                <button
                  type="button"
                  disabled={deleteMutation.isPending}
                  onClick={() => deleteMutation.mutate(deleteTarget.id)}
                  className="px-6 py-2.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-black shadow-md flex items-center gap-2 text-sm disabled:opacity-50"
                >
                  {deleteMutation.isPending && <Loader2 size={16} className="animate-spin" />}
                  Đồng ý xóa
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
