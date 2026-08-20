"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { 
  LayoutDashboard, 
  Users, 
  PenTool, 
  LogOut, 
  FileText, 
  GraduationCap, 
  ShoppingBag, 
  Coins,
  BookOpen,
  Layers,
  Gamepad2,
  Mic
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { useSyncExternalStore, useEffect } from "react";
import dynamic from "next/dynamic";

const FloatingAiTutor = dynamic(() => import("@/components/FloatingAiTutor"), { ssr: false });

const NAV_ITEMS = [
  { id: "overview", href: "/admin", label: "Tổng quan", icon: LayoutDashboard },
  { id: "courses", href: "/admin/courses", label: "Khóa học & Lớp", icon: BookOpen },
  { id: "vocab", href: "/admin/vocab", label: "Từ vựng (Flashcard)", icon: Layers },
  { id: "grammar", href: "/admin/grammar", label: "Ngữ pháp (Video)", icon: GraduationCap },
  { id: "practice", href: "/admin/practice", label: "Luyện tập (Bánh mì)", icon: Gamepad2 },
  { id: "speaking", href: "/admin/speaking", label: "Luyện phát âm AI", icon: Mic },
  { id: "quizzes", href: "/admin/quizzes", label: "Đề thi & Quiz", icon: PenTool },
  { id: "market", href: "/admin/market", label: "Vật phẩm Market", icon: ShoppingBag },
  { id: "currency", href: "/admin/currency", label: "Giao dịch Bánh Mì", icon: Coins },
  { id: "ai", href: "/admin/ai-tools", label: "Công cụ AI (PDF, Sinh đề)", icon: FileText },
  { id: "users", href: "/admin/users", label: "Người dùng", icon: Users },
];

const emptySubscribe = () => () => {};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  const isReady = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  useEffect(() => {
    if (isReady && (!user || (user.role !== 'ADMIN' && user.role !== 'TEACHER'))) {
      router.push("/");
    }
  }, [isReady, user, router]);

  if (!isReady || !user) return null;

  return (
    <div className="flex h-[100dvh] bg-slate-50 overflow-hidden text-slate-800">
      {/* SIDEBAR */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col">
        <div className="p-6 text-2xl font-bold text-white border-b border-slate-800 flex items-center gap-2">
          <Link href="/admin">
            <Image src="/logo.png" alt="BreadTrans Logo" width={140} height={70} priority style={{ width: "auto", height: "auto" }} className="object-contain brightness-0 invert" />
          </Link>
          <span className="text-junior-blue text-sm bg-blue-900/50 px-2 py-1 rounded">CMS</span>
        </div>
        <nav className="flex-1 p-4 flex flex-col gap-2">
          {NAV_ITEMS.map((item) => {
            const isActive = item.href === "/admin" 
              ? pathname === "/admin" 
              : pathname.startsWith(item.href);
              
            return (
              <Link 
                key={item.id} 
                href={item.href}
                className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                  isActive 
                    ? "bg-blue-600 text-white shadow-md shadow-blue-500/20" 
                    : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
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

      {/* FLOATING SUPPORT ASSISTANT */}
      <FloatingAiTutor />
    </div>
  );
}
