"use client";

import React, { useState } from "react";
import { ShoppingBag, Trophy, Flame, CheckCircle2, Clock, AlertCircle, PackageCheck } from "lucide-react";
import { MARKET_ITEMS, MOCK_LEADERBOARD } from "../services/marketData";
import { MarketItemCard } from "../components/MarketItemCard";
import axiosClient from "@/lib/api/axiosClient";
import { useGamificationStore } from "@/stores/gamificationStore";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

export const MarketScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"shop" | "orders" | "leaderboard">("shop");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();

  const { breads, unlockedItems, spendBreads, unlockItem } = useGamificationStore();

  // Truy vấn lịch sử đơn đổi quà của học sinh
  const { data: myOrders, isLoading: isOrdersLoading } = useQuery<any[]>({
    queryKey: ["my-market-orders"],
    queryFn: async () => {
      const res: any = await axiosClient.get("/market/orders/my");
      return Array.isArray(res) ? res : res?.data || [];
    },
  });

  const handleBuyItem = async (item: typeof MARKET_ITEMS[0]) => {
    if (breads < item.price) {
      toast.error("Bạn không đủ số Bánh Mì để đổi vật phẩm này!");
      return;
    }

    setIsSubmitting(true);
    try {
      const res: any = await axiosClient.post("/market/orders", {
        items: [{ id: item.id, name: item.name, price: item.price, category: item.category, quantity: 1 }],
        totalBanh: item.price,
      });

      const isPending = res?.status === "pending" || item.category === "gift";

      if (spendBreads(item.price)) {
        // Chỉ lưu vào unlockedItems nếu là Avatar Frame hoặc Badge sở hữu 1 lần
        if (item.category === "avatar" || item.category === "badge") {
          unlockItem(item.id);
        }

        if (isPending) {
          toast.success(`🎁 Yêu cầu đổi "${item.name}" đã gửi thành công! Vui lòng chờ Ban Quản Trị phê duyệt nhé.`, {
            duration: 6000,
          });
        } else {
          toast.success(`🎉 Chúc mừng! Bạn đã nhận "${item.name}" thành công!`);
        }

        queryClient.invalidateQueries({ queryKey: ["my-market-orders"] });
        queryClient.invalidateQueries({ queryKey: ["user-profile"] });
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Có lỗi xảy ra khi đổi quà!");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredItems = filterCategory === "all"
    ? MARKET_ITEMS
    : MARKET_ITEMS.filter((i) => i.category === filterCategory);

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      {/* HEADER & BALANCE BANNER */}
      <div className="bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 rounded-[2.5rem] border-4 border-amber-600 shadow-[0_12px_0_0_#b45309] p-8 text-white relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <span className="text-xs font-black uppercase tracking-wider bg-white/20 px-3.5 py-1.5 rounded-full backdrop-blur-xs">
              Tiệm Bánh Mì Thưởng
            </span>
            <h1 className="text-4xl font-black mt-2 tracking-tight">Cửa Hàng BreadTrans</h1>
            <p className="text-amber-100 font-bold text-sm mt-1">
              Dùng số Bánh Mì bạn chăm chỉ tích luỹ được để đổi những phần quà siêu xịn!
            </p>
          </div>

          <div className="bg-white text-slate-800 rounded-3xl p-5 border-4 border-amber-200 shadow-lg flex items-center gap-4 shrink-0">
            <span className="text-4xl">🍞</span>
            <div>
              <span className="text-xs font-extrabold text-slate-400 uppercase">Số dư của bạn</span>
              <p className="text-3xl font-black text-amber-700">{breads} <span className="text-sm text-slate-400">Bánh Mì</span></p>
            </div>
          </div>
        </div>
      </div>

      {/* TAB NAVIGATION */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl border-2 border-slate-200 shadow-xs">
          <button
            onClick={() => setActiveTab("shop")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-sm transition-all cursor-pointer ${
              activeTab === "shop"
                ? "bg-amber-400 text-amber-950 shadow-xs"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <ShoppingBag size={18} /> Cửa Hàng Vật Phẩm
          </button>

          <button
            onClick={() => setActiveTab("orders")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-sm transition-all cursor-pointer ${
              activeTab === "orders"
                ? "bg-amber-400 text-amber-950 shadow-xs"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <PackageCheck size={18} /> Đơn Đổi Quà Của Tôi
            {myOrders && myOrders.filter(o => o.status === 'pending').length > 0 && (
              <span className="bg-rose-500 text-white text-[10px] px-2 py-0.5 rounded-full font-black">
                {myOrders.filter(o => o.status === 'pending').length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("leaderboard")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-sm transition-all cursor-pointer ${
              activeTab === "leaderboard"
                ? "bg-amber-400 text-amber-950 shadow-xs"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Trophy size={18} /> Bảng Vinh Danh
          </button>
        </div>

        {activeTab === "shop" && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {[
              { id: "all", label: "Tất cả" },
              { id: "boost", label: "Vật phẩm hỗ trợ" },
              { id: "avatar", label: "Trang trí" },
              { id: "badge", label: "Huy hiệu" },
              { id: "gift", label: "Quà thực tế (Chờ duyệt)" },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setFilterCategory(cat.id)}
                className={`px-3.5 py-1.5 rounded-xl font-bold text-xs capitalize transition-all cursor-pointer ${
                  filterCategory === cat.id
                    ? "bg-slate-800 text-white shadow-xs"
                    : "bg-white text-slate-500 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* TAB CONTENT: SHOP */}
      {activeTab === "shop" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item) => (
            <MarketItemCard
              key={item.id}
              item={item}
              isUnlocked={unlockedItems.includes(item.id)}
              canAfford={breads >= item.price && !isSubmitting}
              onBuy={() => handleBuyItem(item)}
            />
          ))}
        </div>
      )}

      {/* TAB CONTENT: MY ORDERS */}
      {activeTab === "orders" && (
        <div className="bg-white rounded-[2.5rem] border-4 border-slate-200 shadow-[0_8px_0_0_#e2e8f0] p-6 md:p-8 space-y-6">
          <div className="flex items-center justify-between border-b-2 border-slate-100 pb-4">
            <div>
              <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                <PackageCheck className="text-amber-500" /> Lịch Sử Yêu Cầu Đổi Quà
              </h2>
              <p className="text-slate-400 font-bold text-xs mt-0.5">
                Theo dõi tiến độ duyệt các phần quà hiện vật và voucher từ Ban Quản Trị
              </p>
            </div>
          </div>

          {isOrdersLoading ? (
            <div className="text-center py-12 text-slate-400 font-bold">Đang tải lịch sử đơn hàng...</div>
          ) : myOrders && myOrders.length > 0 ? (
            <div className="space-y-3">
              {myOrders.map((ord) => {
                const itemsList = Array.isArray(ord.items)
                  ? ord.items.map((i: any) => `${i.name} (x${i.quantity || 1})`).join(", ")
                  : "Quà tặng";

                const isPending = ord.status === "pending";
                const isApproved = ord.status === "approved";
                const isRejected = ord.status === "rejected";

                return (
                  <div
                    key={ord.id}
                    className="p-4 rounded-2xl border-2 border-slate-200 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-slate-400 font-black">#{ord.id}</span>
                        <h4 className="font-black text-slate-800 text-base">{itemsList}</h4>
                      </div>
                      <p className="text-xs font-bold text-slate-400">
                        Thời gian đổi: {new Date(ord.createdAt).toLocaleString("vi-VN")}
                      </p>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <span className="text-xs font-extrabold text-slate-400 uppercase block">Chi phí</span>
                        <span className="font-black text-amber-700 text-sm">🍞 {ord.totalBanh} Bánh Mì</span>
                      </div>

                      <div>
                        {isPending && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black bg-amber-100 text-amber-800 border border-amber-300 shadow-2xs">
                            <Clock size={14} className="animate-spin" /> Đang chờ duyệt
                          </span>
                        )}
                        {isApproved && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs">
                            <CheckCircle2 size={14} /> Đã phê duyệt
                          </span>
                        )}
                        {isRejected && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black bg-rose-100 text-rose-800 border border-rose-300 shadow-2xs">
                            <AlertCircle size={14} /> Bị từ chối (Đã hoàn 🍞)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-slate-400 font-bold">
              Bạn chưa có yêu cầu đổi quà nào. Hãy tích lũy Bánh Mì và đổi quà nhé! 🎁
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: LEADERBOARD */}
      {activeTab === "leaderboard" && (
        <div className="bg-white rounded-[2.5rem] border-4 border-slate-200 shadow-[0_12px_0_0_#e2e8f0] p-8 max-w-3xl mx-auto space-y-6">
          <div className="text-center">
            <h2 className="text-3xl font-black text-slate-800">Top Học Sinh Xuất Sắc</h2>
            <p className="font-bold text-slate-400 text-sm">Vinh danh những bạn chăm chỉ tích lũy nhiều Bánh Mì nhất tuần này!</p>
          </div>

          <div className="space-y-3">
            {MOCK_LEADERBOARD.map((user) => {
              let rankStyle = "bg-slate-50 border-2 border-slate-200";
              let badgeColor = "bg-slate-200 text-slate-700";

              if (user.rank === 1) {
                rankStyle = "bg-amber-100/60 border-2 border-amber-300 shadow-sm";
                badgeColor = "bg-amber-400 text-amber-950 font-black";
              } else if (user.rank === 2) {
                rankStyle = "bg-slate-100/80 border-2 border-slate-300";
                badgeColor = "bg-slate-300 text-slate-800 font-black";
              } else if (user.rank === 3) {
                rankStyle = "bg-orange-100/60 border-2 border-orange-300";
                badgeColor = "bg-orange-300 text-orange-950 font-black";
              }

              return (
                <div
                  key={user.id}
                  className={`flex items-center justify-between p-4 rounded-2xl transition-all ${rankStyle}`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm font-black shadow-xs ${badgeColor}`}>
                      #{user.rank}
                    </div>
                    <span className="text-2xl">{user.avatar}</span>
                    <div>
                      <h4 className="font-black text-slate-800 text-sm">{user.name}</h4>
                      <span className="text-xs font-bold text-orange-600 flex items-center gap-1">
                        <Flame size={14} className="fill-orange-500" /> {user.streak} ngày streak
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 font-black text-amber-700 text-base">
                    <span>{user.breads}</span>
                    <span>🍞</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
