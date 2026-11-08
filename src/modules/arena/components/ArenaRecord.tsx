import React from "react";
import { Medal, Wheat } from "lucide-react";
import type { ArenaStats } from "@/lib/api/services/gamification.service";
import { streakGoal, streakNote } from "../record";

/**
 * The learner's arena record, then the in-match rules. What a stake wins or
 * loses and the XP per answer are on the hero next to it, so they are not
 * repeated here.
 */
export function ArenaRecord({ stats, isGuest, isLoading }: { stats: ArenaStats | undefined; isGuest: boolean; isLoading: boolean }) {
  const s = stats;
  const share = (n: number) => (s && s.played > 0 ? `${(n / s.played) * 100}%` : "0%");
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
          <dl className="mt-4 grid grid-cols-3 gap-3">
            <div>
              <dt className="sr-only">Tỉ lệ thắng</dt>
              <dd className="text-3xl font-extrabold tabular-nums text-slate-900 dark:text-slate-100">{s.winRate ?? 0}%</dd>
              <dd className="text-sm text-slate-600 dark:text-slate-400">tỉ lệ thắng</dd>
            </div>
            <div>
              <dt className="sr-only">Chuỗi thắng hiện tại</dt>
              <dd className="text-3xl font-extrabold tabular-nums text-slate-900 dark:text-slate-100">{s.currentWinStreak}</dd>
              <dd className="text-sm text-slate-600 dark:text-slate-400">
                chuỗi thắng
                <span className="block text-xs text-slate-500 dark:text-slate-400">{streakNote(s.currentWinStreak, s.longestWinStreak)}</span>
              </dd>
            </div>
            <div>
              <dt className="sr-only">Bánh Mì thắng thua từ đấu trường</dt>
              <dd
                className={`inline-flex items-center gap-1 text-3xl font-extrabold tabular-nums ${
                  s.netBanh >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700 dark:text-rose-400"
                }`}
              >
                {s.netBanh > 0 ? "+" : ""}
                {s.netBanh.toLocaleString("vi-VN")}
                <Wheat size={18} strokeWidth={2.25} aria-hidden="true" />
              </dd>
              <dd className="text-sm text-slate-600 dark:text-slate-400">Bánh Mì từ đấu trường</dd>
            </div>
          </dl>

          <div className="mt-5">
            <div className="flex h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800" aria-hidden="true">
              <span className="bg-emerald-500" style={{ width: share(s.wins) }} />
              <span className="bg-slate-300 dark:bg-slate-600" style={{ width: share(s.draws) }} />
              <span className="bg-rose-500" style={{ width: share(s.losses) }} />
            </div>
            <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">
              {s.played} trận: <span className="font-semibold text-emerald-700 dark:text-emerald-400">{s.wins} thắng</span>
              {" · "}
              <span className="font-semibold text-slate-700 dark:text-slate-300">{s.draws} hoà</span>
              {" · "}
              <span className="font-semibold text-rose-700 dark:text-rose-400">{s.losses} thua</span>
            </p>
          </div>

          {(() => {
            const goal = streakGoal(s.currentWinStreak, s.longestWinStreak);
            return (
              <div className="mt-5 rounded-lg bg-amber-50 px-4 py-3 dark:bg-amber-950/30">
                <p className="flex items-center gap-2 text-sm font-semibold text-amber-900 dark:text-amber-200">
                  <Medal size={16} strokeWidth={2.25} aria-hidden="true" />
                  {goal.done ? "Đã có huy hiệu Đấu Sĩ Bất Bại" : "Mục tiêu: huy hiệu Đấu Sĩ Bất Bại"}
                </p>
                {goal.done ? (
                  <p className="mt-1 text-sm text-amber-900/80 dark:text-amber-200/80">
                    Bạn đã thắng {goal.target} trận liên tiếp. Huy hiệu nằm trong tủ huy hiệu bên dưới.
                  </p>
                ) : (
                  <>
                    <div
                      className="mt-2 h-2 overflow-hidden rounded-full bg-amber-100 dark:bg-amber-900/50"
                      role="progressbar"
                      aria-valuemin={0}
                      aria-valuemax={goal.target}
                      aria-valuenow={goal.value}
                      aria-label="Chuỗi thắng hiện tại"
                    >
                      <span className="block h-full bg-amber-500" style={{ width: `${(goal.value / goal.target) * 100}%` }} />
                    </div>
                    <p className="mt-1.5 text-sm text-amber-900/80 dark:text-amber-200/80">
                      {goal.value}/{goal.target} trận thắng liên tiếp, còn {goal.left} trận nữa.
                    </p>
                  </>
                )}
              </div>
            );
          })()}
        </>
      )}

      <div className="mt-auto pt-6">
        <h3 className="border-t border-slate-100 pt-4 text-sm font-bold text-slate-900 dark:border-slate-800 dark:text-slate-100">Luật trong trận</h3>
        <ul className="mt-2 space-y-1.5 text-sm text-slate-700 dark:text-slate-300">
          <li>Mỗi câu đúng được 100 điểm, trả lời càng sớm thì thưởng thêm tới 50.</li>
          <li>Sai hoặc hết giờ thì câu đó 0 điểm. Câu cuối được nhân đôi điểm.</li>
          <li>Rớt mạng có 15 giây để vào lại, quá thời gian thì xử thua.</li>
        </ul>
      </div>
    </section>
  );
}
