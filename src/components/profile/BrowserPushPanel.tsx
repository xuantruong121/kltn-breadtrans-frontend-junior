"use client";

import { Loader2 } from "lucide-react";
import toast from "react-hot-toast";

import { pushStateText } from "@/lib/push/pushLogic";
import { useBrowserPush } from "@/lib/push/useBrowserPush";

const buttonBase =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold disabled:opacity-60";

/** "Thông báo trình duyệt trên thiết bị này": turn Web Push on or off for this browser, send a test. */
export function BrowserPushPanel() {
  const { state, busy, enable, disable, sendTest } = useBrowserPush();

  const turnOn = async () => {
    const outcome = await enable();
    if (outcome === "on") toast.success("Đã bật thông báo trình duyệt.");
    else if (outcome === "denied") toast.error("Bạn đã chặn thông báo. Hãy cho phép lại trong trình duyệt.");
    else if (outcome === "dismissed") toast("Bạn chưa cho phép thông báo.");
    else toast.error("Chưa bật được thông báo. Vui lòng thử lại.");
  };
  const turnOff = async () => {
    await disable().catch(() => undefined);
    toast.success("Đã tắt thông báo trên trình duyệt này.");
  };
  const test = async () => {
    const sent = await sendTest().catch(() => -1);
    if (sent > 0) toast.success("Đã gửi thông báo thử. Thông báo sẽ hiện ở góc màn hình.");
    else toast.error("Chưa gửi được thông báo thử. Hãy tắt rồi bật lại.");
  };

  const text = state === "loading" ? { status: "Đang kiểm tra trình duyệt…" } : pushStateText(state);

  return (
    <section aria-labelledby="browser-push-heading" className="space-y-3">
      <div>
        <h2 id="browser-push-heading" className="text-base font-bold text-slate-900 dark:text-slate-100">
          Thông báo trình duyệt trên thiết bị này
        </h2>
        <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-400">
          Nhận nhắc học, báo cáo tuần và nhắc gói sắp hết hạn ở góc màn hình, kể cả khi đã đóng BreadTrans.
          Mỗi trình duyệt bật riêng.
        </p>
      </div>

      <p role="status" className="text-sm font-semibold text-slate-800 dark:text-slate-200">
        {text.status}
      </p>
      {text.help && <p className="text-sm text-slate-600 dark:text-slate-400">{text.help}</p>}

      {(state === "off" || state === "on") && (
        <div className="flex flex-wrap gap-2">
          {state === "off" ? (
            <button
              type="button"
              onClick={turnOn}
              disabled={busy}
              className={`${buttonBase} bg-blue-700 text-white hover:bg-blue-800`}
            >
              {busy && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
              Bật thông báo
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={test}
                disabled={busy}
                className={`${buttonBase} bg-blue-700 text-white hover:bg-blue-800`}
              >
                {busy && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
                Gửi thử
              </button>
              <button
                type="button"
                onClick={turnOff}
                disabled={busy}
                className={`${buttonBase} border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800`}
              >
                Tắt
              </button>
            </>
          )}
        </div>
      )}

      {state === "on" && (
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Đã gửi thử mà không thấy gì trên Windows: mở Cài đặt → Hệ thống → Thông báo, cho phép trình duyệt và tắt
          chế độ Tập trung (Không làm phiền).
        </p>
      )}
    </section>
  );
}
