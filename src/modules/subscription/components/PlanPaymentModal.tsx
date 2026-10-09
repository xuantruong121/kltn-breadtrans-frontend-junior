"use client";

import React, { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  CreditCard,
  Loader2,
  QrCode,
  RotateCw,
  X,
  XCircle,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  formatVnd,
  PLAN_QUERY_KEYS,
  planService,
  type PlanPurchase,
} from "@/lib/api/services/plan.service";
import {
  isPaymentIntentExpired,
  resolvePaymentPollingInterval,
  shouldNotifyPaymentCompletion,
} from "../planLogic";
import { useModalAccessibility } from "@/hooks/useModalAccessibility";

export interface PlanPaymentModalProps {
  purchaseId: number | null;
  onClose: () => void;
  onReplaceSuccess?: (purchase: PlanPurchase) => void;
  onCreateNew?: () => void;
}

const emptySubscribe = () => () => {};

function formatCountdown(expiresAt: string | null | undefined, now: number) {
  if (!expiresAt) return null;
  const expires = new Date(expiresAt).getTime();
  if (!Number.isFinite(expires)) return null;
  const seconds = Math.max(0, Math.floor((expires - now) / 1000));
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

export const PlanPaymentModal: React.FC<PlanPaymentModalProps> = ({
  purchaseId,
  onClose,
  onCreateNew,
}) => {
  const router = useRouter();
  const isReady = useSyncExternalStore(emptySubscribe, () => true, () => false);
  const queryClient = useQueryClient();
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const confirmedNotifiedRef = useRef(false);
  const initialStatusRef = useRef<string | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  useModalAccessibility({
    isOpen: !!purchaseId,
    onClose,
    modalRef,
  });

  useEffect(() => {
    confirmedNotifiedRef.current = false;
    initialStatusRef.current = null;
  }, [purchaseId]);

  const {
    data: purchase,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: PLAN_QUERY_KEYS.purchaseDetail(purchaseId || 0),
    queryFn: () => planService.getPurchaseById(purchaseId!),
    enabled: !!purchaseId,
    refetchInterval: (query) => {
      const current = query.state.data;
      const rawExp =
        current?.payment?.paymentIntentExpiresAt ||
        current?.payment?.expiresAt ||
        current?.expiresAt;
      if (isPaymentIntentExpired(rawExp)) return false;
      return resolvePaymentPollingInterval(
        current?.payment?.status || current?.status,
      );
    },
  });

  const rawExpiresAt =
    purchase?.payment?.paymentIntentExpiresAt ||
    purchase?.payment?.expiresAt ||
    purchase?.expiresAt;
  const paymentStatus = purchase?.payment?.status || purchase?.status || "PENDING";
  const isCompleted = paymentStatus === "CONFIRMED" || paymentStatus === "COMPLETED";
  const isReviewRequired =
    paymentStatus === "REVIEW_REQUIRED" || paymentStatus === "DUPLICATE";
  const isRejected = paymentStatus === "REJECTED";
  const isReported = paymentStatus === "REPORTED";
  const isSuperseded =
    paymentStatus === "SUPERSEDED" ||
    purchase?.status === "SUPERSEDED" ||
    Boolean(purchase?.supersededByPurchaseId);
  const expiryMs = rawExpiresAt ? new Date(rawExpiresAt).getTime() : NaN;
  const deadlineExpired = Number.isFinite(expiryMs) && expiryMs <= now;
  const isIntentExpired =
    deadlineExpired ||
    isPaymentIntentExpired(rawExpiresAt) ||
    paymentStatus === "EXPIRED" ||
    purchase?.status === "EXPIRED";
  const countdown = formatCountdown(rawExpiresAt, now);

  useEffect(() => {
    if (!purchaseId || isCompleted || isIntentExpired) return;
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [isCompleted, isIntentExpired, purchaseId]);

  useEffect(() => {
    if (!purchase) return;
    if (!paymentStatus) return;

    if (initialStatusRef.current === null) {
      initialStatusRef.current = paymentStatus;
      if (isCompleted) return;
    }

    if (
      shouldNotifyPaymentCompletion(
        initialStatusRef.current,
        paymentStatus,
        confirmedNotifiedRef.current,
      )
    ) {
      confirmedNotifiedRef.current = true;
      toast.success("Thanh toán thành công! Gói PLUS đã được kích hoạt.", {
        id: `payment-confirmed-${purchase.id}`,
      });
      queryClient.invalidateQueries({ queryKey: PLAN_QUERY_KEYS.effectivePlan });
      queryClient.invalidateQueries({ queryKey: PLAN_QUERY_KEYS.catalog });
      queryClient.invalidateQueries({ queryKey: PLAN_QUERY_KEYS.vocabTopics });
      queryClient.invalidateQueries({ queryKey: PLAN_QUERY_KEYS.readingExercises });
      queryClient.invalidateQueries({ queryKey: PLAN_QUERY_KEYS.listeningPractices });
      queryClient.invalidateQueries({ queryKey: PLAN_QUERY_KEYS.speakingExercises });
      queryClient.invalidateQueries({ queryKey: PLAN_QUERY_KEYS.writingTopics });
      queryClient.invalidateQueries({ queryKey: PLAN_QUERY_KEYS.myPurchases });
    }
  }, [isCompleted, paymentStatus, purchase, queryClient]);

  const handleCopy = async (text: string, fieldName: string) => {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopiedField(fieldName);
      toast.success(`Đã sao chép ${fieldName}`);
      window.setTimeout(() => setCopiedField(null), 2500);
    } catch {
      toast.error("Không thể sao chép");
    }
  };

  const handleStartLearning = () => {
    onClose();
    router.push("/dashboard");
  };

  const handleViewHistory = () => {
    onClose();
    router.push("/hub?tab=account-plan");
  };

  if (!purchaseId || !isReady || typeof document === "undefined") return null;

  const transferCode =
    purchase?.bankInstructions?.transferCode || purchase?.payment?.transferCode || "";
  const modalTitle = isCompleted
    ? "Thanh toán thành công"
    : isReviewRequired
      ? "Thanh toán đang được kiểm tra"
      : isSuperseded
        ? "Phiên thanh toán đã được thay thế"
        : isRejected
          ? "Thanh toán không thành công"
          : isIntentExpired
            ? "Phiên thanh toán đã hết hạn"
            : "Thanh toán BreadTrans Plus";

  return createPortal(
    <AnimatePresence>
      <div
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-[2px]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="payment-modal-title"
        onClick={(event) => {
          if (event.target === event.currentTarget) onClose();
        }}
      >
        <motion.div
          ref={modalRef}
          tabIndex={-1}
          initial={{ opacity: 0, scale: 0.98, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: 8 }}
          transition={{ duration: 0.18 }}
          className="flex max-h-[min(94dvh,840px)] w-full max-w-[670px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.22)] outline-none dark:border-slate-800 dark:bg-slate-900"
        >
          <header className="flex shrink-0 items-center justify-between border-b border-slate-100 px-6 py-4.5 dark:border-slate-800">
            <div className="flex min-w-0 items-center gap-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-300">
                {isCompleted ? (
                  <CheckCircle2 size={21} aria-hidden="true" />
                ) : (
                  <CreditCard size={21} aria-hidden="true" />
                )}
              </div>
              <h2
                id="payment-modal-title"
                className="truncate text-lg sm:text-xl font-bold tracking-[-0.01em] text-slate-900 dark:text-slate-100"
              >
                {modalTitle}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng cửa sổ thanh toán"
              className="ml-3 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            >
              <X size={20} aria-hidden="true" />
            </button>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
            {isLoading && !purchase ? (
              <div className="space-y-4" aria-label="Đang tải thông tin thanh toán">
                <div className="grid gap-4 md:grid-cols-[250px_1fr]">
                  <div className="h-[300px] animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
                  <div className="space-y-3">
                    {[1, 2, 3, 4].map((item) => (
                      <div key={item} className="h-[62px] animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
                    ))}
                  </div>
                </div>
                <div className="h-[136px] animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
                <div className="h-[68px] animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
              </div>
            ) : isError && !purchase ? (
              <div className="space-y-3 py-12 text-center">
                <AlertCircle size={38} className="mx-auto text-rose-500" aria-hidden="true" />
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Không thể tải thông tin thanh toán
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Phiên thanh toán không tồn tại hoặc bạn không có quyền truy cập.
                </p>
                <button
                  type="button"
                  onClick={() => refetch()}
                  className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-slate-900 px-4 text-xs font-bold text-white transition-colors hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
                >
                  <RotateCw size={14} aria-hidden="true" />
                  Thử lại
                </button>
              </div>
            ) : isCompleted && purchase ? (
              <div className="space-y-6 py-6 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-300">
                  <CheckCircle2 size={42} aria-hidden="true" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100">
                    Thanh toán thành công
                  </h3>
                  <p className="mt-1.5 text-sm sm:text-base text-slate-600 dark:text-slate-400">
                    Gói BreadTrans Plus đã được kích hoạt trên tài khoản của bạn.
                  </p>
                </div>
                <div className="space-y-3.5 rounded-2xl bg-slate-50 p-5 text-left dark:bg-slate-800/60">
                  <div className="flex items-center justify-between gap-4 text-sm sm:text-base">
                    <span className="text-slate-500 dark:text-slate-400">Gói sử dụng</span>
                    <span className="font-bold text-slate-900 dark:text-slate-100">BreadTrans Plus</span>
                  </div>
                  <div className="flex items-center justify-between gap-4 text-sm sm:text-base">
                    <span className="text-slate-500 dark:text-slate-400">Thời hạn</span>
                    <span className="font-bold text-slate-900 dark:text-slate-100">{purchase.durationDays} ngày</span>
                  </div>
                  <div className="flex items-center justify-between gap-4 text-sm sm:text-base">
                    <span className="text-slate-500 dark:text-slate-400">Số tiền</span>
                    <span className="text-lg sm:text-xl font-black text-emerald-600 dark:text-emerald-300">{formatVnd(purchase.amountVnd)}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={handleStartLearning}
                    className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm sm:text-base font-bold text-white transition-colors hover:bg-blue-700 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  >
                    Bắt đầu học với PLUS
                    <ArrowRight size={18} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="min-h-12 rounded-xl border border-slate-200 px-6 text-sm sm:text-base font-bold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    Đóng
                  </button>
                </div>
              </div>
            ) : isSuperseded && purchase ? (
              <StateMessage
                icon={<RotateCw size={30} aria-hidden="true" />}
                tone="neutral"
                title="Phiên thanh toán này đã được thay thế"
                description="Phiên này không còn hiệu lực. Hãy đóng cửa sổ và sử dụng phiên mới nhất."
                action={<CloseButton onClose={onClose} />}
              />
            ) : isReviewRequired && purchase ? (
              <StateMessage
                icon={<AlertCircle size={30} aria-hidden="true" />}
                tone="warning"
                title="Thanh toán đang được kiểm tra"
                description="Bạn không cần chuyển khoản lại. Hệ thống sẽ cập nhật trạng thái sau khi hoàn tất kiểm tra."
                action={
                  <div className="flex flex-col justify-center gap-2 sm:flex-row">
                    <button
                      type="button"
                      onClick={handleViewHistory}
                      className="min-h-10 rounded-xl border border-slate-200 px-4 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      Xem lịch sử thanh toán
                    </button>
                    <CloseButton onClose={onClose} />
                  </div>
                }
              />
            ) : isRejected && purchase ? (
              <StateMessage
                icon={<XCircle size={30} aria-hidden="true" />}
                tone="danger"
                title="Thanh toán không thành công"
                description={purchase.payment?.rejectionReason || "Không tìm thấy giao dịch chuyển khoản tương ứng."}
                action={<CloseButton onClose={onClose} />}
              />
            ) : isIntentExpired && purchase ? (
              <StateMessage
                icon={<Clock size={30} aria-hidden="true" />}
                tone="neutral"
                title="Phiên thanh toán đã hết hạn"
                description="Phiên thanh toán này đã hết hiệu lực. Bạn có thể tạo phiên mới để tiếp tục nâng cấp."
                action={
                  <div className="flex flex-col justify-center gap-2 sm:flex-row">
                    <button
                      type="button"
                      onClick={onCreateNew || onClose}
                      className="min-h-10 rounded-xl bg-blue-600 px-4 text-xs font-bold text-white transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    >
                      Tạo phiên thanh toán mới
                    </button>
                    <CloseButton onClose={onClose} />
                  </div>
                }
              />
            ) : purchase ? (
              <ActivePaymentView
                purchase={purchase}
                transferCode={transferCode}
                copiedField={copiedField}
                onCopy={handleCopy}
                countdown={countdown}
                isReported={isReported}
              />
            ) : null}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body,
  );
};

function CloseButton({ onClose }: { onClose: () => void }) {
  return (
    <button
      type="button"
      onClick={onClose}
      className="min-h-10 rounded-xl border border-slate-200 px-4 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
    >
      Đóng
    </button>
  );
}

function StateMessage({
  icon,
  tone,
  title,
  description,
  action,
}: {
  icon: React.ReactNode;
  tone: "neutral" | "warning" | "danger";
  title: string;
  description: string;
  action: React.ReactNode;
}) {
  const toneClass = {
    neutral: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300",
    warning: "bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-300",
    danger: "bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-300",
  }[tone];

  return (
    <div className="space-y-4 py-10 text-center">
      <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full ${toneClass}`}>
        {icon}
      </div>
      <div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">{title}</h3>
        <p className="mx-auto mt-1 max-w-[38ch] text-sm leading-relaxed text-slate-600 dark:text-slate-400">{description}</p>
      </div>
      {action}
    </div>
  );
}

function ActivePaymentView({
  purchase,
  transferCode,
  copiedField,
  onCopy,
  countdown,
  isReported,
}: {
  purchase: PlanPurchase;
  transferCode: string;
  copiedField: string | null;
  onCopy: (text: string, fieldName: string) => void;
  countdown: string | null;
  isReported: boolean;
}) {
  const bank = purchase.bankInstructions;
  const accountNumber = bank?.accountNumber || "";
  const accountName = bank?.accountName || "";

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="grid items-stretch gap-4 md:grid-cols-[250px_1fr] sm:gap-5">
        <section className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-slate-50/80 p-5 text-center dark:border-slate-700 dark:bg-slate-800/50 sm:p-5.5">
          {bank?.vietQrUrl ? (
            <img
              src={bank.vietQrUrl}
              alt="Mã QR thanh toán"
              className="h-[210px] w-[210px] sm:h-[225px] sm:w-[225px] rounded-xl bg-white object-contain p-2 shadow-sm"
              loading="eager"
            />
          ) : (
            <div className="flex h-[210px] w-[210px] sm:h-[225px] sm:w-[225px] items-center justify-center rounded-xl bg-white text-slate-400 dark:bg-slate-900 dark:text-slate-500">
              <QrCode size={64} aria-hidden="true" />
            </div>
          )}
          <p className="mt-3.5 text-sm font-bold text-slate-800 dark:text-slate-100">
            Quét mã QR bằng ứng dụng ngân hàng
          </p>
          <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            Ngân hàng, số tiền và nội dung sẽ được điền tự động
          </p>
        </section>

        <section className="grid content-between gap-2.5 sm:gap-3">
          <PaymentDetail label="Ngân hàng" value={bank?.bankName || "-"} />
          <PaymentDetail
            label="Số tài khoản"
            value={accountNumber || "-"}
            mono
            valueClassName="text-base sm:text-[17px] font-bold tracking-wider"
            action={
              <CopyButton
                label="Sao chép số tài khoản"
                copied={copiedField === "Số tài khoản"}
                onClick={() => onCopy(accountNumber, "Số tài khoản")}
              />
            }
          />
          <PaymentDetail label="Chủ tài khoản" value={accountName || "-"} />
          <PaymentDetail
            label="Số tiền"
            value={formatVnd(purchase.amountVnd)}
            valueClassName="text-xl sm:text-2xl font-black text-blue-700 dark:text-blue-300"
          />
        </section>
      </div>

      <section className="rounded-2xl border border-orange-200 bg-orange-50/90 p-4 sm:p-5 dark:border-orange-900/60 dark:bg-orange-950/30">
        <div className="flex items-start gap-3">
          <AlertTriangle size={20} className="mt-0.5 shrink-0 text-orange-600 dark:text-orange-400" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <h3 className="text-sm sm:text-base font-bold text-orange-950 dark:text-orange-100">
              Nội dung chuyển khoản (bắt buộc)
            </h3>
            <div className="mt-2.5 flex items-center gap-3 rounded-xl border border-orange-200 bg-white p-2.5 sm:p-3 dark:border-orange-900/70 dark:bg-slate-900/70">
              <code className="min-w-0 flex-1 truncate px-1 font-mono text-base sm:text-lg font-black tracking-wider text-slate-900 dark:text-slate-100">
                {transferCode || "-"}
              </code>
              <button
                type="button"
                onClick={() => onCopy(transferCode, "nội dung chuyển khoản")}
                aria-label="Sao chép nội dung chuyển khoản"
                className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-lg bg-orange-100 px-3.5 py-2 text-xs sm:text-sm font-bold text-orange-900 transition-colors hover:bg-orange-200 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 dark:bg-orange-950/70 dark:text-orange-200 dark:hover:bg-orange-900"
              >
                {copiedField === "nội dung chuyển khoản" ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
                Sao chép
              </button>
            </div>
            <p className="mt-2 text-xs sm:text-[13px] leading-relaxed text-orange-800/90 dark:text-orange-200/90">
              Không chỉnh sửa nội dung chuyển khoản. Hệ thống có thể không tự động xác nhận nếu nội dung bị thay đổi.
            </p>
          </div>
        </div>
      </section>

      <section className="flex items-center gap-3.5 rounded-2xl border border-sky-200 bg-sky-50/90 p-4 sm:p-4.5 dark:border-sky-900/70 dark:bg-sky-950/30">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-sky-600 shadow-sm dark:bg-slate-900 dark:text-sky-300">
          {isReported ? <Loader2 size={19} className="animate-spin" aria-hidden="true" /> : <Clock size={19} aria-hidden="true" />}
        </div>
        <div className="min-w-0 text-sky-950 dark:text-sky-100">
          <p className="text-sm sm:text-base font-bold">
            {isReported ? "Đã nhận giao dịch, đang xác nhận" : "Hệ thống sẽ tự động xác nhận sau khi nhận được giao dịch"}
          </p>
          <p className="mt-0.5 text-xs sm:text-[13px] font-medium leading-relaxed text-sky-800 dark:text-sky-200">
            {countdown ? `Phiên thanh toán còn: ${countdown}` : "Vui lòng hoàn tất chuyển khoản trong phiên hiện tại."}
          </p>
        </div>
      </section>
    </div>
  );
}

function PaymentDetail({
  label,
  value,
  mono = false,
  action,
  valueClassName = "",
}: {
  label: string;
  value: string;
  mono?: boolean;
  action?: React.ReactNode;
  valueClassName?: string;
}) {
  return (
    <div className="flex min-h-[62px] items-center justify-between gap-3 rounded-xl bg-slate-50 px-4 py-2.5 dark:bg-slate-800/60">
      <div className="min-w-0">
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{label}</p>
        <p className={`mt-0.5 truncate text-[15px] sm:text-base font-bold text-slate-900 dark:text-slate-100 ${mono ? "font-mono tracking-wide" : ""} ${valueClassName}`}>
          {value}
        </p>
      </div>
      {action}
    </div>
  );
}

function CopyButton({
  label,
  copied,
  onClick,
}: {
  label: string;
  copied: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white"
    >
      {copied ? <Check size={16} className="text-emerald-600 dark:text-emerald-300" aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
    </button>
  );
}
