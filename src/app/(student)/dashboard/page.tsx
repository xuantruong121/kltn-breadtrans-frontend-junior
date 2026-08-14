"use client";

import { useRouter } from "next/navigation";
import { vocabService } from "@/lib/api/services/vocab.service";
import { motion } from "framer-motion";
import { Trophy, ArrowRight, Flame, BookOpen, Loader2, Star, Target, CheckCircle2, Heart, Smile } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { userService } from "@/lib/api/services/user.service";
import { gamificationService } from "@/lib/api/services/gamification.service";
import Link from "next/link";
import toast from "react-hot-toast";

export default function DashboardPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  // Fetch all necessary data
  const { data: profile, isLoading: isProfileLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: userService.getProfile,
    enabled: !!user,
  });

  const { data: pet, isLoading: isPetLoading } = useQuery({
    queryKey: ["myPet"],
    queryFn: gamificationService.getMyPet,
    enabled: !!user,
  });

  const { data: quests, isLoading: isQuestsLoading } = useQuery({
    queryKey: ["myQuests"],
    queryFn: gamificationService.getMyDailyQuests,
    enabled: !!user,
  });

  const { data: arena, isLoading: isArenaLoading } = useQuery({
    queryKey: ["myArenaSnippet"],
    queryFn: gamificationService.getArenaSnippet,
    enabled: !!user,
  });

  const { data: vocabTopicsData } = useQuery({
    queryKey: ["vocab-topics"],
    queryFn: vocabService.getTopics,
    enabled: !!user,
  });

  const feedPetMut = useMutation({
    mutationFn: gamificationService.feedPet,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myPet"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] }); // Update Banh Ran
      toast.success("Đã cho thú cưng ăn! 🍞");
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.message;
      toast.error(msg || "Không đủ bánh rán!");
    }
  });

  if (!user || isProfileLoading || isPetLoading || isQuestsLoading || isArenaLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[500px]">
        <Loader2 className="animate-spin text-junior-orange" size={48} />
      </div>
    );
  }

  const displayName = profile?.profile?.fullName || user.email;
  const banhRan = (profile as any)?.stats?.totalBanhRan ?? 0;
  const canFeedPet = banhRan >= 10;

  // Tính tổng số từ cần ôn tập
  let totalReviewNeeded = 0;
  if (vocabTopicsData) {
    const topics = (vocabTopicsData as any)?.topics || vocabTopicsData || [];
    topics.forEach((t: any) => {
      if (t.needReviewCount && t.needReviewCount > 0) {
        totalReviewNeeded += t.needReviewCount;
      }
    });
  }

  return (
    <div className="max-w-6xl mx-auto pb-20">
      
      {/* 1. WELCOME BANNER */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-blue-500 to-sky-400 p-8 md:p-10 rounded-[2rem] text-white flex flex-col md:flex-row justify-between items-center mb-8 shadow-xl shadow-sky-200 relative overflow-hidden"
      >
        {/* Decorative background circle */}
        <div className="absolute top-[-50%] right-[-10%] w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none" />

        <div className="z-10 text-center md:text-left mb-6 md:mb-0">
          <h1 className="text-4xl md:text-5xl font-extrabold mb-3 drop-shadow-md">
            Chào buổi sáng, {displayName}! 👋
          </h1>
          <p className="text-sky-100 text-xl font-medium">Sẵn sàng hoàn thành nhiệm vụ và leo rank hôm nay chưa?</p>
        </div>
        
        <div className="z-10 flex gap-4">
          <div className="bg-white/20 p-4 rounded-2xl flex items-center gap-3 backdrop-blur-md border border-white/30 shadow-lg hover:scale-105 transition-transform">
            <div className="bg-orange-500 p-2 rounded-xl">
              <Flame className="text-white" size={24} />
            </div>
            <div>
              <div className="text-sm text-sky-100 font-bold uppercase tracking-wider">Chuỗi Ngày</div>
              <div className="text-2xl font-bold leading-none">{(profile as any)?.stats?.streakCount ?? 0}</div>
            </div>
          </div>
          <div className="bg-white/20 p-4 rounded-2xl flex items-center gap-3 backdrop-blur-md border border-white/30 shadow-lg hover:scale-105 transition-transform">
            <div className="bg-yellow-400 p-2 rounded-xl">
              <span className="text-2xl">🥐</span>
            </div>
            <div>
              <div className="text-sm text-sky-100 font-bold uppercase tracking-wider">Bánh Rán</div>
              <div className="text-2xl font-bold leading-none">{banhRan}</div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* 2. BENTO GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* L E F T   C O L U M N (70%) */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Continue Learning */}
          <motion.div 
            whileHover={{ y: -4 }}
            className="bg-white p-8 rounded-[2rem] border-4 border-slate-200 shadow-sm flex flex-col md:flex-row gap-6 items-center justify-between overflow-hidden relative"
          >
            {/* Background decors */}
            <div className="absolute -bottom-10 -right-10 text-[10rem] opacity-5 pointer-events-none">📚</div>

            <div className="flex-1 text-center md:text-left">
              <div className="inline-block bg-orange-100 text-junior-orange p-3 rounded-2xl mb-4 shadow-sm">
                <BookOpen size={28} />
              </div>
              <h2 className="text-3xl font-extrabold text-slate-800 mb-2">Đảo Luyện Tập</h2>
              <p className="text-slate-500 font-medium text-lg mb-4">Hãy khởi động ngày mới bằng một bài học từ vựng thú vị nhé!</p>
              
              {totalReviewNeeded > 0 && (
                <div className="bg-red-50 border-2 border-red-200 text-red-600 rounded-xl p-4 mb-6 flex items-center gap-3">
                  <Flame size={24} className="animate-pulse" />
                  <span className="font-bold">Bạn có {totalReviewNeeded} từ vựng cần học/ôn tập lại. Đừng để quên nhé!</span>
                </div>
              )}
              
              <div className="w-full bg-slate-100 h-5 rounded-full mb-6 overflow-hidden border border-slate-200 shadow-inner">
                <div className="bg-junior-orange h-full rounded-full w-1/3" />
              </div>

              <Link href="/practice/vocab">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="btn-orange-3d flex items-center justify-center gap-2 bg-junior-orange text-white text-xl font-bold px-8 py-4 rounded-2xl w-full md:w-auto shadow-md"
                >
                  {totalReviewNeeded > 0 ? 'Ôn Tập Ngay!' : 'Học Tiếp Nào!'} <ArrowRight size={24} strokeWidth={3} />
                </motion.button>
              </Link>
            </div>
          </motion.div>

          {/* Virtual Pet */}
          <motion.div 
            className="bg-white p-8 rounded-[2rem] border-4 border-slate-200 shadow-sm relative overflow-hidden"
          >
            <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
              <div className="w-48 h-48 bg-orange-100 rounded-full border-8 border-orange-200 flex items-center justify-center text-7xl shadow-inner relative animate-pulse-slow">
                {pet?.name === 'Vua Bánh Mì' ? '👑' :
                 pet?.name === 'Bánh Kem Hoàng Gia' ? '🎂' :
                 pet?.name === 'Bánh Macaron' ? '🍩' :
                 pet?.name === 'Bánh Sừng Bò' ? '🥐' : '🍞'}
                {(pet?.happiness || 0) > 80 && (
                  <div className="absolute -top-4 -right-4 text-3xl animate-bounce">✨</div>
                )}
              </div>
              
              <div className="flex-1 w-full text-center md:text-left">
                <h2 className="text-3xl font-extrabold text-slate-800 mb-2">Thú cưng: {pet?.name}</h2>
                <div className="flex justify-center md:justify-start gap-4 mb-4">
                  <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-lg font-bold">Level {pet?.level || 1}</span>
                  <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-lg font-bold">{pet?.exp || 0} / {(pet?.level || 1) * 1000} XP</span>
                </div>
                
                {/* EXP Bar */}
                <div className="w-full bg-slate-100 h-2 rounded-full mb-6 overflow-hidden">
                  <div 
                    className="bg-blue-400 h-full rounded-full transition-all" 
                    style={{width: `${Math.min(((pet?.exp || 0) / ((pet?.level || 1) * 1000)) * 100, 100)}%`}} 
                  />
                </div>
                
                <div className="space-y-4 mb-6">
                  <div>
                    <div className="flex justify-between text-sm font-bold text-slate-600 mb-1">
                      <span className="flex items-center gap-1"><Heart size={16} className="text-red-500"/> Máu</span>
                      <span>{pet?.health}/100</span>
                    </div>
                    <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                      <div className="bg-red-500 h-full rounded-full transition-all" style={{width: `${pet?.health}%`}} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm font-bold text-slate-600 mb-1">
                      <span className="flex items-center gap-1"><Smile size={16} className="text-yellow-500"/> Vui vẻ</span>
                      <span>{pet?.happiness}/100</span>
                    </div>
                    <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                      <div className="bg-yellow-400 h-full rounded-full transition-all" style={{width: `${pet?.happiness}%`}} />
                    </div>
                  </div>
                </div>

                <motion.button
                  whileHover={canFeedPet ? { scale: 1.02 } : {}}
                  whileTap={canFeedPet ? { scale: 0.98 } : {}}
                  onClick={() => {
                    if (!canFeedPet) {
                      toast.error(`Bạn cần ít nhất 10 Bánh Rán (hiện có: ${banhRan})`);
                      return;
                    }
                    feedPetMut.mutate();
                  }}
                  disabled={feedPetMut.isPending}
                  className={`flex items-center justify-center gap-2 text-lg font-bold px-6 py-3 rounded-xl w-full md:w-auto mx-auto md:mx-0 shadow-md transition-all ${
                    canFeedPet
                      ? "btn-primary-3d bg-junior-green hover:bg-emerald-500 border-emerald-600 text-white"
                      : "bg-slate-200 text-slate-400 cursor-not-allowed border-2 border-slate-300"
                  } disabled:opacity-50`}
                >
                  🥐 Cho {pet?.name} ăn (10 Bánh Rán)
                  {!canFeedPet && <span className="text-xs font-normal">(Thiếu {10 - banhRan})</span>}
                </motion.button>
              </div>
            </div>
          </motion.div>

        </div>

        {/* R I G H T   C O L U M N (30%) */}
        <div className="space-y-8">
          
          {/* Arena Snippet */}
          <motion.div 
            whileHover={{ y: -4 }}
            className="bg-white p-6 rounded-[2rem] border-4 border-slate-200 shadow-sm"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-extrabold text-slate-800">Đấu Trường</h2>
              <div className="bg-purple-100 text-purple-600 p-2 rounded-xl">
                <Trophy size={24} />
              </div>
            </div>
            
            <div className="text-center mb-6">
              <div className="inline-block relative">
                <div className="w-24 h-24 bg-gradient-to-br from-yellow-300 to-yellow-500 rounded-full flex items-center justify-center border-4 border-white shadow-xl mx-auto mb-3">
                  <span className="text-4xl">👑</span>
                </div>
                <div className="absolute -bottom-2 -right-2 bg-purple-600 text-white text-xs font-bold px-2 py-1 rounded-lg border-2 border-white shadow-sm">
                  {arena?.tier}
                </div>
              </div>
              <h3 className="text-xl font-bold text-slate-800">
                {arena?.rank ? `Hạng ${arena.rank}` : "Chưa có hạng"}
              </h3>
              <p className="text-slate-500 font-medium text-sm mt-1">{arena?.message}</p>
            </div>

            <Link href="/arena">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="btn-primary-3d flex items-center justify-center gap-2 bg-purple-500 hover:bg-purple-600 border-purple-700 text-white font-bold p-4 rounded-xl w-full"
              >
                Vào Bảng Xếp Hạng
              </motion.button>
            </Link>
          </motion.div>

          {/* Daily Quests */}
          <motion.div 
            className="bg-white p-6 rounded-[2rem] border-4 border-slate-200 shadow-sm"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-extrabold text-slate-800">Nhiệm vụ Ngày</h2>
              <div className="bg-yellow-100 text-yellow-600 p-2 rounded-xl">
                <Target size={24} />
              </div>
            </div>

            <div className="space-y-4">
              {quests?.map((q: any) => {
                const percent = Math.min((q.currentValue / q.quest.targetValue) * 100, 100);
                const isCompleted = q.currentValue >= q.quest.targetValue;

                return (
                  <div key={q.id} className="p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl hover:border-slate-200 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-bold text-slate-800 leading-tight">{q.quest.title}</h4>
                      {isCompleted ? (
                        <div className="text-green-500 bg-green-100 p-1 rounded-full"><CheckCircle2 size={16}/></div>
                      ) : (
                        <div className="text-orange-500 bg-orange-100 text-xs font-bold px-2 py-1 rounded-lg">
                          {q.quest.rewardBanh} 🥐
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="flex-1 bg-slate-200 h-3 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all ${isCompleted ? 'bg-green-500' : 'bg-yellow-400'}`}
                          style={{width: `${percent}%`}}
                        />
                      </div>
                      <div className="text-xs font-bold text-slate-500 w-10 text-right whitespace-nowrap">
                        {Math.min(q.currentValue, q.quest.targetValue)}/{q.quest.targetValue}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>

        </div>
      </div>
    </div>
  );
}
