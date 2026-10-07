import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { AccountHub } from "@/components/profile/AccountHub";

export default function StudentProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col justify-center items-center h-96 gap-3">
          <Loader2 className="animate-spin text-amber-500" size={40} />
          <span className="text-xs font-bold text-slate-400">Đang tải thông tin tài khoản...</span>
        </div>
      }
    >
      <AccountHub />
    </Suspense>
  );
}
