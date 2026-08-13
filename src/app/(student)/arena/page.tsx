"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Trophy, Star, Medal, Award, Flame, Zap, Shield, Crown } from "lucide-react";
import axiosClient from "@/lib/api/axiosClient";
import { useAuthStore } from "@/stores/authStore";

export default function ArenaPage() {
  const { user } = useAuthStore();

  const { data: leaderboard, isLoading: isLoadingLeaderboard } = useQuery({
    queryKey: ["leaderboard"],
    queryFn: async () => {
      const res = await axiosClient.get("/gamification/leaderboard");
      return Array.isArray(res) ? res : [];
    }
  });

  const { data: myBadges, isLoading: isLoadingBadges } = useQuery({
    queryKey: ["my-badges"],
    queryFn: async () => {
      const res = await axiosClient.get("/gamification/badges/me");
      return Array.isArray(res) ? res : [];
    },
    enabled: !!user
  });

  // Mock list of all available badges in the system to show locked ones
  const ALL_BADGES = [
    { id: 1, name: "Tân Binh", description: "Đạt 100 điểm kinh nghiệm đầu tiên", icon: Shield, color: "text-slate-400", bg: "bg-slate-100" },
    { id: 2, name: "Chăm Chỉ", description: "Hoàn thành 5 bài tập liên tiếp", icon: Zap, color: "text-blue-500", bg: "bg-blue-100" },
    { id: 3, name: "Học Bá", description: "Đạt điểm 10 trong 3 bài kiểm tra", icon: Star, color: "text-yellow-500", bg: "bg-yellow-100" },
    { id: 4, name: "Siêu Sao", description: "Đạt Top 1 Bảng xếp hạng tuần", icon: Crown, color: "text-purple-500", bg: "bg-purple-100" },
    { id: 5, name: "Thợ Săn", description: "Thu thập đủ 1000 điểm kinh nghiệm", icon: Flame, color: "text-red-500", bg: "bg-red-100" },
  ];

  return (
    <div className="max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <div className="bg-gradient-to-br from-yellow-400 to-orange-500 p-4 rounded-2xl text-white shadow-lg shadow-orange-200">
          <Trophy size={32} />
        </div>
        <div>
          <h1 className="text-4xl font-bold text-slate-800">Đấu Trường</h1>
          <p className="text-slate-500 font-medium mt-1">
            Bảng vàng danh dự & Tủ trưng bày huy hiệu
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEADERBOARD (LEFT 2/3) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-[2rem] border-4 border-slate-200 p-6 md:p-8 shadow-sm">
            <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
              <Crown className="text-yellow-500" /> Bảng Xếp Hạng Toàn Trường
            </h2>

            {isLoadingLeaderboard ? (
              <div className="flex justify-center py-12">
                <div className="w-10 h-10 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : leaderboard && leaderboard.length > 0 ? (
              <div className="space-y-4">
                {leaderboard.map((item: any, index: number) => {
                  const isTop1 = index === 0;
                  const isTop2 = index === 1;
                  const isTop3 = index === 2;
                  const isMe = item.userId === user?.id;

                  let rankStyle = "bg-white border-2 border-slate-100";
                  let textStyle = "text-slate-700";
                  let icon = null;

                  if (isTop1) {
                    rankStyle = "bg-gradient-to-r from-yellow-100 to-amber-50 border-2 border-yellow-300 transform scale-[1.02] shadow-md shadow-yellow-100";
                    textStyle = "text-yellow-800";
                    icon = <Medal size={28} className="text-yellow-500 drop-shadow-sm" />;
                  } else if (isTop2) {
                    rankStyle = "bg-slate-50 border-2 border-slate-300";
                    textStyle = "text-slate-700";
                    icon = <Medal size={24} className="text-slate-400 drop-shadow-sm" />;
                  } else if (isTop3) {
                    rankStyle = "bg-orange-50 border-2 border-orange-200";
                    textStyle = "text-orange-800";
                    icon = <Medal size={24} className="text-orange-500 drop-shadow-sm" />;
                  }

                  if (isMe) {
                    rankStyle += " ring-4 ring-junior-blue/30";
                  }

                  return (
                    <motion.div
                      key={item.userId}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className={`flex items-center justify-between p-4 rounded-2xl transition-all ${rankStyle}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`font-black text-2xl w-8 text-center ${isTop1 || isTop2 || isTop3 ? "" : "text-slate-400"}`}>
                          {isTop1 || isTop2 || isTop3 ? icon : `#${index + 1}`}
                        </div>
                        <img 
                          src={item.user?.profile?.avatar || "/default-avatar.png"} 
                          alt="Avatar" 
                          className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm"
                        />
                        <div>
                          <h3 className={`font-bold text-lg ${textStyle}`}>
                            {item.user?.profile?.fullName || 'Học viên ẩn danh'}
                            {isMe && <span className="ml-2 text-xs bg-junior-blue text-white px-2 py-1 rounded-lg">Bạn</span>}
                          </h3>
                          <p className="text-sm font-medium text-slate-500">{item.user?.email}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1 font-black text-xl text-junior-orange">
                          {item.totalPoints} <Star size={20} className="fill-junior-orange" />
                        </div>
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">EXP</span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 text-slate-500 font-medium">
                Chưa có dữ liệu bảng xếp hạng. Hãy là người đầu tiên ghi điểm!
              </div>
            )}
          </div>
        </div>

        {/* BADGES CABINET (RIGHT 1/3) */}
        <div className="space-y-6">
          <div className="bg-white rounded-[2rem] border-4 border-slate-200 p-6 md:p-8 shadow-sm">
            <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
              <Award className="text-junior-blue" /> Tủ Huy Hiệu Của Tôi
            </h2>

            {isLoadingBadges ? (
              <div className="flex justify-center py-8">
                <div className="w-8 h-8 border-4 border-junior-blue border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {ALL_BADGES.map((badge, i) => {
                  const hasBadge = myBadges?.some((b: any) => b.badge?.name === badge.name);
                  const Icon = badge.icon;
                  
                  return (
                    <motion.div 
                      key={badge.id}
                      whileHover={{ scale: 1.05, y: -5 }}
                      className={`relative flex flex-col items-center text-center p-4 rounded-2xl border-2 transition-all group ${
                        hasBadge 
                          ? `border-transparent ${badge.bg}` 
                          : 'border-slate-200 bg-slate-50 grayscale opacity-60'
                      }`}
                    >
                      <div className={`p-3 rounded-full mb-3 bg-white shadow-sm ${hasBadge ? badge.color : 'text-slate-400'}`}>
                        <Icon size={28} className={hasBadge ? 'drop-shadow-sm' : ''} />
                      </div>
                      <h4 className={`font-bold text-sm mb-1 ${hasBadge ? 'text-slate-800' : 'text-slate-500'}`}>
                        {badge.name}
                      </h4>
                      
                      {/* Tooltip on hover */}
                      <div className="absolute opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 text-white text-xs p-2 rounded-lg -top-12 left-1/2 -translate-x-1/2 w-40 pointer-events-none z-10 font-medium shadow-lg">
                        {badge.description}
                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-800 rotate-45"></div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
            
            <div className="mt-8 pt-6 border-t-2 border-slate-100 text-center">
              <p className="text-sm font-bold text-slate-500">
                Hãy hoàn thành thật nhiều bài tập để sưu tập thêm huy hiệu nhé!
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
