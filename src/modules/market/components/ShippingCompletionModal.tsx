"use client";

import React, { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, MapPin, Truck, X } from "lucide-react";
import toast from "react-hot-toast";
import { locationService } from "@/lib/api/services/location.service";
import { userService } from "@/lib/api/services/user.service";
import { AddressCombobox } from "@/components/ui";

interface ShippingCompletionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ShippingCompletionModal: React.FC<ShippingCompletionModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const queryClient = useQueryClient();

  const [shippingData, setShippingData] = useState({
    recipientName: "",
    phone: "",
    provinceCode: "",
    wardCode: "",
    addressLine: "",
  });
  const [isSaving, setIsSaving] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ["shippingProfile"],
    queryFn: () => userService.getShippingProfile(),
    enabled: isOpen,
  });

  const { data: provinces = [], isLoading: isLoadingProvinces } = useQuery({
    queryKey: ["vietnamProvinces"],
    queryFn: () => locationService.getProvinces(),
    enabled: isOpen,
    staleTime: 1000 * 60 * 60 * 12,
  });

  const { data: wards = [], isLoading: isLoadingWards } = useQuery({
    queryKey: ["vietnamWards", shippingData.provinceCode],
    queryFn: () => locationService.getWards(shippingData.provinceCode),
    enabled: isOpen && !!shippingData.provinceCode,
    staleTime: 1000 * 60 * 60 * 12,
  });

  useEffect(() => {
    if (profile) {
      setShippingData({
        recipientName: profile.recipientName || "",
        phone: profile.phoneDisplay || profile.phone || "",
        provinceCode: profile.provinceCode || "",
        wardCode: profile.wardCode || "",
        addressLine: profile.addressLine || "",
      });
    }
  }, [profile]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!shippingData.recipientName.trim()) {
      toast.error("Vui lòng nhập tên người nhận");
      return;
    }
    if (!shippingData.phone.trim()) {
      toast.error("Vui lòng nhập số điện thoại");
      return;
    }
    if (!shippingData.provinceCode) {
      toast.error("Vui lòng chọn tỉnh/thành phố");
      return;
    }
    if (!shippingData.wardCode) {
      toast.error("Vui lòng chọn phường/xã/đặc khu");
      return;
    }
    if (!shippingData.addressLine.trim()) {
      toast.error("Vui lòng nhập địa chỉ chi tiết (số nhà, tên đường...)");
      return;
    }

    setIsSaving(true);
    try {
      await userService.updateShippingProfile({
        recipientName: shippingData.recipientName.trim(),
        phone: shippingData.phone.trim(),
        provinceCode: shippingData.provinceCode,
        wardCode: shippingData.wardCode,
        addressLine: shippingData.addressLine.trim(),
      });

      queryClient.invalidateQueries({ queryKey: ["shippingProfile"] });
      toast.success("Đã cập nhật thông tin nhận quà thành công!");
      onSuccess();
    } catch (err: any) {
      const errCode = err?.response?.data?.code;
      if (errCode === "INVALID_VIETNAM_PHONE") {
        toast.error("Số điện thoại không hợp lệ. Vui lòng nhập số di động Việt Nam (vd: 0987654321 hoặc +84987654321).");
      } else if (errCode === "WARD_PROVINCE_MISMATCH") {
        toast.error("Phường/xã đã chọn không thuộc tỉnh/thành phố tương ứng.");
      } else {
        toast.error(err?.response?.data?.message || "Không thể lưu thông tin nhận quà. Vui lòng kiểm tra lại.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="shipping-modal-title"
    >
      <div className="w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
              <Truck size={22} aria-hidden="true" />
            </div>
            <div>
              <h2
                id="shipping-modal-title"
                className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 leading-tight"
              >
                Hoàn thiện thông tin nhận quà
              </h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Vui lòng bổ sung tên người nhận, số điện thoại và địa chỉ giao hàng trước khi đổi quà vật lý.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            aria-label="Đóng"
            className="grid min-h-10 min-w-10 place-items-center rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:text-slate-500 dark:hover:text-slate-200 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Tên người nhận <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={shippingData.recipientName}
              onChange={(e) => setShippingData({ ...shippingData, recipientName: e.target.value })}
              className="w-full border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-900 dark:text-slate-100 outline-none focus:border-amber-500 focus:bg-white dark:focus:bg-slate-800 transition-all"
              placeholder="Nguyễn Văn A"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Số điện thoại <span className="text-rose-500">*</span>
            </label>
            <input
              type="tel"
              value={shippingData.phone}
              onChange={(e) => setShippingData({ ...shippingData, phone: e.target.value })}
              className="w-full border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-900 dark:text-slate-100 outline-none focus:border-amber-500 focus:bg-white dark:focus:bg-slate-800 transition-all"
              placeholder="0987654321 hoặc +84987654321"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Tỉnh / Thành phố <span className="text-rose-500">*</span>
              </label>
              <AddressCombobox
                id="modal-shipping-province-select"
                value={shippingData.provinceCode}
                options={provinces}
                isLoading={isLoadingProvinces}
                placeholder="Chọn hoặc nhập tỉnh/thành phố..."
                loadingPlaceholder="Đang tải tỉnh/thành phố..."
                accentColor="amber"
                onChange={(code) => {
                  setShippingData({
                    ...shippingData,
                    provinceCode: code,
                    wardCode: "", // reset ward when province changes
                  });
                }}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Phường / Xã / Đặc khu <span className="text-rose-500">*</span>
              </label>
              <AddressCombobox
                id="modal-shipping-ward-select"
                value={shippingData.wardCode}
                options={wards}
                disabled={!shippingData.provinceCode || isLoadingWards}
                disabledPlaceholder={
                  shippingData.provinceCode
                    ? "Chọn phường/xã/đặc khu..."
                    : "Chọn tỉnh/thành phố trước ▾"
                }
                isLoading={isLoadingWards}
                loadingPlaceholder="Đang tải phường/xã..."
                placeholder="Chọn hoặc nhập phường/xã/đặc khu..."
                accentColor="amber"
                onChange={(code) => {
                  setShippingData({
                    ...shippingData,
                    wardCode: code,
                  });
                }}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Địa chỉ chi tiết <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={shippingData.addressLine}
              onChange={(e) => setShippingData({ ...shippingData, addressLine: e.target.value })}
              className="w-full border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-900 dark:text-slate-100 outline-none focus:border-amber-500 focus:bg-white dark:focus:bg-slate-800 transition-all"
              placeholder="Số nhà, tên đường, thôn/ấp, tòa nhà..."
            />
          </div>

          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            * Thông tin này chỉ được dùng để xử lý gửi quà vật lý. BreadTrans bảo mật thông tin liên hệ của bạn.
          </p>

          <div className="pt-2 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="min-h-11 rounded-xl border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 active:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-amber-600 px-5 text-sm font-bold text-white shadow-xs hover:bg-amber-700 active:bg-amber-800 dark:bg-amber-500 dark:hover:bg-amber-600 dark:text-slate-950 disabled:opacity-60 transition-colors cursor-pointer"
            >
              {isSaving && <Loader2 size={16} className="animate-spin" />}
              <span>Lưu thông tin nhận quà</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
