"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { ShoppingBag, Trophy, Flame, Sparkles, CheckCircle2, Gift } from "lucide-react";
import { MARKET_ITEMS, MOCK_LEADERBOARD } from "../services/marketData";
import { MarketItemCard } from "../components/MarketItemCard";
import axiosClient from "@/lib/api/axiosClient";
import { useGamificationStore } from "@/stores/gamificationStore";
import toast from "react-hot-toast";

export const MarketScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"shop" | "leaderboard">("shop");
  const [filterCategory, setFilterCategory] = useState<string>("all");

  const { breads, unlockedItems, spendBreads, unlockItem } = useGamificationStore();

  const handleBuyItem = async (item: typeof MARKET_ITEMS[0]) => {
    if (breads < item.price) {
      toast.error("Bạn không đủ số Bánh Mì để đổi vật phẩm này!");
      return;
    }

    try {
      await axiosClient.post("/market/orders", {
        items: [{ id: item.id, name: item.name, price: item.price, quantity: 1 }],
        totalBanh: item.price,
      });
    } catch {
      // Allow seamless offline/local fallback
    }

    if (spendBreads(item.price)) {
      unlockItem(item.id);
      toast.success(`🎉 Chúc mừng! Bạn đã đổi thành công "${item.name}"!`);
    }
  };

  const filteredItems = filterCategory === "all"
    ? MARKET_ITEMS
    : MARKET_ITEMS.filter((i) => i.category === filterCategory);

  return (
    <div className="max-w-6xl mx-auto space-y-8">
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
            {["all", "boost", "avatar", "badge", "gift"].map((cat) => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={`px-3.5 py-1.5 rounded-xl font-bold text-xs capitalize transition-all cursor-pointer ${
                  filterCategory === cat
                    ? "bg-slate-800 text-white shadow-xs"
                    : "bg-white text-slate-500 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                {cat === "all" ? "Tất cả" : cat === "boost" ? "Vật phẩm hỗ trợ" : cat === "avatar" ? "Trang trí" : cat === "badge" ? "Huy hiệu" : "Quà thực tế"}
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
              canAfford={breads >= item.price}
              onBuy={() => handleBuyItem(item)}
            />
          ))}
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
                rankStyle = "bg-amber-50 border-4 border-amber-400 shadow-md";
                badgeColor = "bg-amber-400 text-amber-950 font-black";
              } else if (user.rank === 2) {
                rankStyle = "bg-slate-100 border-2 border-slate-300";
                badgeColor = "bg-slate-300 text-slate-800 font-black";
              } else if (user.rank === 3) {
                rankStyle = "bg-orange-50 border-2 border-orange-200";
                badgeColor = "bg-orange-300 text-orange-900 font-black";
              }

              return (
                <div
                  key={user.id}
                  className={`p-4 rounded-2xl flex items-center justify-between gap-4 transition-all ${rankStyle}`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${badgeColor}`}>
                      #{user.rank}
                    </span>
                    <span className="text-2xl">{user.avatar}</span>
                    <div>
                      <h4 className="font-black text-slate-800 text-base">{user.name}</h4>
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                        <span className="flex items-center gap-1 text-orange-500"><Flame size={14} /> {user.streak} ngày</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 font-black text-amber-800 text-base">
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
