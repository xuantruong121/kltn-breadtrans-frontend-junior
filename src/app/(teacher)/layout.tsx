"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { Users, BookOpen, PenTool, LogOut, FileText } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { useEffect, useState } from "react";

const NAV_ITEMS = [
  { id: "courses", href: "/teacher/courses", label: "Quản lý Khóa học", icon: FileText },
  { id: "classes", href: "/teacher/classes", label: "Lớp giảng dạy", icon: Users },
  { id: "assignments", href: "/teacher/assignments", label: "Chấm điểm", icon: PenTool },
  { id: "materials", href: "/teacher/materials", label: "Học liệu", icon: BookOpen },
  { id: "profile", href: "/teacher/profile", label: "Hồ sơ cá nhân", icon: Users },
];

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const unsub = useAuthStore.persist.onFinishHydration(() => setIsReady(true));
    if (useAuthStore.persist.hasHydrated()) {
      setIsReady(true);
    }
    return unsub;
  }, []);

  useEffect(() => {
    if (isReady && (!user || user.role !== 'TEACHER')) {
      router.push("/");
    }
  }, [isReady, user, router]);

  if (!isReady || !user) return null;

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col">
        <div className="p-6 border-b border-slate-800">
          <div className="font-bold text-2xl text-white flex items-center gap-2">
            BreadTrans
          </div>
          <p className="text-xs text-blue-400 mt-1 font-semibold tracking-wider">TEACHER PORTAL</p>
        </div>

        <nav className="flex-1 p-4 flex flex-col gap-2">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.id}
                href={item.href}
                className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                  isActive 
                    ? "bg-blue-600 text-white font-medium" 
                    : "hover:bg-slate-800 hover:text-white"
                }`}
              >
                <item.icon size={20} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="mb-4 px-3 flex items-center gap-3">
            {user.profile?.avatar ? (
              <img src={user.profile.avatar} alt="Avatar" className="w-10 h-10 rounded-full object-cover border border-slate-700" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">
                {(user.profile?.fullName || user.email).charAt(0).toUpperCase()}
              </div>
            )}
            <div className="overflow-hidden">
              <p className="text-sm text-white font-medium truncate">{user.profile?.fullName || user.email}</p>
              <p className="text-xs text-slate-500">Giáo viên</p>
            </div>
          </div>
          <button 
            onClick={() => { logout(); router.push('/'); }}
            className="w-full flex items-center gap-3 p-3 rounded-lg text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-colors"
          >
            <LogOut size={20} /> Đăng xuất
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-slate-200 p-4 px-8 flex items-center justify-between">
          <h2 className="font-semibold text-slate-800">
            {NAV_ITEMS.find(n => pathname.startsWith(n.href))?.label || "Giáo viên"}
          </h2>
          <div className="flex gap-4">
             {/* header tools */}
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-8 text-slate-800">
          {children}
        </div>
      </main>
    </div>
  );
}
