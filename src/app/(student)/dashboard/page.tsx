"use client";

import { motion } from "framer-motion";
import { Trophy, ArrowRight, Star, Flame, BookOpen, Loader2 } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { useQuery } from "@tanstack/react-query";
import { userService } from "@/lib/api/services/user.service";
import { gamificationService } from "@/lib/api/services/gamification.service";

export default function DashboardPage() {
  const { user } = useAuthStore();

  // Fetch User Profile
  const { data: profile, isLoading: isProfileLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: userService.getProfile,
    enabled: !!user,
  });

  // Fetch Badges
  const { data: badges, isLoading: isBadgesLoading } = useQuery({
    queryKey: ["myBadges"],
    queryFn: gamificationService.getMyBadges,
    enabled: !!user,
  });

  if (!user) return null;

  const displayName = profile?.profile?.fullName || user.email;
  const totalBadges = badges?.length || 0;
  // Giả lập điểm số từ profile hoặc lấy mặc định nếu chưa có API điểm
  const totalPoints = 0; 

  if (isProfileLoading || isBadgesLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="animate-spin text-junior-blue" size={48} />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Welcome Banner */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-junior-blue p-8 rounded-[2rem] text-white flex justify-between items-center mb-8 shadow-lg shadow-sky-200"
      >
        <div>
          <h1 className="text-3xl font-bold mb-2">Chào buổi sáng, {displayName}! 👋</h1>
          <p className="text-sky-100 text-lg font-medium">Sẵn sàng thu thập thêm cúp vàng hôm nay chưa?</p>
        </div>
        <div className="hidden md:flex gap-4">
          <div className="bg-white/20 p-4 rounded-2xl flex items-center gap-2 backdrop-blur-sm">
            <Flame className="text-orange-300" size={28} />
            <span className="text-2xl font-bold">12</span>
          </div>
          <div className="bg-white/20 p-4 rounded-2xl flex items-center gap-2 backdrop-blur-sm">
            <Trophy className="text-yellow-300" size={28} />
            <span className="text-2xl font-bold">{totalBadges}</span>
          </div>
        </div>
      </motion.div>

      {/* Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Continue Learning Card */}
        <motion.div 
          whileHover={{ y: -4 }}
          className="md:col-span-2 bg-white p-8 rounded-[2rem] border-4 border-slate-200 shadow-sm flex flex-col justify-between"
        >
          <div>
            <div className="inline-block bg-orange-100 text-junior-orange p-3 rounded-xl mb-4">
              <BookOpen size={24} />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Chưa có khóa học nào đang học</h2>
            <p className="text-slate-500 font-medium mb-6">Hãy vào mục Khóa Học để chọn một bài học thú vị nhé!</p>
            
            {/* Progress Bar Placeholder */}
            <div className="w-full bg-slate-100 h-4 rounded-full mb-6 overflow-hidden">
              <div className="bg-junior-green h-full rounded-full w-0" />
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="btn-orange-3d flex items-center justify-center gap-2 bg-junior-orange text-white text-xl font-bold p-4 rounded-xl w-full sm:w-auto self-start"
          >
            Khám phá ngay <ArrowRight size={24} strokeWidth={3} />
          </motion.button>
        </motion.div>

        {/* Badges Preview Card */}
        <motion.div 
          whileHover={{ y: -4 }}
          className="bg-purple-100 p-8 rounded-[2rem] border-4 border-purple-200 shadow-sm flex flex-col items-center justify-center text-center"
        >
          <div className="bg-white p-6 rounded-full shadow-md mb-6">
            <Trophy className="text-purple-500" size={64} />
          </div>
          <h3 className="text-xl font-bold text-purple-900 mb-2">Huy Hiệu Của Bạn</h3>
          <p className="text-purple-700 font-medium font-bold text-lg">{totalBadges} Huy hiệu đạt được</p>
          <div className="flex gap-2 mt-4 flex-wrap justify-center">
             {badges?.slice(0, 3).map((b) => (
               <div key={b.id} className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm" title={b.badge.name}>
                 <img src={b.badge.imageUrl || "/placeholder.png"} alt={b.badge.name} className="w-8 h-8 object-contain" />
               </div>
             ))}
             {badges?.length === 0 && (
                <p className="text-sm text-purple-600 mt-2">Hãy cố gắng giành huy hiệu đầu tiên nhé!</p>
             )}
          </div>
        </motion.div>

      </div>
    </div>
  );
}
