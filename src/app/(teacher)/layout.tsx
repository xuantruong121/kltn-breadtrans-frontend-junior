"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Users, BookOpen, PenTool, LogOut } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { useSyncExternalStore, useEffect } from "react";
import dynamic from "next/dynamic";

const FloatingAiTutor = dynamic(() => import("@/components/FloatingAiTutor"), { ssr: false });

const NAV_ITEMS = [
  { id: "classes", href: "/teacher/classes", label: "Lớp học của tôi", icon: Users },
  { id: "assignments", href: "/teacher/assignments", label: "Chấm điểm", icon: PenTool },
  { id: "materials", href: "/teacher/materials", label: "Học liệu", icon: BookOpen },
  { id: "profile", href: "/teacher/profile", label: "Hồ sơ cá nhân", icon: Users },
];

const emptySubscribe = () => () => {};

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  
  const isReady = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  useEffect(() => {
    if (isReady && (!user || user.role !== 'TEACHER')) {
      router.push("/");
    }
  }, [isReady, user, router]);

  if (!isReady || !user) return null;

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between">
        <div>
          {/* Logo */}
          <div className="p-6 border-b border-slate-800">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center border border-orange-500/30">
                <Image src="/logo.png" alt="Logo" width={24} height={24} className="rounded-md" />
              </div>
              <span className="font-bold text-white text-lg tracking-wide">BreadTrans</span>
            </Link>
          </div>

          {/* Nav links */}
          <nav className="p-4 space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-colors ${
                    isActive 
                      ? "bg-blue-600 text-white font-semibold" 
                      : "text-slate-400 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  <Icon size={18} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User profile & logout */}
        <div className="p-4 border-t border-slate-800 space-y-4">
          <div className="flex items-center gap-3 px-2">
            {user.profile?.avatar ? (
              <img 
                src={user.profile.avatar} 
                alt="Avatar" 
                className="w-10 h-10 rounded-full object-cover border border-slate-700"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-slate-800 text-slate-300 font-bold flex items-center justify-center">
                {user.email[0].toUpperCase()}
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

      {/* FLOATING SUPPORT ASSISTANT */}
      <FloatingAiTutor />
    </div>
  );
}
