"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  User,
  Crown,
  KeyRound,
  Smartphone,
  Laptop,
  ShoppingBag,
  LogOut,
  Settings,
  Zap,
  ReceiptText,
  ChevronRight,
  Eye,
  EyeOff,
  Loader2,
  Camera,
  CheckCircle2,
  Medal,
  AlertCircle,
  RotateCcw,
  Backpack,
  Activity,
  Award,
} from "lucide-react";

import { useAuthStore } from "@/stores/authStore";
import { useGamificationStore } from "@/stores/gamificationStore";
import {
  planService,
  formatVnd,
  PLAN_QUERY_KEYS,
} from "@/lib/api/services/plan.service";
import {
  resolveEffectivePlanDisplay,
  getPaymentStatusBadgeInfo,
  calculateSubscriptionDaysRemaining,
} from "@/modules/subscription/planLogic";
import { PlanPaymentModal } from "@/modules/subscription/components/PlanPaymentModal";
import { UserAvatarWithFrame, AddressCombobox } from "@/components/ui";
import { LearningProgressTab } from "@/components/profile/LearningProgressTab";
import { DiagnosticResultTab } from "@/components/profile/DiagnosticResultTab";
import { MARKET_ITEMS } from "@/modules/market/services/marketData";
import { useApiQuery } from "@/hooks/useApiQuery";
import { resizeAvatarImage } from "@/lib/avatar/resizeAvatarImage";
import { isValidVietnamPhone } from "@/lib/utils/vietnamPhone";
import axiosClient from "@/lib/api/axiosClient";
import { userService } from "@/lib/api/services/user.service";
import { locationService } from "@/lib/api/services/location.service";
import {
  resolveAvatarFrame,
  resolveUserBadge,
} from "@/lib/avatar/avatarCustomizationLogic";
import { getApiErrorMessage } from "@/lib/utils/apiError";

export type AccountTabKey =
  | "account-profile"
  | "account-plan"
  | "account-password"
  | "account-device"
  | "account-inventory"
  | "learning-progress"
  | "diagnostic-result";

const TAB_ALIASES: Record<string, AccountTabKey> = {
  "account-profile": "account-profile",
  "account-plan": "account-plan",
  "account-password": "account-password",
  "account-device": "account-device",
  "account-inventory": "account-inventory",
  "learning-progress": "learning-progress",
  "diagnostic-result": "diagnostic-result",
  "diagnostic": "diagnostic-result",
};

function getInitials(name?: string | null): string {
  if (!name) return "BT";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function AccountHub() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const user = useAuthStore((state) => state.user);
  const setProfile = useAuthStore((state) => state.setProfile);
  const logout = useAuthStore((state) => state.logout);
  const {
    unlockedItems,
    equippedAvatarFrame,
    equippedBadge,
    equipAvatarFrame,
    equipBadge,
  } = useGamificationStore();

  // Resolve active tab from URL query param
  const rawTab = searchParams.get("tab") || "account-profile";
  // Accounts with no password of their own (Google sign-up) have nothing to change, so the tab is hidden.
  const { data: withoutPassword = false } = useApiQuery(
    ["userProfile", user?.id],
    "/users/profile",
    {
      // Only an explicit false hides it; an unknown answer keeps the tab.
    select: (res: any) => res?.hasPassword === false,
      enabled: !!user?.id,
    }
  );
  const requestedTab: AccountTabKey = TAB_ALIASES[rawTab] || "account-profile";
  const activeTab: AccountTabKey =
    requestedTab === "account-password" && withoutPassword ? "account-profile" : requestedTab;

  const handleTabChange = (key: AccountTabKey) => {
    // Preserve current route while updating search params
    const currentPath = typeof window !== "undefined" ? window.location.pathname : "/hub";
    router.replace(`${currentPath}?tab=${key}`, { scroll: false });
  };

  const handleLogout = async () => {
    try {
      // Revoke this device session server-side before removing the browser
      // session, while retaining a safe local fallback for network failures.
      await axiosClient.post("/auth/logout");
    } catch {
      // Local logout remains mandatory even when the request cannot complete.
    } finally {
      queryClient.clear();
      logout();
      router.replace("/");
    }
  };

  // ── Queries & State for Profile Tab ──────────────────────────
  const { data: profileData } = useApiQuery(
    ["userProfile", user?.id],
    "/users/profile",
    {
      select: (res: any) => res?.profile || {},
      enabled: !!user?.id,
    }
  );

  const shippingProfileQuery = useQuery({
    queryKey: ["shippingProfile", user?.id],
    queryFn: () => userService.getShippingProfile(),
    enabled: !!user?.id,
  });

  const [formData, setFormData] = useState({
    fullName: "",
    avatar: "",
  });

  const [shippingData, setShippingData] = useState({
    recipientName: "",
    phone: "",
    provinceCode: "",
    wardCode: "",
    addressLine: "",
  });

  const provincesQuery = useQuery({
    queryKey: ["vietnamProvinces"],
    queryFn: () => locationService.getProvinces(),
    staleTime: 1000 * 60 * 60 * 12,
  });

  const wardsQuery = useQuery({
    queryKey: ["vietnamWards", shippingData.provinceCode],
    queryFn: () => locationService.getWards(shippingData.provinceCode),
    enabled: !!shippingData.provinceCode,
    staleTime: 1000 * 60 * 60 * 12,
  });

  useEffect(() => {
    if (profileData || user) {
      setFormData({
        fullName: profileData?.fullName || user?.profile?.fullName || "",
        avatar: profileData?.avatar || user?.profile?.avatar || "",
      });
    }
  }, [profileData, user]);

  // Fill the shipping form only when the server's shipping data itself changes.
  // Re-running on every profile/user change wiped what the learner had typed
  // whenever a save refreshed the profile but the shipping update was rejected.
  const hydratedShippingAt = useRef(0);
  useEffect(() => {
    if (shippingProfileQuery.data && shippingProfileQuery.dataUpdatedAt !== hydratedShippingAt.current) {
      hydratedShippingAt.current = shippingProfileQuery.dataUpdatedAt;
      const sp = shippingProfileQuery.data;
      setShippingData({
        recipientName:
          sp.recipientName || profileData?.fullName || user?.profile?.fullName || "",
        phone: sp.phoneDisplay || sp.phone || profileData?.phone || user?.profile?.phone || "",
        provinceCode: sp.provinceCode || "",
        wardCode: sp.wardCode || "",
        addressLine: sp.addressLine || "",
      });
    }
  }, [shippingProfileQuery.data, shippingProfileQuery.dataUpdatedAt, profileData, user]);

  const [isSaving, setIsSaving] = useState(false);
  const [phoneError, setPhoneError] = useState("");

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Name/avatar and the shipping address are two separate endpoints, so they
    // cannot be saved atomically. Everything checkable is validated here first,
    // before either request, so a typo never leaves a half-saved form.
    const hasAnyShippingInput =
      shippingData.recipientName.trim() ||
      shippingData.phone.trim() ||
      shippingData.provinceCode ||
      shippingData.wardCode ||
      shippingData.addressLine.trim();

    if (hasAnyShippingInput) {
      if (
        !shippingData.recipientName.trim() ||
        !shippingData.phone.trim() ||
        !shippingData.provinceCode ||
        !shippingData.wardCode ||
        !shippingData.addressLine.trim()
      ) {
        toast.error(
          "Vui lòng điền đầy đủ: Tên người nhận, Số điện thoại, Tỉnh/Thành phố, Phường/Xã và Địa chỉ chi tiết.",
          { duration: 4000 }
        );
        return;
      }
      if (!isValidVietnamPhone(shippingData.phone)) {
        setPhoneError("Số điện thoại không hợp lệ. Vui lòng nhập số di động Việt Nam (vd: 0987654321 hoặc +84987654321).");
        document.getElementById("shipping-phone")?.focus();
        return;
      }
    }

    setIsSaving(true);
    let shippingSaved = false;
    try {
      // 1. Địa chỉ nhận quà (server vẫn kiểm lại; nếu bị từ chối thì chưa có gì được lưu).
      if (hasAnyShippingInput) {
        await userService.updateShippingProfile({
          recipientName: shippingData.recipientName.trim(),
          phone: shippingData.phone.trim(),
          provinceCode: shippingData.provinceCode.trim(),
          wardCode: shippingData.wardCode.trim(),
          addressLine: shippingData.addressLine.trim(),
        });
        shippingSaved = true;
        queryClient.invalidateQueries({ queryKey: ["shippingProfile", user?.id] });
      }

      // 2. Cập nhật thông tin profile cơ bản (Họ tên, avatar)
      // Called directly (not via useApiMutation) so a failure shows one toast, from the catch below.
      const updatedProfile = await axiosClient.patch("/users/profile", {
        fullName: formData.fullName,
        avatar: formData.avatar,
      });
      queryClient.invalidateQueries({ queryKey: ["userProfile"] });
      if (updatedProfile) setProfile(updatedProfile as any);

      toast.success("Cập nhật thông tin thành công!");
    } catch (err: any) {
      const errCode = err?.response?.data?.code;
      const serverMessage = getApiErrorMessage(err, "Không thể cập nhật thông tin. Vui lòng thử lại.");
      if (errCode === "INVALID_VIETNAM_PHONE") {
        setPhoneError("Số điện thoại không hợp lệ. Vui lòng nhập số di động Việt Nam (vd: 0987654321 hoặc +84987654321).");
        document.getElementById("shipping-phone")?.focus();
      } else if (errCode === "WARD_PROVINCE_MISMATCH") {
        toast.error("Phường/xã đã chọn không thuộc tỉnh/thành phố tương ứng.");
      } else if (errCode === "INVALID_PROVINCE") {
        toast.error("Mã tỉnh/thành phố không hợp lệ.");
      } else if (shippingSaved) {
        // Say exactly what happened: the address is stored, the name/avatar is not.
        toast.error(
          `Đã lưu địa chỉ nhận quà, nhưng chưa lưu được tên/ảnh đại diện: ${serverMessage || "vui lòng thử lại."}`,
          { duration: 5000 }
        );
      } else {
        toast.error(serverMessage);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      toast.error("Vui lòng chọn ảnh dung lượng dưới 3MB");
      return;
    }
    // The avatar is saved as a data URL inside the JSON body, so shrink it to a small
    // square first; a full-size photo exceeds the server's request size limit.
    resizeAvatarImage(file)
      .then((dataUrl) => {
        setFormData((prev) => ({ ...prev, avatar: dataUrl }));
        toast.success("Đã chọn ảnh đại diện mới. Bấm 'Lưu thay đổi' để lưu lại!");
      })
      .catch(() => toast.error("Không đọc được ảnh này. Vui lòng chọn ảnh JPG, PNG hoặc WebP khác."));
  };

  // ── Queries & State for Subscription Plan Tab ────────────────
  const { data: effectivePlan } = useQuery({
    queryKey: PLAN_QUERY_KEYS.effectivePlan,
    queryFn: planService.getEffectivePlan,
    enabled: !!user,
  });

  const {
    data: purchases,
    isLoading: isLoadingPurchases,
    isError: isPurchasesError,
    refetch: refetchPurchases,
  } = useQuery({
    queryKey: PLAN_QUERY_KEYS.myPurchases,
    queryFn: planService.getMyPurchases,
    enabled: !!user,
  });

  const [selectedPurchaseId, setSelectedPurchaseId] = useState<number | null>(null);

  const activePurchases = useMemo(
    () => (purchases ?? []).filter((purchase) => purchase.isActivePaymentIntent === true),
    [purchases],
  );
  const reviewPurchases = useMemo(
    () =>
      (purchases ?? []).filter((purchase) =>
        ["REVIEW_REQUIRED", "DUPLICATE"].includes(purchase.payment?.status),
      ),
    [purchases],
  );
  const successfulPurchases = useMemo(
    () =>
      (purchases ?? []).filter(
        (purchase) =>
          purchase.payment?.status === "CONFIRMED" || purchase.status === "COMPLETED",
      ),
    [purchases],
  );

  const planDisplay = resolveEffectivePlanDisplay(effectivePlan);

  const daysRemaining = useMemo(() => {
    if (!effectivePlan?.isPaid || !effectivePlan?.subscription?.endsAt) return null;
    return calculateSubscriptionDaysRemaining(effectivePlan.subscription.endsAt);
  }, [effectivePlan]);

  const daysRemainingText = daysRemaining !== null ? `${daysRemaining} ngày` : "-";

  // ── State for Password Tab ──────────────────────────────────
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordFieldErrors, setPasswordFieldErrors] = useState<Partial<Record<keyof typeof passwordForm, string>>>({});
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const updatePasswordField = (field: keyof typeof passwordForm, value: string) => {
    setPasswordForm((previous) => ({ ...previous, [field]: value }));
    setPasswordFieldErrors((previous) => ({ ...previous, [field]: undefined }));
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Validation runs here instead of the browser's native bubbles (the form is noValidate).
    const fieldErrors: Partial<Record<keyof typeof passwordForm, string>> = {};
    if (!passwordForm.currentPassword) fieldErrors.currentPassword = "Vui lòng nhập mật khẩu hiện tại.";
    if (!passwordForm.newPassword) fieldErrors.newPassword = "Vui lòng nhập mật khẩu mới.";
    else if (passwordForm.newPassword.length < 8) fieldErrors.newPassword = "Mật khẩu mới cần có ít nhất 8 ký tự.";
    if (!passwordForm.confirmPassword) fieldErrors.confirmPassword = "Vui lòng nhập lại mật khẩu mới.";
    else if (passwordForm.newPassword !== passwordForm.confirmPassword) fieldErrors.confirmPassword = "Xác nhận mật khẩu mới chưa khớp.";
    setPasswordFieldErrors(fieldErrors);
    const firstInvalid = (["currentPassword", "newPassword", "confirmPassword"] as const).find((field) => fieldErrors[field]);
    if (firstInvalid) {
      setPasswordError("");
      document.getElementById(`account-${firstInvalid}`)?.focus();
      return;
    }

    setIsChangingPassword(true);
    setPasswordError("");
    try {
      await axiosClient.post("/auth/change-password", {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      toast.success("Đổi mật khẩu thành công!");
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err: any) {
      const formatted = getApiErrorMessage(err, "Không thể đổi mật khẩu. Vui lòng kiểm tra lại.");
      // A wrong current password belongs under its own field, not in a toast.
      // The English text is what backends before the Vietnamese message returned.
      if (/mật khẩu hiện tại không đúng|current password is invalid/i.test(formatted)) {
        setPasswordFieldErrors({ currentPassword: "Mật khẩu hiện tại không đúng." });
        document.getElementById("account-currentPassword")?.focus();
      } else {
        setPasswordError(formatted);
      }
    } finally {
      setIsChangingPassword(false);
    }
  };

  // ── State for Inventory Tab ─────────────────────────────────
  const [inventoryCategory, setInventoryCategory] = useState<"all" | "avatar" | "badge" | "boost">("all");

  const marketInventoryQuery = useQuery({
    queryKey: ["market-inventory"],
    queryFn: async () => {
      const res: any = await axiosClient.get("/market/inventory");
      return res?.data || res;
    },
    enabled: !!user && user.role === "STUDENT",
    staleTime: 60_000,
  });

  const myUnlockedList = useMemo(() => {
    const ownedSlugs = marketInventoryQuery.data?.ownedSlugs || [];
    const ownedIds = (marketInventoryQuery.data?.ownedProductIds || []).map(String);
    const ownedNames = (marketInventoryQuery.data?.ownedItemNames || []).map((n: string) => n.toLowerCase());

    return MARKET_ITEMS.filter((item) => {
      if (unlockedItems.includes(item.id)) return true;
      if (ownedSlugs.includes(item.id)) return true;
      if (ownedNames.includes(item.name.toLowerCase())) return true;
      if (item.id === "frame-orange" && ownedIds.includes("2")) return true;
      if (item.id === "badge-star" && ownedIds.includes("1")) return true;
      if (item.id === "badge-master" && ownedIds.includes("6")) return true;
      if (item.id === "frame-crown" && ownedIds.includes("7")) return true;
      if (item.id === "frame-cyber" && ownedIds.includes("8")) return true;
      return false;
    });
  }, [unlockedItems, marketInventoryQuery.data]);

  const filteredInventory = useMemo(() => {
    if (inventoryCategory === "all") return myUnlockedList;
    return myUnlockedList.filter((item) => item.category === inventoryCategory);
  }, [myUnlockedList, inventoryCategory]);

  const activeBadgeConfig = resolveUserBadge(equippedBadge);
  const activeFrameConfig = resolveAvatarFrame(equippedAvatarFrame);

  // Sidebar Items Definition
  const SIDEBAR_ITEMS: Array<{ id: AccountTabKey; label: string; icon: React.ElementType }> = [
    { id: "account-profile", label: "Thông tin cá nhân", icon: User },
    { id: "account-plan", label: "Gói của tôi", icon: Crown },
    ...(withoutPassword ? [] : [{ id: "account-password" as const, label: "Đổi mật khẩu", icon: KeyRound }]),
    { id: "account-device", label: "Thiết bị", icon: Smartphone },
    { id: "account-inventory", label: "Túi đồ & Ngoại trang", icon: Backpack },
    { id: "learning-progress", label: "Tiến độ học tập", icon: Activity },
    { id: "diagnostic-result", label: "Kết quả đánh giá đầu vào", icon: Award },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <div className="flex flex-col md:flex-row gap-6 lg:gap-10 items-start">
        {/* ── Left Sidebar ──────────────────────────────────────── */}
        <aside className="w-full md:w-64 lg:w-72 shrink-0 md:border-r border-slate-200/80 dark:border-slate-800 md:pr-6">
          <div className="px-3 pb-2.5 text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
            <Settings size={13} className="text-slate-400 dark:text-slate-500" aria-hidden="true" />
            <span>Tài khoản</span>
          </div>

          <nav
            className="flex md:flex-col gap-1 overflow-x-auto pb-2 md:pb-0 scrollbar-none"
            aria-label="Menu tài khoản"
          >
            {SIDEBAR_ITEMS.map((item) => {
              const isActive = activeTab === item.id;
              const IconComp = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleTabChange(item.id)}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all text-left whitespace-nowrap cursor-pointer ${
                    isActive
                      ? "bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400 shadow-2xs"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-100/80 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200"
                  }`}
                >
                  <IconComp
                    size={18}
                    className={`shrink-0 ${
                      isActive ? "text-blue-600 dark:text-blue-400" : "text-slate-400 dark:text-slate-500"
                    }`}
                    aria-hidden="true"
                  />
                  <span>{item.label}</span>
                </button>
              );
            })}

            <div className="hidden md:block my-3 border-t border-slate-100 dark:border-slate-800" />

            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors text-left cursor-pointer whitespace-nowrap"
            >
              <LogOut size={18} className="shrink-0" aria-hidden="true" />
              <span>Đăng xuất</span>
            </button>
          </nav>
        </aside>

        {/* ── Right Content Area ────────────────────────────────── */}
        <main className="flex-1 min-w-0 w-full space-y-6">
          {activeTab === "learning-progress" && <LearningProgressTab />}
          {activeTab === "diagnostic-result" && <DiagnosticResultTab />}
          {/* TAB 1: GÓI CỦA TÔI */}
          {activeTab === "account-plan" && (
            <section className="space-y-6 animate-in fade-in duration-200" aria-labelledby="heading-plan">
              <div>
                <h1 id="heading-plan" className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                  Gói của tôi
                </h1>
                <p className="text-sm sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Gói đang dùng, ngày mua, ngày hết hạn và lịch sử thanh toán
                </p>
              </div>

              {/* Card 1: Gói hiện tại */}
              <div className="rounded-2xl sm:rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-2xs space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200 font-bold text-sm">
                    <Crown size={18} className="text-amber-500 shrink-0" aria-hidden="true" />
                    <span>Gói hiện tại</span>
                  </div>
                  <span
                    className={`inline-flex items-center px-3 py-0.5 rounded-full text-xs font-bold border ${
                      planDisplay.isPaid
                        ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300"
                        : "border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                    }`}
                  >
                    {planDisplay.isPaid ? planDisplay.planDisplayName : "Miễn phí"}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50/70 dark:bg-slate-850/60 rounded-2xl p-4 border border-slate-100 dark:border-slate-800">
                  <div>
                    <span className="block text-xs font-bold text-slate-400 dark:text-slate-500 tracking-wider">
                      NGÀY MUA
                    </span>
                    <span className="block text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 mt-1">
                      {planDisplay.startDateText || "-"}
                    </span>
                  </div>
                  <div>
                    <span className="block text-xs font-bold text-slate-400 dark:text-slate-500 tracking-wider">
                      NGÀY HẾT HẠN
                    </span>
                    <span className="block text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 mt-1">
                      {planDisplay.expiryDateText || "-"}
                    </span>
                  </div>
                  <div>
                    <span className="block text-xs font-bold text-slate-400 dark:text-slate-500 tracking-wider">
                      CÒN LẠI
                    </span>
                    <span className="block text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 mt-1">
                      {daysRemainingText}
                    </span>
                  </div>
                  <div>
                    <span className="block text-xs font-bold text-slate-400 dark:text-slate-500 tracking-wider">
                      NGUỒN
                    </span>
                    <span className="block text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 mt-1">
                      {planDisplay.isPaid ? "Chuyển khoản VietQR" : "-"}
                    </span>
                  </div>
                </div>

                <div>
                  <Link
                    href="/plans"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-[0.98] text-white font-bold text-xs sm:text-sm shadow-xs transition-all cursor-pointer"
                  >
                    <Zap size={14} className="fill-white text-white" aria-hidden="true" />
                    <span>Nâng cấp</span>
                  </Link>
                </div>
              </div>

              {/* Card 2: Lịch sử thanh toán */}
              <div className="rounded-2xl sm:rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-2xs space-y-4">
                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200 font-bold text-sm">
                  <ReceiptText size={18} className="text-blue-500 shrink-0" aria-hidden="true" />
                  <span>Lịch sử thanh toán</span>
                </div>

                {isLoadingPurchases ? (
                  <div className="space-y-3" aria-busy="true">
                    <div className="h-16 w-full animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
                    <div className="h-16 w-full animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
                  </div>
                ) : isPurchasesError ? (
                  <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center justify-between">
                    <span>Không thể tải lịch sử thanh toán.</span>
                    <button
                      type="button"
                      onClick={() => refetchPurchases()}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-600 text-white font-bold text-xs"
                    >
                      <RotateCcw size={12} />
                      <span>Thử lại</span>
                    </button>
                  </div>
                ) : !purchases || purchases.length === 0 ? (
                  <p className="text-sm sm:text-sm text-slate-400 dark:text-slate-500 py-2">
                    Chưa có giao dịch nào.
                  </p>
                ) : (
                  <div className="space-y-5">
                    {activePurchases.length > 0 && (
                      <div className="space-y-3" aria-labelledby="active-payment-heading">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <h3 id="active-payment-heading" className="text-sm font-black uppercase tracking-wider text-amber-700 dark:text-amber-400">
                              Thanh toán đang xử lý
                            </h3>
                            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                              Bạn có thể tiếp tục phiên hiện tại; hệ thống chỉ giữ một mã đang hoạt động.
                            </p>
                          </div>
                        </div>
                        {activePurchases.map((purchase) => {
                          const statusInfo = getPaymentStatusBadgeInfo(purchase.payment?.status || purchase.status);
                          return (
                            <div key={purchase.id} className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 dark:border-amber-900/60 dark:bg-amber-950/30">
                              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div className="space-y-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="font-bold text-sm text-slate-900 dark:text-slate-100">{purchase.planDisplayName}</span>
                                    <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-bold ${statusInfo.badgeClass}`}>{statusInfo.label}</span>
                                  </div>
                                  <p className="text-sm text-slate-600 dark:text-slate-400">
                                    Mã chuyển khoản: <span className="font-mono font-bold text-amber-800 dark:text-amber-300">{purchase.payment?.transferCode || purchase.bankInstructions?.transferCode}</span>
                                  </p>
                                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{formatVnd(purchase.amountVnd)}</p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setSelectedPurchaseId(purchase.id)}
                                  className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl bg-amber-500 px-4 text-xs font-black text-white transition-colors hover:bg-amber-600"
                                >
                                  Tiếp tục thanh toán
                                  <ChevronRight size={14} />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {reviewPurchases.length > 0 && (
                      <div className="space-y-3" aria-labelledby="review-payment-heading">
                        <div>
                          <h3 id="review-payment-heading" className="text-sm font-black uppercase tracking-wider text-amber-700 dark:text-amber-400">Thanh toán cần kiểm tra</h3>
                          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Bạn không cần chuyển khoản lại cho các giao dịch này.</p>
                        </div>
                        {reviewPurchases.map((purchase) => (
                          <button
                            key={purchase.id}
                            type="button"
                            onClick={() => setSelectedPurchaseId(purchase.id)}
                            className="flex w-full items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-white p-4 text-left transition-colors hover:border-amber-400 dark:border-amber-900/60 dark:bg-slate-900"
                          >
                            <span>
                              <span className="block text-sm font-bold text-slate-900 dark:text-slate-100">{purchase.planDisplayName}</span>
                              <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">Mã {purchase.payment?.transferCode || purchase.bankInstructions?.transferCode}</span>
                            </span>
                            <span className="text-xs font-bold text-amber-700 dark:text-amber-400">Xem chi tiết <ChevronRight size={14} className="inline" /></span>
                          </button>
                        ))}
                      </div>
                    )}

                    {successfulPurchases.length > 0 && (
                      <div className="space-y-3" aria-labelledby="payment-history-heading">
                        <h3 id="payment-history-heading" className="text-sm font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Lịch sử đã thanh toán</h3>
                    {successfulPurchases.map((purchase) => {
                      const paymentStatus = purchase.payment?.status || purchase.status;
                      const statusInfo = getPaymentStatusBadgeInfo(paymentStatus);
                      const dateStr = new Date(purchase.createdAt).toLocaleDateString("vi-VN", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      });

                      return (
                        <div
                          key={purchase.id}
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-slate-200/90 bg-white p-4.5 shadow-2xs transition-colors hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm sm:text-base text-slate-900 dark:text-slate-100">
                                {purchase.planDisplayName}
                              </span>
                              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                                ({purchase.durationDays} ngày)
                              </span>
                            </div>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                              Thời gian tạo: {dateStr}
                            </p>
                            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                              Mã chuyển khoản:{" "}
                              <span className="font-mono font-bold text-amber-700 dark:text-amber-400">
                                {purchase.payment?.transferCode || purchase.bankInstructions?.transferCode}
                              </span>
                            </p>
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                            <div className="text-left sm:text-right">
                              <span className="block font-black text-sm sm:text-base text-slate-900 dark:text-slate-100">
                                {formatVnd(purchase.amountVnd)}
                              </span>
                              <span
                                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold border mt-0.5 ${statusInfo.badgeClass}`}
                              >
                                {statusInfo.label}
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => setSelectedPurchaseId(purchase.id)}
                              className="inline-flex min-h-9 items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-700 hover:bg-slate-100 active:scale-[0.98] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-750 transition-all cursor-pointer"
                            >
                              <span>Chi tiết</span>
                              <ChevronRight size={14} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                      </div>
                    )}

                    {activePurchases.length === 0 && reviewPurchases.length === 0 && successfulPurchases.length === 0 && (
                      <p className="text-sm text-slate-500 dark:text-slate-400">Chưa có giao dịch cần hiển thị.</p>
                    )}
                  </div>
                )}
              </div>
            </section>
          )}

          {/* TAB 2: THÔNG TIN CÁ NHÂN */}
          {activeTab === "account-profile" && (
            <section className="space-y-6 animate-in fade-in duration-200" aria-labelledby="heading-profile">
              <div>
                <h1 id="heading-profile" className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                  Thông tin cá nhân
                </h1>
                <p className="text-sm sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Chỉnh sửa tên hiển thị và ảnh đại diện
                </p>
              </div>

              <div className="rounded-2xl sm:rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-7 shadow-2xs space-y-6">
                {/* Avatar block */}
                <div className="flex items-center gap-4">
                  <div className="relative shrink-0 p-1">
                    <UserAvatarWithFrame
                      avatarUrl={formData.avatar}
                      name={formData.fullName || user?.email}
                      size="xl"
                      showBadge
                    />
                  </div>

                  <label className="inline-flex min-h-10 items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-sm hover:bg-slate-100 dark:hover:bg-slate-750 transition-colors cursor-pointer">
                    <Camera size={14} />
                    <span>Đổi ảnh</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarFileChange}
                      className="hidden"
                    />
                  </label>
                </div>

                <form onSubmit={handleProfileSubmit} className="space-y-4 max-w-xl">
                  <div>
                    <label className="block text-sm font-bold text-slate-600 dark:text-slate-400 mb-1.5">
                      Tên hiển thị
                    </label>
                    <input
                      type="text"
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      className="w-full border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-900 dark:text-slate-100 outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-slate-800 transition-all"
                      placeholder="Nhập họ và tên của bạn"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-600 dark:text-slate-400 mb-1.5">
                      Email
                    </label>
                    <input
                      type="email"
                      value={user?.email || ""}
                      disabled
                      className="w-full border border-slate-200 dark:border-slate-700 bg-slate-100/70 dark:bg-slate-800/40 text-slate-400 dark:text-slate-500 rounded-xl px-4 py-2.5 text-sm font-semibold cursor-not-allowed"
                    />
                  </div>

                  {/* SECTION: THÔNG TIN LIÊN HỆ / NHẬN QUÀ */}
                  <div className="pt-4 border-t border-slate-200/80 dark:border-slate-800 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <div>
                        <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                          Thông tin liên hệ / Nhận quà
                        </h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                          Thông tin này chỉ được dùng để xử lý gửi quà vật lý khi đổi thưởng.
                        </p>
                      </div>
                      {shippingProfileQuery.data?.shippingProfileComplete && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 w-fit">
                          ✓ Đã hoàn thiện
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-slate-600 dark:text-slate-400 mb-1.5">
                          Tên người nhận
                        </label>
                        <input
                          type="text"
                          value={shippingData.recipientName}
                          onChange={(e) =>
                            setShippingData({ ...shippingData, recipientName: e.target.value })
                          }
                          className="w-full border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-900 dark:text-slate-100 outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-slate-800 transition-all"
                          placeholder="Họ và tên người nhận"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-slate-600 dark:text-slate-400 mb-1.5">
                          Số điện thoại nhận quà
                        </label>
                        <input
                          id="shipping-phone"
                          type="tel"
                          value={shippingData.phone}
                          onChange={(e) => {
                            setShippingData({ ...shippingData, phone: e.target.value });
                            setPhoneError("");
                          }}
                          aria-invalid={Boolean(phoneError)}
                          aria-describedby={phoneError ? "shipping-phone-error" : undefined}
                          className={`w-full border bg-slate-50/50 dark:bg-slate-800/50 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-900 dark:text-slate-100 outline-none focus:bg-white dark:focus:bg-slate-800 transition-all ${phoneError ? "border-rose-400 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 dark:border-rose-700" : "border-slate-200 dark:border-slate-700 focus:border-blue-500"}`}
                          placeholder="Ví dụ: 0912 345 678"
                        />
                        {phoneError && (
                          <p id="shipping-phone-error" className="mt-1.5 flex items-start gap-1.5 text-sm font-bold text-rose-600 dark:text-rose-400">
                            <AlertCircle size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
                            {phoneError}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-slate-600 dark:text-slate-400 mb-1.5">
                          Tỉnh/Thành phố
                        </label>
                        <AddressCombobox
                          id="shipping-province-select"
                          value={shippingData.provinceCode}
                          options={provincesQuery.data || []}
                          isLoading={provincesQuery.isLoading}
                          placeholder="Chọn tỉnh/thành phố"
                          loadingPlaceholder="Đang tải tỉnh/thành phố..."
                          accentColor="blue"
                          onChange={(nextProvince) => {
                            setShippingData({
                              ...shippingData,
                              provinceCode: nextProvince,
                              wardCode: "", // Đổi tỉnh sẽ tự động reset phường/xã (Requirement 28)
                            });
                          }}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-slate-600 dark:text-slate-400 mb-1.5">
                          Phường / Xã / Đặc khu
                        </label>
                        <AddressCombobox
                          id="shipping-ward-select"
                          value={shippingData.wardCode}
                          options={wardsQuery.data || []}
                          disabled={!shippingData.provinceCode || wardsQuery.isLoading}
                          disabledPlaceholder={
                            shippingData.provinceCode
                              ? "Chọn phường/xã/đặc khu..."
                              : "Chọn tỉnh/thành phố trước ▾"
                          }
                          isLoading={wardsQuery.isLoading}
                          loadingPlaceholder="Đang tải phường/xã..."
                          placeholder="Chọn hoặc nhập phường/xã/đặc khu..."
                          accentColor="blue"
                          onChange={(nextWard) => {
                            setShippingData({
                              ...shippingData,
                              wardCode: nextWard,
                            });
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-slate-600 dark:text-slate-400 mb-1.5">
                        Địa chỉ chi tiết
                      </label>
                      <input
                        type="text"
                        value={shippingData.addressLine}
                        onChange={(e) =>
                          setShippingData({ ...shippingData, addressLine: e.target.value })
                        }
                        className="w-full border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-900 dark:text-slate-100 outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-slate-800 transition-all"
                        placeholder="Số nhà, tên đường, thôn/ấp, tòa nhà..."
                      />
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-bold text-sm shadow-sm transition-all cursor-pointer disabled:opacity-60 flex items-center gap-2"
                    >
                      {isSaving && (
                        <Loader2 size={16} className="animate-spin" />
                      )}
                      <span>Lưu thay đổi</span>
                    </button>
                  </div>
                </form>
              </div>
            </section>
          )}

          {/* TAB 3: ĐỔI MẬT KHẨU */}
          {activeTab === "account-password" && (
            <section className="space-y-6 animate-in fade-in duration-200" aria-labelledby="heading-password">
              <div>
                <h1 id="heading-password" className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                  Đổi mật khẩu
                </h1>
                <p className="text-sm sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Cập nhật mật khẩu để nâng cao tính bảo mật cho tài khoản của bạn
                </p>
              </div>

              <div className="rounded-2xl sm:rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-7 shadow-2xs space-y-6 max-w-xl">
                {passwordError && (
                  <div role="alert" className="flex items-start gap-2 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 dark:bg-rose-950/40 dark:border-rose-900/60 dark:text-rose-300 text-xs font-bold">
                    <AlertCircle size={16} className="mt-0.5 shrink-0" />
                    <span>{passwordError}</span>
                  </div>
                )}

                <form onSubmit={handlePasswordSubmit} noValidate className="space-y-4">
                  <div>
                    <label htmlFor="account-currentPassword" className="block text-sm font-bold text-slate-600 dark:text-slate-400 mb-1.5">
                      Mật khẩu hiện tại
                    </label>
                    <div className="relative">
                      <input
                        type={showCurrentPassword ? "text" : "password"}
                        required
                        value={passwordForm.currentPassword}
                        onChange={(e) => updatePasswordField("currentPassword", e.target.value)}
                        id="account-currentPassword"
                        aria-invalid={Boolean(passwordFieldErrors.currentPassword)}
                        aria-describedby={passwordFieldErrors.currentPassword ? "account-currentPassword-error" : undefined}
                        className={`w-full border bg-slate-50/50 dark:bg-slate-800/50 rounded-xl px-4 py-2.5 pr-11 text-sm font-bold text-slate-900 dark:text-slate-100 outline-none focus:bg-white dark:focus:bg-slate-800 transition-all ${passwordFieldErrors.currentPassword ? "border-rose-400 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 dark:border-rose-700" : "border-slate-200 dark:border-slate-700 focus:border-blue-500"}`}
                        placeholder="Nhập mật khẩu hiện tại"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
                        aria-label={showCurrentPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                      >
                        {showCurrentPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                      </button>
                    </div>
                    {passwordFieldErrors.currentPassword && (
                      <p id="account-currentPassword-error" className="mt-1.5 flex items-center gap-1.5 text-sm font-bold text-rose-600 dark:text-rose-400">
                        <AlertCircle size={14} className="shrink-0" aria-hidden="true" />
                        {passwordFieldErrors.currentPassword}
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="account-newPassword" className="block text-sm font-bold text-slate-600 dark:text-slate-400 mb-1.5">
                      Mật khẩu mới
                    </label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? "text" : "password"}
                        required
                        minLength={8}
                        value={passwordForm.newPassword}
                        onChange={(e) => updatePasswordField("newPassword", e.target.value)}
                        id="account-newPassword"
                        aria-invalid={Boolean(passwordFieldErrors.newPassword)}
                        aria-describedby={passwordFieldErrors.newPassword ? "account-newPassword-error" : undefined}
                        className={`w-full border bg-slate-50/50 dark:bg-slate-800/50 rounded-xl px-4 py-2.5 pr-11 text-sm font-bold text-slate-900 dark:text-slate-100 outline-none focus:bg-white dark:focus:bg-slate-800 transition-all ${passwordFieldErrors.newPassword ? "border-rose-400 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 dark:border-rose-700" : "border-slate-200 dark:border-slate-700 focus:border-blue-500"}`}
                        placeholder="Tối thiểu 8 ký tự"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
                        aria-label={showNewPassword ? "Ẩn mật khẩu mới" : "Hiện mật khẩu mới"}
                      >
                        {showNewPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                      </button>
                    </div>
                    {passwordFieldErrors.newPassword && (
                      <p id="account-newPassword-error" className="mt-1.5 flex items-center gap-1.5 text-sm font-bold text-rose-600 dark:text-rose-400">
                        <AlertCircle size={14} className="shrink-0" aria-hidden="true" />
                        {passwordFieldErrors.newPassword}
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="account-confirmPassword" className="block text-sm font-bold text-slate-600 dark:text-slate-400 mb-1.5">
                      Xác nhận mật khẩu mới
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        required
                        value={passwordForm.confirmPassword}
                        onChange={(e) => updatePasswordField("confirmPassword", e.target.value)}
                        id="account-confirmPassword"
                        aria-invalid={Boolean(passwordFieldErrors.confirmPassword)}
                        aria-describedby={passwordFieldErrors.confirmPassword ? "account-confirmPassword-error" : undefined}
                        className={`w-full border bg-slate-50/50 dark:bg-slate-800/50 rounded-xl px-4 py-2.5 pr-11 text-sm font-bold text-slate-900 dark:text-slate-100 outline-none focus:bg-white dark:focus:bg-slate-800 transition-all ${passwordFieldErrors.confirmPassword ? "border-rose-400 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 dark:border-rose-700" : "border-slate-200 dark:border-slate-700 focus:border-blue-500"}`}
                        placeholder="Nhập lại mật khẩu mới"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
                        aria-label={showConfirmPassword ? "Ẩn xác nhận mật khẩu" : "Hiện xác nhận mật khẩu"}
                      >
                        {showConfirmPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                      </button>
                    </div>
                    {passwordFieldErrors.confirmPassword && (
                      <p id="account-confirmPassword-error" className="mt-1.5 flex items-center gap-1.5 text-sm font-bold text-rose-600 dark:text-rose-400">
                        <AlertCircle size={14} className="shrink-0" aria-hidden="true" />
                        {passwordFieldErrors.confirmPassword}
                      </p>
                    )}
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isChangingPassword}
                      className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-bold text-sm shadow-sm transition-all cursor-pointer disabled:opacity-60 flex items-center gap-2"
                    >
                      {isChangingPassword && <Loader2 size={16} className="animate-spin" />}
                      <span>Đổi mật khẩu</span>
                    </button>
                  </div>
                </form>
              </div>
            </section>
          )}

          {/* TAB 4: THIẾT BỊ */}
          {activeTab === "account-device" && (
            <section className="space-y-6 animate-in fade-in duration-200" aria-labelledby="heading-device">
              <div>
                <h1 id="heading-device" className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                  Thiết bị
                </h1>
                <p className="text-sm sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Danh sách thiết bị và phiên đăng nhập đang hoạt động
                </p>
              </div>

              <div className="rounded-2xl sm:rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-7 shadow-2xs space-y-4">
                <div className="flex items-start justify-between gap-4 p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-850/60 border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-3.5">
                    <div className="size-11 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                      <Laptop size={22} aria-hidden="true" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                          Trình duyệt Web hiện tại
                        </span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-black bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          Đang hoạt động
                        </span>
                      </div>
                      <p className="text-sm text-slate-400 dark:text-slate-500 mt-0.5">
                        Phiên duyệt web · Truy cập lần cuối: Vừa xong
                      </p>
                    </div>
                  </div>
                </div>

                <p className="text-sm text-slate-400 dark:text-slate-500">
                  Nếu bạn nhận thấy bất kỳ hoạt động đăng nhập bất thường nào, hãy đổi mật khẩu hoặc đăng xuất ngay lập tức để bảo vệ tài khoản.
                </p>
              </div>
            </section>
          )}

          {/* TAB 5: TÚI ĐỒ & NGOẠI TRANG */}
          {activeTab === "account-inventory" && (
            <section className="space-y-6 animate-in fade-in duration-200" aria-labelledby="heading-inventory">
              <div>
                <h1 id="heading-inventory" className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                  Túi Đồ &amp; Ngoại Trang
                </h1>
                <p className="text-sm sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Xem và trang bị các khung avatar, huy hiệu mở khóa từ Cửa hàng Bánh Mì
                </p>
              </div>

              {/* Identity & Preview */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl p-6 border border-slate-200/90 dark:border-slate-800 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-6">
                <div className="flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left">
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shrink-0">
                    <UserAvatarWithFrame
                      avatarUrl={formData.avatar}
                      name={formData.fullName || user?.email}
                      size="xl"
                      showBadge={true}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <h2 className="text-xl font-black text-slate-900 dark:text-slate-100">
                      {formData.fullName || "Học viên BreadTrans"}
                    </h2>
                    <p className="text-sm text-slate-400 dark:text-slate-500 font-medium">
                      Trang bị đang đeo sẽ hiển thị đồng bộ trong lớp học và bài thi.
                    </p>
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                      {activeFrameConfig ? (
                        <span className="text-xs px-3 py-1 rounded-full font-bold flex items-center gap-1.5 bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/60">
                          <Crown size={14} className="text-amber-600 dark:text-amber-400" />
                          {activeFrameConfig.name}
                        </span>
                      ) : (
                        <span className="text-xs px-3 py-1 rounded-full font-medium bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                          Chưa đeo khung avatar
                        </span>
                      )}

                      {activeBadgeConfig ? (
                        <span className="text-xs px-3 py-1 rounded-full font-bold flex items-center gap-1.5 bg-blue-50 text-blue-800 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900/60">
                          <Medal size={14} className="text-blue-600 dark:text-blue-400" />
                          {activeBadgeConfig.name}
                        </span>
                      ) : (
                        <span className="text-xs px-3 py-1 rounded-full font-medium bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                          Chưa đeo huy hiệu
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <Link
                  href="/market"
                  className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 shrink-0 transition-colors"
                >
                  <ShoppingBag size={15} />
                  <span>Cửa Hàng Bánh Mì</span>
                </Link>
              </div>

              {/* Filter pills */}
              <div className="flex flex-wrap items-center gap-2 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setInventoryCategory("all")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    inventoryCategory === "all"
                      ? "bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400"
                  }`}
                >
                  Tất cả ({myUnlockedList.length})
                </button>
                <button
                  type="button"
                  onClick={() => setInventoryCategory("avatar")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    inventoryCategory === "avatar"
                      ? "bg-amber-500 text-white"
                      : "bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
                  }`}
                >
                  Khung Avatar
                </button>
                <button
                  type="button"
                  onClick={() => setInventoryCategory("badge")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    inventoryCategory === "badge"
                      ? "bg-blue-600 text-white"
                      : "bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300"
                  }`}
                >
                  Huy Hiệu
                </button>
              </div>

              {/* Items Grid */}
              {filteredInventory.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-8 text-center">
                  <p className="text-sm sm:text-sm font-bold text-slate-500 dark:text-slate-400">
                    Chưa có vật phẩm nào trong mục này.
                  </p>
                  <Link
                    href="/market"
                    className="inline-block mt-3 text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline"
                  >
                    Đến Cửa Hàng Bánh Mì để mở khóa &rarr;
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredInventory.map((item) => {
                    const isFrame = item.category === "avatar";
                    const isBadge = item.category === "badge";
                    const isEquipped =
                      (isFrame && activeFrameConfig?.key === item.id) ||
                      (isBadge && activeBadgeConfig?.key === item.id);

                    return (
                      <div
                        key={item.id}
                        className={`bg-white dark:bg-slate-900 rounded-2xl p-4.5 border transition-all flex flex-col justify-between ${
                          isEquipped
                            ? "border-amber-400 dark:border-amber-600 ring-2 ring-amber-400/20"
                            : "border-slate-200 dark:border-slate-800"
                        }`}
                      >
                        <div className="space-y-2">
                          <div className="flex items-center gap-3">
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-800">
                              <img
                                src={item.icon}
                                alt={item.name}
                                className="h-7 w-7 object-contain"
                              />
                            </span>
                            <div>
                              <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">
                                {item.name}
                              </h3>
                              <span className="text-xs uppercase font-bold text-slate-400">
                                {item.category}
                              </span>
                            </div>
                          </div>
                          <p className="text-sm text-slate-500 dark:text-slate-400">
                            {item.description}
                          </p>
                        </div>

                        <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800">
                          {isFrame && (
                            <button
                              type="button"
                              onClick={() => {
                                if (isEquipped) {
                                  equipAvatarFrame(null);
                                  toast("Đã tháo khung avatar");
                                } else {
                                  equipAvatarFrame(item.id);
                                  toast.success(`Đã trang bị "${item.name}"!`);
                                }
                              }}
                              className={`w-full py-2 rounded-xl font-bold text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                                isEquipped
                                  ? "bg-amber-500 hover:bg-amber-600 text-white"
                                  : "bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-750 dark:text-slate-200"
                              }`}
                            >
                              {isEquipped ? (
                                <>
                                  <CheckCircle2 size={14} />
                                  <span>Đang đeo</span>
                                </>
                              ) : (
                                <span>Trang bị</span>
                              )}
                            </button>
                          )}
                          {isBadge && (
                            <button
                              type="button"
                              onClick={() => {
                                if (isEquipped) {
                                  equipBadge(null);
                                  toast("Đã tháo huy hiệu");
                                } else {
                                  equipBadge(item.id);
                                  toast.success(`Đã trang bị "${item.name}"!`);
                                }
                              }}
                              className={`w-full py-2 rounded-xl font-bold text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                                isEquipped
                                  ? "bg-amber-500 hover:bg-amber-600 text-white"
                                  : "bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-750 dark:text-slate-200"
                              }`}
                            >
                              {isEquipped ? (
                                <>
                                  <CheckCircle2 size={14} />
                                  <span>Đang đeo</span>
                                </>
                              ) : (
                                <span>Trang bị</span>
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}
        </main>
      </div>

      {/* Payment Details Modal */}
      {selectedPurchaseId && (
        <PlanPaymentModal
          purchaseId={selectedPurchaseId}
          onClose={() => setSelectedPurchaseId(null)}
          onReplaceSuccess={(replacement) => setSelectedPurchaseId(replacement.id)}
        />
      )}
    </div>
  );
}
