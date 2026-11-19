import { NotificationIcon } from "@/components/notifications/NotificationIcon";

// What BreadTrans sends and when, as scheduled in the backend
// (src/jobs/system-jobs.scheduler.ts, notifications.cron.ts, plan-expiry-message.ts,
// promo.logic.ts WINBACK_*, study-reminder.logic.ts). Keep in step with those.
const KINDS = [
  {
    type: "study_reminder",
    name: "Nhắc học",
    when: "Khi bạn có học trong 14 ngày qua mà hôm nay chưa học. Gửi vào giờ bạn hay học, 20:00 nếu chưa rõ; không gửi từ 22:00 đến 7:00.",
  },
  {
    type: "vocab_review",
    name: "Ôn từ vựng",
    when: "Khi có từ trong Flashcard đến hạn ôn.",
  },
  {
    type: "weekly_report",
    name: "Báo cáo tuần",
    when: "Thứ Hai, 08:00: tuần trước bạn luyện bao nhiêu bài và tuần này nên ưu tiên kỹ năng nào.",
  },
  {
    type: "plan_expiry",
    name: "Gói học",
    when: "09:00, khi gói còn 7, 3, 1 ngày và vào ngày hết hạn.",
  },
  {
    type: "winback",
    name: "Ưu đãi quay lại",
    when: "3 ngày sau khi gói đã mua hết hạn mà bạn chưa mua lại: mã giảm 20%, dùng trong 7 ngày.",
  },
  {
    type: "NEW_MESSAGE",
    name: "Tin nhắn và phản hồi",
    when: "Ngay khi có: kết quả đổi quà ở Cửa hàng, tin nhắn từ quản trị viên, trả lời góp ý và báo lỗi.",
  },
] as const;

/** "BreadTrans gửi gì": the kinds of notification and when each is sent. */
export function NotificationKinds() {
  return (
    <section aria-labelledby="notification-kinds-heading">
      <h2 id="notification-kinds-heading" className="text-base font-bold text-slate-900 dark:text-slate-100">
        BreadTrans gửi gì
      </h2>
      <dl className="mt-3 divide-y divide-slate-200 border-y border-slate-200 dark:divide-slate-800 dark:border-slate-800">
        {KINDS.map((kind) => (
          <div key={kind.type} className="flex gap-3 py-3">
            <NotificationIcon type={kind.type} size={16} className="mt-0.5 shrink-0 text-slate-500 dark:text-slate-400" />
            <div className="min-w-0">
              <dt className="text-sm font-semibold text-slate-900 dark:text-slate-100">{kind.name}</dt>
              <dd className="mt-0.5 text-sm leading-6 text-slate-600 dark:text-slate-400">{kind.when}</dd>
            </div>
          </div>
        ))}
      </dl>
    </section>
  );
}
