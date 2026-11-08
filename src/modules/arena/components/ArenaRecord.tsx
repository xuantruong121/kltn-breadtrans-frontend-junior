import React from "react";
import type { ArenaStats } from "@/lib/api/services/gamification.service";

/** The learner's arena record, then the rules in four short lines. */
export function ArenaRecord({ stats, isGuest, isLoading }: { stats: ArenaStats | undefined; isGuest: boolean; isLoading: boolean }) {
  const s = stats;
  return (
    <section aria-labelledby="record-title" className="flex flex-col rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 sm:p-6">
      <h2 id="record-title" className="text-lg font-bold text-slate-900 dark:text-slate-100">
        Thành tích của bạn
      </h2>
      {isGuest ? (
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Đăng nhập để lưu số trận thắng và chuỗi thắng của bạn.</p>
      ) : isLoading ? (
        <div className="mt-4 h-28 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" aria-hidden="true" />
      ) : !s || s.played === 0 ? (
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Chưa có trận nào. Thắng trận đầu tiên để nhận huy hiệu Đấu Sĩ Bất Bại.
        </p>
      ) : (
        <>
          <div className="mt-3 flex items-end gap-6">
            <p>
              <span className="block text-4xl font-extrabold tabular-nums text-slate-900 dark:text-slate-100">{s.winRate}%</span>
              <span className="text-sm text-slate-600 dark:text-slate-400">thắng trong {s.played} trận</span>
            </p>
            <p className="pb-1">
              <span className="block text-2xl font-extrabold tabular-nums text-slate-900 dark:text-slate-100">{s.currentWinStreak}</span>
              <span className="text-sm text-slate-600 dark:text-slate-400">trận thắng liên tiếp</span>
            </p>
          </div>
          <dl className="mt-4 grid grid-cols-3 gap-3 border-t border-slate-100 pt-4 text-sm dark:border-slate-800">
            <div>
              <dt className="text-slate-500 dark:text-slate-400">Thắng</dt>
              <dd className="font-bold tabular-nums text-emerald-700 dark:text-emerald-400">{s.wins}</dd>
            </div>
            <div>
              <dt className="text-slate-500 dark:text-slate-400">Thua</dt>
              <dd className="font-bold tabular-nums text-rose-700 dark:text-rose-400">{s.losses}</dd>
            </div>
            <div>
              <dt className="text-slate-500 dark:text-slate-400">Hoà</dt>
              <dd className="font-bold tabular-nums text-slate-900 dark:text-slate-100">{s.draws}</dd>
            </div>
            <div className="col-span-2">
              <dt className="text-slate-500 dark:text-slate-400">Bánh Mì từ đấu trường</dt>
              <dd className={`font-bold tabular-nums ${s.netBanh >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700 dark:text-rose-400"}`}>
                {s.netBanh > 0 ? "+" : ""}
                {s.netBanh.toLocaleString("vi-VN")}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500 dark:text-slate-400">Chuỗi dài nhất</dt>
              <dd className="font-bold tabular-nums text-slate-900 dark:text-slate-100">{s.longestWinStreak}</dd>
            </div>
          </dl>
        </>
      )}

      <h3 className="mt-6 text-sm font-bold text-slate-900 dark:text-slate-100">Cách tính điểm</h3>
      <ul className="mt-2 space-y-1.5 text-sm text-slate-700 dark:text-slate-300">
        <li>Mỗi câu đúng được 100 điểm, trả lời càng sớm thì thưởng thêm tới 50.</li>
        <li>Sai hoặc hết giờ thì câu đó 0 điểm. Câu cuối được nhân đôi điểm.</li>
        <li>Thắng nhận lại gấp đôi số cược, hoà thì hoàn cược.</li>
        <li>Rớt mạng có 15 giây để vào lại, quá thời gian thì xử thua.</li>
      </ul>
    </section>
  );
}
