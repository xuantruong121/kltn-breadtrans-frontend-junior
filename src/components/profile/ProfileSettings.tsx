"use client";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useApiMutation } from "@/hooks/useApiMutation";
import { useApiQuery } from "@/hooks/useApiQuery";
import {
  User,
  Phone,
  MapPin,
  Target,
  Loader2,
  Save,
  Sparkles,
  ShoppingBag,
  Backpack,
  CheckCircle2,
  Crown,
  Medal,
  Zap,
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { useGamificationStore } from "@/stores/gamificationStore";
import { UserAvatarWithFrame } from "@/components/ui";
import { MARKET_ITEMS } from "@/modules/market/services/marketData";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

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

  if (isLoading)
    return (
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

  const [activeTab, setActiveTab] = useState<"profile" | "inventory">("profile");
  const [inventoryCategory, setInventoryCategory] = useState<"all" | "avatar" | "badge" | "boost">("all");

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
    avatar: profile?.avatar || user?.profile?.avatar || "",
  });

  const updateProfileMutation = useApiMutation("/users/profile", "PATCH", {
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["userProfile"] });
      if (data) {
        setProfile(data);
      }
      toast.success("Cập nhật thông tin thành công!");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate(formData);
  };

  const myUnlockedList = MARKET_ITEMS.filter((item) => unlockedItems.includes(item.id));
  const activeFrameItem = MARKET_ITEMS.find((i) => i.id === equippedAvatarFrame);
  const activeBadgeItem = MARKET_ITEMS.find((i) => i.id === equippedBadge);

  const filteredInventory = myUnlockedList.filter((item) => {
    if (inventoryCategory === "all") return true;
    return item.category === inventoryCategory;
  });

  const framesCount = myUnlockedList.filter((i) => i.category === "avatar").length;
  const badgesCount = myUnlockedList.filter((i) => i.category === "badge").length;
  const boostsCount = myUnlockedList.filter((i) => i.category === "boost").length;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header & Tabs Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-2 border-slate-100 pb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight">
            Hồ Sơ & Trang Bị Cá Nhân
          </h1>
          <p className="text-slate-500 text-sm font-medium mt-0.5">
            Quản lý thông tin tài khoản, danh hiệu và trang bị ngoại trang của bạn
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center bg-slate-100 p-1.5 rounded-2xl border border-slate-200 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab("profile")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer ${
              activeTab === "profile"
                ? "bg-white text-slate-800 shadow-sm border border-slate-200/80"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <User size={16} className={activeTab === "profile" ? "text-blue-500" : ""} />
            Thông Tin Cá Nhân
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("inventory")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold transition-all cursor-pointer ${
              activeTab === "inventory"
                ? "bg-white text-slate-800 shadow-sm border border-slate-200/80"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Backpack size={16} className={activeTab === "inventory" ? "text-amber-500" : ""} />
            Túi Đồ & Trang Bị
            <span className="text-[10px] font-black bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
              {myUnlockedList.length}
            </span>
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === "profile" ? (
          /* TAB 1: THÔNG TIN CÁ NHÂN */
          <motion.div
            key="tab-profile"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            {/* Cột trái: Identity Card */}
            <div className="md:col-span-1 space-y-6">
              <div className="bg-white rounded-3xl shadow-sm border-2 border-slate-200 p-6 flex flex-col items-center text-center relative overflow-hidden">
                <div className="relative mb-3 mt-2">
                  <UserAvatarWithFrame
                    avatarUrl={formData.avatar}
                    name={formData.fullName || user?.email}
                    size="xl"
                    showBadge={true}
                  />
                </div>

                <h2 className="text-xl font-black text-slate-800 mt-1">
                  {formData.fullName || "Tên của bạn"}
                </h2>

                <p className="text-slate-400 text-xs font-black mt-0.5 uppercase tracking-wider">
                  {user?.role === "STUDENT" ? "Học Sinh" : user?.role || "Thành viên"}
                </p>

                {activeBadgeItem ? (
                  <div className="mt-3 px-3 py-1 bg-amber-50 border border-amber-200 rounded-full text-amber-800 text-xs font-bold flex items-center gap-1.5 shadow-xs">
                    <span>{activeBadgeItem.icon}</span> {activeBadgeItem.name}
                  </div>
                ) : (
                  <div className="mt-3 px-3 py-1 bg-slate-50 border border-slate-200 rounded-full text-slate-400 text-xs font-medium">
                    Chưa đeo danh hiệu nào
                  </div>
                )}

                {/* Short cut to Inventory Tab */}
                <div className="w-full mt-6 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setActiveTab("inventory")}
                    className="w-full py-2.5 px-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-2xl font-black text-xs flex items-center justify-center gap-2 shadow-md shadow-amber-500/20 transition-all cursor-pointer"
                  >
                    <ShoppingBag size={15} /> Quản Lý Túi Đồ ({myUnlockedList.length} món)
                  </button>
                </div>
              </div>
            </div>

            {/* Cột phải: Form thông tin */}
            <div className="md:col-span-2 space-y-6">
              <div className="bg-white rounded-3xl shadow-sm border-2 border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="font-extrabold text-base text-slate-800 flex items-center gap-2">
                    <User size={18} className="text-blue-500" /> Thông tin tài khoản
                  </h3>
                  <span className="text-xs font-bold text-slate-400">
                    Email: <strong className="text-slate-600">{user?.email}</strong>
                  </span>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                  <div>
                    <label className="block text-xs font-extrabold text-slate-600 uppercase tracking-wider mb-1.5">
                      Họ và tên
                    </label>
                    <input
                      type="text"
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                      placeholder="Nhập họ và tên của bạn"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-extrabold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                        <Phone size={13} /> Số điện thoại
                      </label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                        placeholder="0912345678"
                      />
                    </div>
                    {user?.role === "STUDENT" && (
                      <div>
                        <label className="block text-xs font-extrabold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                          <Target size={13} /> Mục tiêu (IELTS/TOEIC)
                        </label>
                        <input
                          type="text"
                          value={formData.targetScore}
                          onChange={(e) => setFormData({ ...formData, targetScore: e.target.value })}
                          className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                          placeholder="Vd: TOEIC 750 / IELTS 6.5"
                        />
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-extrabold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                      <MapPin size={13} /> Địa chỉ
                    </label>
                    <textarea
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      rows={2}
                      className="w-full border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all resize-none"
                      placeholder="Nhập địa chỉ sinh sống của bạn"
                    />
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="submit"
                      disabled={updateProfileMutation.isPending}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-black text-sm flex items-center gap-2 transition-all shadow-md shadow-blue-500/20 cursor-pointer disabled:opacity-70"
                    >
                      {updateProfileMutation.isPending ? (
                        <>
                          <Loader2 size={16} className="animate-spin" /> Đang lưu...
                        </>
                      ) : (
                        <>
                          <Save size={16} /> Lưu Thay Đổi
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>

              {/* Push Notification Box */}
              <PushNotificationToggle />
            </div>
          </motion.div>
        ) : (
          /* TAB 2: TÚI ĐỒ & TRANG BỊ CHUYÊN BIỆT (SPACIOUS INVENTORY VIEW) */
          <motion.div
            key="tab-inventory"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            {/* 1. Phòng Thử Đồ & Gương Soi Nhân Vật (Clean Elegant Hero Card) */}
            <div className="bg-white rounded-3xl p-6 sm:p-7 border-2 border-slate-200 shadow-sm relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
                <div className="p-3 bg-slate-50 rounded-3xl border border-slate-200 shrink-0">
                  <UserAvatarWithFrame
                    avatarUrl={formData.avatar}
                    name={formData.fullName || user?.email}
                    size="xl"
                    showBadge={true}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-center sm:justify-start gap-2">
                    <h2 className="text-2xl font-black text-slate-800">
                      {formData.fullName || "Học viên BreadTrans"}
                    </h2>
                    <span className="text-[11px] font-black uppercase tracking-wider bg-slate-100 text-slate-500 px-2.5 py-0.5 rounded-md">
                      {user?.role === "STUDENT" ? "Học Sinh" : user?.role || "Thành viên"}
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 font-medium">
                    Xem trước diện mạo nhân vật và tùy chỉnh trang bị đang hiển thị trong lớp học.
                  </p>

                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                    <span className="text-xs px-3 py-1 rounded-full font-bold flex items-center gap-1.5 bg-amber-50 text-amber-800 border border-amber-200">
                      <Crown size={14} className="text-amber-600" />
                      {activeFrameItem ? activeFrameItem.name : "Chưa đeo Khung Avatar"}
                    </span>
                    <span className="text-xs px-3 py-1 rounded-full font-bold flex items-center gap-1.5 bg-indigo-50 text-indigo-800 border border-indigo-200">
                      <Medal size={14} className="text-indigo-600" />
                      {activeBadgeItem ? activeBadgeItem.name : "Chưa đeo Huy Hiệu"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="shrink-0">
                <Link
                  href="/market"
                  className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-black text-xs rounded-xl shadow-md shadow-amber-500/20 flex items-center gap-2 transition-all cursor-pointer"
                >
                  <ShoppingBag size={16} /> Đến Cửa Hàng Bánh Mì
                </Link>
              </div>
            </div>

            {/* 2. Bộ Lọc Danh Mục (Clean Pill Filter Bar) */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border-2 border-slate-200 shadow-xs">
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setInventoryCategory("all")}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                    inventoryCategory === "all"
                      ? "bg-slate-800 text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  Tất cả ({myUnlockedList.length})
                </button>
                <button
                  type="button"
                  onClick={() => setInventoryCategory("avatar")}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                    inventoryCategory === "avatar"
                      ? "bg-amber-500 text-white shadow-xs"
                      : "bg-amber-50 text-amber-800 hover:bg-amber-100"
                  }`}
                >
                  👑 Khung Avatar ({framesCount})
                </button>
                <button
                  type="button"
                  onClick={() => setInventoryCategory("badge")}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                    inventoryCategory === "badge"
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "bg-indigo-50 text-indigo-800 hover:bg-indigo-100"
                  }`}
                >
                  🏅 Huy Hiệu ({badgesCount})
                </button>
                <button
                  type="button"
                  onClick={() => setInventoryCategory("boost")}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                    inventoryCategory === "boost"
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                  }`}
                >
                  ⚡ Vật Phẩm ({boostsCount})
                </button>
              </div>

              <span className="text-xs font-bold text-slate-400">
                Hiển thị {filteredInventory.length} vật phẩm
              </span>
            </div>

            {/* 3. Lưới Hiển Thị Vật Phẩm Rộng Rãi (Spacious Items Grid) */}
            {filteredInventory.length === 0 ? (
              <div className="bg-white rounded-3xl border-2 border-slate-200 p-12 text-center space-y-4">
                <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto text-2xl">
                  🎒
                </div>
                <div className="space-y-1">
                  <h3 className="font-black text-slate-700 text-base">
                    Không tìm thấy vật phẩm nào trong mục này
                  </h3>
                  <p className="text-slate-400 text-xs font-medium">
                    Hãy tham gia làm bài tập hoặc tích lũy Bánh Mì để mở khóa thêm vật phẩm nhé!
                  </p>
                </div>
                <Link
                  href="/market"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-black rounded-xl transition-all shadow-md shadow-amber-500/20"
                >
                  <ShoppingBag size={15} /> Khám Phá Cửa Hàng
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredInventory.map((item) => {
                  const isFrame = item.category === "avatar";
                  const isBadge = item.category === "badge";
                  const isBoost = item.category === "boost";

                  const isEquipped =
                    (isFrame && equippedAvatarFrame === item.id) ||
                    (isBadge && equippedBadge === item.id);

                  return (
                    <div
                      key={item.id}
                      className={`bg-white rounded-3xl border-2 p-5 flex flex-col justify-between transition-all relative overflow-hidden shadow-xs hover:shadow-md ${
                        isEquipped
                          ? "border-amber-400 bg-gradient-to-b from-amber-50/50 to-white ring-2 ring-amber-300 ring-offset-2"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      {isEquipped && (
                        <div className="absolute top-0 right-0 bg-amber-500 text-white text-[10px] font-black uppercase px-3 py-1 rounded-bl-2xl flex items-center gap-1 shadow-xs">
                          <CheckCircle2 size={11} /> Đang Đeo
                        </div>
                      )}

                      <div className="space-y-3">
                        <div className="flex items-center gap-3.5">
                          <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-3xl shadow-inner shrink-0">
                            {item.icon}
                          </div>
                          <div>
                            <span
                              className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                                isFrame
                                  ? "bg-amber-100 text-amber-800"
                                  : isBadge
                                  ? "bg-indigo-100 text-indigo-800"
                                  : "bg-emerald-100 text-emerald-800"
                              }`}
                            >
                              {isFrame ? "Khung Avatar" : isBadge ? "Huy Hiệu" : "Hỗ Trợ"}
                            </span>
                            <h4 className="font-black text-slate-800 text-sm mt-1">
                              {item.name}
                            </h4>
                          </div>
                        </div>

                        <p className="text-slate-500 text-xs font-medium leading-relaxed">
                          {item.description}
                        </p>
                      </div>

                      {/* Action Button */}
                      <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
                        {isFrame && (
                          <button
                            type="button"
                            onClick={() => {
                              if (isEquipped) {
                                equipAvatarFrame(null);
                                toast("Đã tháo khung avatar");
                              } else {
                                equipAvatarFrame(item.id);
                                toast.success(`Đã trang bị "${item.name}"!`);
                              }
                            }}
                            className={`w-full py-2.5 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
                              isEquipped
                                ? "bg-amber-500 hover:bg-amber-600 text-white shadow-md shadow-amber-500/20"
                                : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                            }`}
                          >
                            {isEquipped ? (
                              <>
                                <CheckCircle2 size={15} /> Đang Đeo (Bấm để gỡ)
                              </>
                            ) : (
                              <>
                                <Crown size={15} /> Trang Bị Khung Này
                              </>
                            )}
                          </button>
                        )}

                        {isBadge && (
                          <button
                            type="button"
                            onClick={() => {
                              if (isEquipped) {
                                equipBadge(null);
                                toast("Đã tháo huy hiệu");
                              } else {
                                equipBadge(item.id);
                                toast.success(`Đã trang bị "${item.name}"!`);
                              }
                            }}
                            className={`w-full py-2.5 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
                              isEquipped
                                ? "bg-amber-500 hover:bg-amber-600 text-white shadow-md shadow-amber-500/20"
                                : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                            }`}
                          >
                            {isEquipped ? (
                              <>
                                <CheckCircle2 size={15} /> Đang Đeo (Bấm để gỡ)
                              </>
                            ) : (
                              <>
                                <Medal size={15} /> Trang Bị Huy Hiệu Này
                              </>
                            )}
                          </button>
                        )}

                        {isBoost && (
                          <div className="w-full py-2 text-center text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-center gap-1.5">
                            <Zap size={14} className="text-emerald-500" /> Tự động kích hoạt khi học
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

