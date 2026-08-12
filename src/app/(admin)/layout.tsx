"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { LayoutDashboard, Users, BookCopy, PenTool, LogOut, FileText } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";

const ADMIN_NAV = [
  { id: "dashboard", href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { id: "courses", href: "/admin/courses", label: "Quản lý Khóa học", icon: BookCopy },
  { id: "quizzes", href: "/admin/quizzes", label: "Quản lý Đề thi", icon: PenTool },
  { id: "ai", href: "/admin/ai-tools", label: "Công cụ AI (PDF, Sinh đề)", icon: FileText },
  { id: "users", href: "/admin/users", label: "Học viên", icon: Users },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  // Only allow Admin or Teacher (basic check)
  // if (user && user.role !== "ADMIN" && user.role !== "TEACHER") return <div>Access Denied</div>;

  return (
    <div className="flex h-[100dvh] bg-slate-50 overflow-hidden text-slate-800">
      {/* SIDEBAR */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col">
        <div className="p-6 text-2xl font-bold text-white border-b border-slate-800">
          BreadTrans<span className="text-junior-blue ml-2">CMS</span>
        </div>
        <nav className="flex-1 p-4 flex flex-col gap-2">
          {ADMIN_NAV.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link 
                key={item.id} 
                href={item.href}
                className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                  isActive ? "bg-junior-blue text-white" : "hover:bg-slate-800 hover:text-white"
                }`}
              >
                <item.icon size={20} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-slate-800">
          <div className="mb-4 truncate px-2 text-sm">
             {user?.email}
          </div>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 p-2 bg-slate-800 hover:bg-red-500 hover:text-white rounded-lg transition-colors text-sm"
          >
            <LogOut size={16} /> Đăng xuất
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
