"use client";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useApiMutation } from "@/hooks/useApiMutation";
import { useApiQuery } from "@/hooks/useApiQuery";
import { User, Phone, MapPin, Target, Loader2, Save, Key, Sparkles, ShoppingBag } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { useGamificationStore } from "@/stores/gamificationStore";
import { UserAvatarWithFrame } from "@/components/ui";
import { MARKET_ITEMS } from "@/modules/market/services/marketData";
import Link from "next/link";

import PushNotificationToggle from "@/components/pwa/PushNotificationToggle";

export default function ProfileSettings() {
  const user = useAuthStore((state) => state.user);

  const { data: profile, isLoading } = useApiQuery(
    ["userProfile", user?.id],
    "/users/profile",
    {
      select: (res: any) => res?.profile || {},
      enabled: !!user?.id,
    }
  );

  if (isLoading) return (
    <div className="flex justify-center p-12">
      <Loader2 className="animate-spin text-blue-600" size={48} />
    </div>
  );

  return (
    <ProfileSettingsForm
      key={user?.id || (profile as any)?.id || "profile-settings-form"}
      profile={profile || {}}
    />
  );
}

function ProfileSettingsForm({ profile }: { profile: any }) {
  const queryClient = useQueryClient();
  const setProfile = useAuthStore((state) => state.setProfile);
  const user = useAuthStore((state) => state.user);

  const {
    unlockedItems,
    equippedAvatarFrame,
    equippedBadge,
    equipAvatarFrame,
    equipBadge,
  } = useGamificationStore();
  
  const [formData, setFormData] = useState({
    fullName: profile?.fullName || user?.profile?.fullName || "",
    phone: profile?.phone || user?.profile?.phone || "",
    address: profile?.address || user?.profile?.address || "",
    targetScore: profile?.targetScore || user?.profile?.targetScore || "",
    avatar: profile?.avatar || user?.profile?.avatar || ""
  });

  const updateProfileMutation = useApiMutation("/users/profile", "PATCH", {
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["userProfile"] });
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

  const myUnlockedList = MARKET_ITEMS.filter((item) => unlockedItems.includes(item.id));
  const activeBadgeItem = MARKET_ITEMS.find((i) => i.id === equippedBadge);

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="mb-4">
        <h1 className="text-3xl font-black text-slate-800">Hồ sơ cá nhân</h1>
        <p className="text-slate-500 mt-1 font-medium">Cập nhật thông tin & quản lý trang bị danh hiệu của bạn</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Cột trái: Avatar & Summary & Inventory */}
        <div className="md:col-span-1 space-y-6">
          <div className="bg-white rounded-3xl shadow-sm border-2 border-slate-200 p-6 flex flex-col items-center text-center relative overflow-hidden">
            <div className="relative mb-4 mt-2">
              <UserAvatarWithFrame
                avatarUrl={formData.avatar}
                name={formData.fullName || user?.email}
                size="xl"
                showBadge={true}
              />
            </div>
            
            <div className="flex items-center justify-center gap-1.5 flex-wrap">
              <h2 className="text-xl font-black text-slate-800">{formData.fullName || "Tên của bạn"}</h2>
              {activeBadgeItem && (
                <span className="text-lg" title={activeBadgeItem.name}>{activeBadgeItem.icon}</span>
              )}
            </div>
            
            <p className="text-slate-400 text-xs font-black mt-1 uppercase tracking-wider">
              {useAuthStore.getState().user?.role || "Thành viên"}
            </p>

            {activeBadgeItem && (
              <div className="mt-3 px-3 py-1 bg-amber-50 border border-amber-200 rounded-full text-amber-700 text-xs font-bold flex items-center gap-1">
                <span>{activeBadgeItem.icon}</span> {activeBadgeItem.name}
              </div>
            )}
          </div>

          {/* Kho Trang Bị Đã Mua */}
          <div className="bg-white rounded-3xl shadow-sm border-2 border-slate-200 p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-sm text-slate-800 flex items-center gap-2">
                <Sparkles size={16} className="text-amber-500" /> Túi Đồ & Trang Bị
              </h3>
              <span className="text-[11px] font-black text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                {myUnlockedList.length} món
              </span>
            </div>

            {myUnlockedList.length === 0 ? (
              <div className="text-center py-6 text-slate-400 space-y-2">
                <p className="text-xs font-bold">Chưa sở hữu vật phẩm nào</p>
                <Link
                  href="/market"
                  className="inline-flex items-center gap-1.5 text-xs font-black text-amber-600 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-xl transition-all"
                >
                  <ShoppingBag size={13} /> Khám phá Cửa Hàng
                </Link>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[320px] overflow-y-auto pr-1">
                {myUnlockedList.map((item) => {
                  const isFrame = item.category === "avatar";
                  const isBadge = item.category === "badge";
                  const isEquipped =
                    (isFrame && equippedAvatarFrame === item.id) ||
                    (isBadge && equippedBadge === item.id);

                  return (
                    <div
                      key={item.id}
                      className={`p-3 rounded-2xl border-2 transition-all flex items-center justify-between gap-2 ${
                        isEquipped
                          ? "bg-amber-50/80 border-amber-300 shadow-xs"
                          : "bg-slate-50 border-slate-200"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 overflow-hidden">
                        <span className="text-2xl shrink-0">{item.icon}</span>
                        <div className="overflow-hidden">
                          <p className="text-xs font-black text-slate-800 truncate">{item.name}</p>
                          <span className="text-[10px] font-bold text-slate-400 uppercase">
                            {item.category === "avatar" ? "Khung Avatar" : item.category === "badge" ? "Huy hiệu" : "Vật phẩm"}
                          </span>
                        </div>
                      </div>

                      {isFrame && (
                        <button
                          onClick={() => {
                            if (isEquipped) {
                              equipAvatarFrame(null);
                              toast("Đã tháo khung avatar");
                            } else {
                              equipAvatarFrame(item.id);
                              toast.success(`Đã trang bị "${item.name}"!`);
                            }
                          }}
                          className={`text-[11px] font-black px-2.5 py-1 rounded-xl transition-all shrink-0 cursor-pointer ${
                            isEquipped
                              ? "bg-amber-500 text-white shadow-xs"
                              : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                          }`}
                        >
                          {isEquipped ? "Đang đeo ✓" : "Trang bị"}
                        </button>
                      )}

                      {isBadge && (
                        <button
                          onClick={() => {
                            if (isEquipped) {
                              equipBadge(null);
                              toast("Đã tháo huy hiệu");
                            } else {
                              equipBadge(item.id);
                              toast.success(`Đã trang bị "${item.name}"!`);
                            }
                          }}
                          className={`text-[11px] font-black px-2.5 py-1 rounded-xl transition-all shrink-0 cursor-pointer ${
                            isEquipped
                              ? "bg-amber-500 text-white shadow-xs"
                              : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                          }`}
                        >
                          {isEquipped ? "Đang đeo ✓" : "Trang bị"}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Cột phải: Form thông tin */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl shadow-sm border-2 border-slate-200 overflow-hidden">
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

          <PushNotificationToggle />

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
