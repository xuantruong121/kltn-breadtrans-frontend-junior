"use client";

import { motion } from "framer-motion";
import { Users, BookOpen, TrendingUp, DollarSign } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";

const STATS = [
  { id: 1, name: "Tổng Học Sinh", value: "1,200", icon: Users, color: "text-blue-500", bg: "bg-blue-100" },
  { id: 2, name: "Khóa Học Đang Mở", value: "12", icon: BookOpen, color: "text-green-500", bg: "bg-green-100" },
  { id: 3, name: "Tương tác tuần này", value: "+24%", icon: TrendingUp, color: "text-purple-500", bg: "bg-purple-100" },
  { id: 4, name: "Doanh Thu", value: "$12,000", icon: DollarSign, color: "text-orange-500", bg: "bg-orange-100" },
];

export default function AdminDashboardPage() {
  const { user } = useAuthStore();

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800">Tổng quan (Dashboard)</h1>
        <p className="text-slate-500 mt-1">Chào mừng Giáo viên {user?.email || ""} quay trở lại hệ thống BreadTrans!</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {STATS.map((stat, index) => (
          <motion.div
            key={stat.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className={`${stat.bg} ${stat.color} p-3 rounded-xl`}>
                <stat.icon size={24} />
              </div>
              <h3 className="text-slate-500 font-medium">{stat.name}</h3>
            </div>
            <p className="text-3xl font-bold text-slate-800">{stat.value}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100 min-h-[400px] flex items-center justify-center">
           <p className="text-slate-400">Biểu đồ lượt truy cập sẽ hiển thị ở đây</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 min-h-[400px]">
           <h3 className="text-lg font-bold text-slate-800 mb-4">Hoạt động gần đây</h3>
           <div className="space-y-4">
             {[1, 2, 3, 4, 5].map((item) => (
               <div key={item} className="flex gap-4 items-start pb-4 border-b border-slate-50 last:border-0 last:pb-0">
                 <div className="w-2 h-2 mt-2 rounded-full bg-blue-500 flex-shrink-0" />
                 <div>
                   <p className="text-sm font-medium text-slate-700">Học sinh A vừa đăng ký khóa TOEIC 500+</p>
                   <p className="text-xs text-slate-400 mt-1">10 phút trước</p>
                 </div>
               </div>
             ))}
           </div>
        </div>
      </div>
    </div>
  );
}
