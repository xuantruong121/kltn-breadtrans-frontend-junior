"use client";

import { motion } from "framer-motion";
import { 
  Trophy, 
  ArrowRight, 
  Flame, 
  Loader2, 
  Target, 
  CheckCircle2, 
  Heart, 
  Smile, 
  Compass
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { useGamificationStore } from "@/stores/gamificationStore";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { userService } from "@/lib/api/services/user.service";
import { gamificationService } from "@/lib/api/services/gamification.service";
import { Button3D, UserAvatarWithFrame } from "@/components/ui";
import { PetStage3D } from "@/modules/pet/components/PetStage3D";
import { MARKET_ITEMS } from "@/modules/market/services/marketData";
import Link from "next/link";
import toast from "react-hot-toast";

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { breads: localBreads, streak: localStreak, equippedBadge } = useGamificationStore();
  const queryClient = useQueryClient();

  // Fetch all necessary data scoped by user.id
  const { data: profile, isLoading: isProfileLoading } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: userService.getProfile,
    enabled: !!user?.id,
  });

  const { data: pet, isLoading: isPetLoading } = useQuery({
    queryKey: ["myPet", user?.id],
    queryFn: gamificationService.getMyPet,
    enabled: !!user?.id,
  });

  const { data: myQuests, isLoading: isQuestsLoading } = useQuery({
    queryKey: ["myQuests", user?.id],
    queryFn: gamificationService.getMyDailyQuests,
    enabled: !!user?.id,
  });

  const { data: arena, isLoading: isArenaLoading } = useQuery({
    queryKey: ["myArenaSnippet", user?.id],
    queryFn: gamificationService.getArenaSnippet,
    enabled: !!user?.id,
  });

  const feedPetMut = useMutation({
    mutationFn: gamificationService.feedPet,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myPet", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
      toast.success("Đã cho thú cưng ăn! 🍞");
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.message;
      toast.error(msg || "Không đủ bánh mì!");
    }
  });

  const changePetSpeciesMut = useMutation({
    mutationFn: gamificationService.changePetType,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myPet", user?.id] });
      toast.success("Đã đổi thú cưng đồng hành mới! ✨");
    },
    onError: () => {
      toast.error("Không thể đổi thú cưng!");
    }
  });

  if (!user || isProfileLoading || isPetLoading || isQuestsLoading || isArenaLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[500px]">
        <Loader2 className="animate-spin text-junior-orange" size={48} />
      </div>
    );
  }

  const displayName = user?.profile?.fullName || profile?.profile?.fullName || user.email;
  const avatarUrl = user?.profile?.avatar || profile?.profile?.avatar || profile?.profile?.avatarUrl;
  const banhRan = (profile as any)?.stats?.totalBanhRan ?? user?.profile?.totalBanhRan ?? localBreads;
  const streakCount = (profile as any)?.stats?.streakCount ?? (profile as any)?.stats?.streak ?? localStreak;
  const canFeedPet = banhRan >= 10;
  const activeBadgeItem = MARKET_ITEMS.find((i) => i.id === equippedBadge);

  // Quick Action Modules Map
  const QUICK_ACTIONS = [
    {
      id: "flashcard",
      title: "Từ Vựng 3D",
      desc: "Flashcard tương tác",
      icon: "🎴",
      href: "/flashcard",
      color: "from-amber-400 to-orange-500",
      border: "border-amber-400 shadow-[0_8px_0_0_#f59e0b]",
      tag: "Từ vựng",
    },
    {
      id: "grammar",
      title: "Ngữ Pháp 3D",
      desc: "Bài học trực quan",
      icon: "📐",
      href: "/grammar",
      color: "from-emerald-400 to-teal-500",
      border: "border-emerald-400 shadow-[0_8px_0_0_#10b981]",
      tag: "Cấu trúc",
    },
    {
      id: "learn",
      title: "Phim & Nhạc",
      desc: "Luyện qua phụ đề",
      icon: "🎬",
      href: "/learn",
      color: "from-rose-400 to-red-500",
      border: "border-rose-400 shadow-[0_8px_0_0_#f43f5e]",
      tag: "Giải trí",
    },
    {
      id: "practice",
      title: "Đề Thi & AI",
      desc: "Phát âm & TOEIC",
      icon: "🎯",
      href: "/practice",
      color: "from-purple-400 to-indigo-500",
      border: "border-purple-400 shadow-[0_8px_0_0_#8b5cf6]",
      tag: "Thi cử",
    },
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* 1. HERO BANNER */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-500 p-6 md:p-10 text-white shadow-[0_12px_0_0_#0284c7] border-4 border-sky-300 flex flex-col md:flex-row items-center justify-between"
      >
        <div className="z-10 flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left mb-6 md:mb-0">
          <Link href="/student/profile" className="shrink-0 hover:scale-105 transition-transform">
            <UserAvatarWithFrame
              avatarUrl={avatarUrl}
              name={displayName}
              size="lg"
              showBadge={true}
            />
          </Link>
          <div>
            <span className="text-xs font-black uppercase tracking-wider bg-white/20 px-3.5 py-1.5 rounded-full backdrop-blur-xs">
              Học kỳ Junior 2026
            </span>
            <h1 className="text-3xl md:text-4xl font-black mt-2 mb-1 drop-shadow-md flex items-center justify-center sm:justify-start gap-2 flex-wrap">
              <span>Chào {displayName}!</span>
              {activeBadgeItem && (
                <span className="text-2xl" title={activeBadgeItem.name}>{activeBadgeItem.icon}</span>
              )}
              <span>👋</span>
            </h1>
            <p className="text-sky-100 text-sm md:text-base font-medium">Hôm nay bạn muốn rèn luyện kỹ năng nào?</p>
          </div>
        </div>
        
        <div className="z-10 flex gap-3">
          <div className="bg-white/20 px-4 py-3 rounded-2xl flex items-center gap-3 backdrop-blur-md border-2 border-white/40 shadow-sm">
            <Flame className="text-amber-300 fill-amber-300" size={24} />
            <div>
              <div className="text-[10px] text-sky-100 font-black uppercase tracking-wider">Chuỗi ngày</div>
              <div className="text-xl font-black leading-none">{streakCount} ngày</div>
            </div>
          </div>
          <div className="bg-white/20 px-4 py-3 rounded-2xl flex items-center gap-3 backdrop-blur-md border-2 border-white/40 shadow-sm">
            <span className="text-2xl">🍞</span>
            <div>
              <div className="text-[10px] text-sky-100 font-black uppercase tracking-wider">Bánh Mì</div>
              <div className="text-xl font-black leading-none">{banhRan}</div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* 2. QUICK ACTIONS TILES (TƯƠNG TỰ BREADTRANS) */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
            <Compass className="text-amber-500" /> Trạm Học Tập Nhanh
          </h2>
          <span className="text-xs font-bold text-slate-400">Chọn một bài học để bắt đầu</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {QUICK_ACTIONS.map((act) => (
            <Link key={act.id} href={act.href}>
              <motion.div
                whileHover={{ y: -6, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`bg-white rounded-[2rem] border-4 ${act.border} p-6 h-full flex flex-col justify-between cursor-pointer transition-all`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-4xl">{act.icon}</span>
                    <span className="bg-slate-100 text-slate-700 text-[10px] font-black uppercase px-2.5 py-1 rounded-full border border-slate-200">
                      {act.tag}
                    </span>
                  </div>
                  <h3 className="font-black text-slate-800 text-lg mb-1">{act.title}</h3>
                  <p className="text-xs font-medium text-slate-400 leading-relaxed">{act.desc}</p>
                </div>

                <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs font-black text-sky-600">
                  <span>Học ngay</span>
                  <ArrowRight size={16} />
                </div>
              </motion.div>
            </Link>
          ))}
        </div>
      </div>

      {/* 3. BENTO GRID: PET & QUESTS & ARENA */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* L E F T   C O L U M N (70%) */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Interactive 3D Pet Sanctuary Stage */}
          <PetStage3D
            pet={pet}
            banhRan={banhRan}
            onFeed={() => feedPetMut.mutate()}
            onChangeSpecies={(speciesName) => changePetSpeciesMut.mutate(speciesName)}
            isFeeding={feedPetMut.isPending}
            isChangingSpecies={changePetSpeciesMut.isPending}
          />

        </div>

        {/* R I G H T   C O L U M N (30%) */}
        <div className="space-y-8">
          
          {/* Arena Snippet */}
          <motion.div 
            whileHover={{ y: -4 }}
            className="bg-white p-6 rounded-[2.5rem] border-4 border-slate-200 shadow-[0_8px_0_0_#e2e8f0]"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-black text-slate-800">Đấu Trường</h3>
              <div className="bg-purple-100 text-purple-600 p-2 rounded-xl">
                <Trophy size={22} />
              </div>
            </div>
            
            <div className="text-center mb-6">
              <div className="inline-block relative">
                <div className="w-20 h-20 bg-gradient-to-br from-amber-300 to-yellow-500 rounded-full flex items-center justify-center border-4 border-white shadow-md mx-auto mb-2">
                  <span className="text-3xl">👑</span>
                </div>
                <div className="absolute -bottom-1 -right-1 bg-purple-600 text-white text-[10px] font-black px-2 py-0.5 rounded-md border border-white shadow-xs">
                  {arena?.tier || "Tân binh"}
                </div>
              </div>
              <h4 className="text-lg font-black text-slate-800">
                {arena?.rank ? `Hạng ${arena.rank}` : "Hạng #12"}
              </h4>
              <p className="text-slate-400 font-bold text-xs mt-0.5">{arena?.message || "Thi đấu leo rank nhận quà!"}</p>
            </div>

            <Link href="/arena" className="w-full">
              <Button3D variant="purple" size="md" className="w-full">
                Vào Đấu Trường <ArrowRight size={18} />
              </Button3D>
            </Link>
          </motion.div>

          {/* Daily Quests */}
          <div className="bg-white p-6 rounded-[2.5rem] border-4 border-slate-200 shadow-[0_8px_0_0_#e2e8f0] space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xl font-black text-slate-800">Nhiệm Vụ Ngày</h3>
              <div className="bg-amber-100 text-amber-700 p-2 rounded-xl">
                <Target size={22} />
              </div>
            </div>

            <div className="space-y-3">
              {isQuestsLoading ? (
                <div className="space-y-2 animate-pulse">
                  <div className="h-14 bg-slate-100 rounded-2xl" />
                  <div className="h-14 bg-slate-100 rounded-2xl" />
                  <div className="h-14 bg-slate-100 rounded-2xl" />
                </div>
              ) : myQuests && myQuests.length > 0 ? (
                myQuests.map((item) => {
                  const target = item.quest?.targetValue || 1;
                  const current = Math.min(item.currentValue || 0, target);
                  const isDone = item.isCompleted || current >= target;
                  const reward = item.quest?.rewardBanh || (item.quest?.rewardXP ? `${item.quest.rewardXP} XP` : 10);
                  return (
                    <div key={item.id} className="p-3.5 bg-slate-50 border-2 border-slate-200 rounded-2xl transition-all">
                      <div className="flex justify-between items-start mb-1.5">
                        <h4 className="font-extrabold text-slate-800 text-xs">{item.quest?.title}</h4>
                        {isDone ? (
                          <span className="text-emerald-600 bg-emerald-100 p-0.5 rounded-full" title="Đã hoàn thành">
                            <CheckCircle2 size={14} />
                          </span>
                        ) : (
                          <span className="text-amber-700 bg-amber-100 text-[10px] font-black px-1.5 py-0.5 rounded-md">
                            +{reward} 🍞
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-slate-200 h-2 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${isDone ? 'bg-emerald-500' : 'bg-amber-400'}`}
                            style={{ width: `${Math.min(100, Math.round((current / target) * 100))}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-bold text-slate-400">
                          {current}/{target}
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-4 text-center text-xs text-slate-400 font-bold bg-slate-50 rounded-2xl">
                  Chưa có nhiệm vụ mới hôm nay
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
