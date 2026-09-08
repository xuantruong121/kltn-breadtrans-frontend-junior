import { AppHeader } from "@/components/navigation/AppHeader";
import { PublicFooter } from "@/components/public/PublicFooter";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-[#fbfaf8] text-slate-800 selection:bg-amber-600 selection:text-white">
      <AppHeader />
      <main className="flex-1">
        {children}
      </main>
      <PublicFooter />
    </div>
  );
}
