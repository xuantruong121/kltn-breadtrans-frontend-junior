import { AppHeader } from "@/components/navigation/AppHeader";
import { AppFooter } from "@/components/navigation/AppFooter";
import { BackToTop } from "@/components/navigation/BackToTop";
import { MobileBottomNav } from "@/components/navigation/MobileBottomNav";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-[100dvh] flex flex-col bg-[#fbfaf8] text-slate-800 selection:bg-amber-600 selection:text-white">
      <AppHeader />
      <main className="flex-1 min-w-0 pb-[calc(4.5rem+env(safe-area-inset-bottom))] lg:pb-0">
        {children}
      </main>
      <AppFooter />
      <BackToTop />
      <MobileBottomNav />
    </div>
  );
}
