"use client";
import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useApiMutation } from "@/hooks/useApiMutation";
import { useApiQuery } from "@/hooks/useApiQuery";
import { User, Phone, MapPin, Target, Camera, Loader2, Save, Key } from "lucide-react";
import axiosClient from "@/lib/api/axiosClient";
import { useAuthStore } from "@/stores/authStore";

export default function ProfileSettings() {
  const queryClient = useQueryClient();
  const setProfile = useAuthStore((state) => state.setProfile);
  const user = useAuthStore((state) => state.user);
  
  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    address: "",
    targetScore: "",
    avatar: ""
  });
  
  const { data: profile, isLoading } = useApiQuery(
    ["userProfile"],
    "/users/profile",
    {
      select: (res: any) => res?.profile || {}
    }
  );

  useEffect(() => {
    if (profile) {
      setFormData({
        fullName: profile.fullName || "",
        phone: profile.phone || "",
        address: profile.address || "",
        targetScore: profile.targetScore || "",
        avatar: profile.avatar || ""
      });
    }
  }, [profile]);

  const updateProfileMutation = useApiMutation("/users/profile", "PATCH", {
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["userProfile"] });
      // updateProfile returns the profile object directly, not wrapped in { profile: ... }
      if (data) {
        setProfile(data);
      }
      toast.success("Cập nhật thông tin thành công!");
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate(formData);
  };

  if (isLoading) return (
    <div className="flex justify-center p-12">
      <Loader2 className="animate-spin text-blue-600" size={48} />
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800">Hồ sơ cá nhân</h1>
        <p className="text-slate-500 mt-1">Cập nhật thông tin để mọi người biết thêm về bạn</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Cột trái: Avatar & Summary */}
        <div className="md:col-span-1">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col items-center text-center">
            <div className="relative mb-4 group cursor-pointer">
              <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-lg bg-slate-100 flex items-center justify-center">
                {formData.avatar ? (
                  <img src={formData.avatar} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <User size={64} className="text-slate-300" />
                )}
              </div>
              <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white">
                <Camera size={24} />
                <span className="text-xs font-medium mt-1">Đổi ảnh</span>
              </div>
            </div>
            
            <h2 className="text-xl font-bold text-slate-800">{formData.fullName || "Tên của bạn"}</h2>
            <p className="text-slate-500 text-sm font-medium mt-1 uppercase">
              {useAuthStore.getState().user?.role || "Thành viên"}
            </p>
          </div>
        </div>

        {/* Cột phải: Form thông tin */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                <User size={20} className="text-blue-500" /> Thông tin cơ bản
              </h3>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Họ và tên</label>
                <input 
                  type="text" 
                  value={formData.fullName}
                  onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                  className="w-full border border-slate-300 rounded-lg px-4 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                  placeholder="Nhập họ và tên của bạn"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-1">
                    <Phone size={14} /> Số điện thoại
                  </label>
                  <input 
                    type="tel" 
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="w-full border border-slate-300 rounded-lg px-4 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                    placeholder="0912345678"
                  />
                </div>
                {user?.role === 'STUDENT' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-1">
                      <Target size={14} /> Mục tiêu (IELTS/TOEIC)
                    </label>
                    <input 
                      type="text" 
                      value={formData.targetScore}
                      onChange={(e) => setFormData({...formData, targetScore: e.target.value})}
                      className="w-full border border-slate-300 rounded-lg px-4 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                      placeholder="Vd: IELTS 7.0"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-1">
                  <MapPin size={14} /> Địa chỉ
                </label>
                <textarea 
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                  rows={2}
                  className="w-full border border-slate-300 rounded-lg px-4 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all resize-none"
                  placeholder="Nhập địa chỉ của bạn"
                />
              </div>

              <div className="pt-4 flex justify-end">
                <button 
                  type="submit"
                  disabled={updateProfileMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-colors shadow-sm shadow-blue-200 disabled:opacity-70"
                >
                  {updateProfileMutation.isPending ? (
                    <><Loader2 size={20} className="animate-spin" /> Đang lưu...</>
                  ) : (
                    <><Save size={20} /> Lưu thay đổi</>
                  )}
                </button>
              </div>
            </form>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
             <div className="p-6 border-b border-slate-100">
              <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                <Key size={20} className="text-slate-500" /> Bảo mật (Comming Soon)
              </h3>
            </div>
            <div className="p-6">
              <button 
                disabled
                className="w-full py-2.5 bg-slate-100 text-slate-400 font-medium rounded-xl flex justify-center items-center gap-2"
              >
                Đổi mật khẩu
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
