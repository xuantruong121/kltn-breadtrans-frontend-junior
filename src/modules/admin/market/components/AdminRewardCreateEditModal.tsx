"use client";

import React, { useState } from "react";
import {
  X,
  Upload,
  Loader2,
  Package,
  Check,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  AdminMarketProduct,
  CreateMarketProductPayload,
  adminMarketService,
} from "@/lib/api/services/admin-market.service";
import { getApiErrorMessage } from "@/lib/utils/apiError";

interface AdminRewardCreateEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  product?: AdminMarketProduct | null;
  onSuccess: () => void;
}

const CATEGORIES = [
  { value: "GENERAL", label: "Chung (Phổ thông)" },
  { value: "PHYSICAL", label: "Quà vật lý" },
  { value: "BOOSTER", label: "Bổ trợ học tập" },
  { value: "BADGE", label: "Huy hiệu danh giá" },
  { value: "STREAK", label: "Khiên giữ chuỗi" },
  { value: "SPECIAL", label: "Đặc biệt" },
];

const RARITIES = [
  { value: "COMMON", label: "Phổ biến (Common)", color: "text-slate-600 bg-slate-100" },
  { value: "UNCOMMON", label: "Không phổ biến (Uncommon)", color: "text-emerald-700 bg-emerald-50" },
  { value: "RARE", label: "Hiếm (Rare)", color: "text-sky-700 bg-sky-50" },
  { value: "EPIC", label: "Sử thi (Epic)", color: "text-indigo-700 bg-indigo-50" },
  { value: "LEGENDARY", label: "Huyền thoại (Legendary)", color: "text-amber-700 bg-amber-50" },
];

export default function AdminRewardCreateEditModal({
  isOpen,
  onClose,
  product,
  onSuccess,
}: AdminRewardCreateEditModalProps) {
  if (!isOpen) return null;

  return (
    <AdminRewardCreateEditModalInner
      key={product?.id ? `edit-${product.id}` : "create-new"}
      product={product}
      onClose={onClose}
      onSuccess={onSuccess}
    />
  );
}

function AdminRewardCreateEditModalInner({
  product,
  onClose,
  onSuccess,
}: {
  product?: AdminMarketProduct | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const isEditing = Boolean(product);

  const [formData, setFormData] = useState<CreateMarketProductPayload>(() => ({
    name: product?.name || "",
    slug: product?.slug || "",
    description: product?.description || "",
    category: product?.category || "GENERAL",
    rarity: product?.rarity || "COMMON",
    price: product?.price ?? 100,
    stock: product?.stock ?? 50,
    imageUrl: product?.imageUrl || "",
    order: product?.order ?? 0,
    isActive: product?.isActive ?? true,
    fulfillmentType: product?.fulfillmentType || "DIGITAL",
  }));

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Vui lòng chỉ tải lên file hình ảnh (PNG, JPG, SVG, WebP)");
      return;
    }

    try {
      setIsUploading(true);
      const url = await adminMarketService.uploadImage(file);
      if (url) {
        setFormData((prev) => ({ ...prev, imageUrl: url }));
        toast.success("Tải ảnh quà tặng thành công!");
      }
    } catch (err: any) {
      toast.error(getApiErrorMessage(err, "Không thể tải ảnh lên hệ thống"));
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error("Vui lòng nhập tên quà tặng");
      return;
    }

    if (formData.price <= 0) {
      toast.error("Giá Bánh Mì phải lớn hơn 0");
      return;
    }

    if (formData.stock < 0) {
      toast.error("Số lượng tồn kho không được âm");
      return;
    }

    try {
      setIsSubmitting(true);

      const payload: CreateMarketProductPayload = {
        name: formData.name.trim(),
        slug: formData.slug?.trim() || undefined,
        description: formData.description?.trim() || undefined,
        category: formData.category,
        rarity: formData.rarity,
        price: Number(formData.price),
        stock: Number(formData.stock),
        imageUrl: formData.imageUrl?.trim() || undefined,
        order: Number(formData.order) || 0,
        isActive: formData.isActive,
        fulfillmentType: formData.fulfillmentType,
      };

      if (isEditing && product) {
        await adminMarketService.updateProduct(product.id, payload);
        toast.success(`Đã cập nhật quà tặng "${payload.name}"!`);
      } else {
        await adminMarketService.createProduct(payload);
        toast.success(`Đã thêm quà tặng mới "${payload.name}"!`);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(getApiErrorMessage(err, "Có lỗi xảy ra khi lưu quà tặng"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden my-8">
        {/* MODAL HEADER */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
              <Package size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">
                {isEditing ? "Chỉnh sửa thông tin quà tặng" : "Thêm quà tặng mới"}
              </h2>
              <p className="text-xs text-slate-500">
                {isEditing
                  ? `Cập nhật quà tặng #${product?.id} trong Cửa Hàng Bánh Mì`
                  : "Tạo vật phẩm đổi thưởng mới cho học viên"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* MODAL FORM */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Section: Thông tin cơ bản */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Tên quà tặng <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ví dụ: Gấu bông Bánh Mì linh vật, Voucher Phúc Long 30K..."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:bg-white focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Mã định danh (Slug)
              </label>
              <input
                type="text"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                placeholder="Tự sinh nếu để trống (vd: gau-bong-banh-mi)"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono text-slate-700 focus:bg-white focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-colors"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Để trống để hệ thống tự động sinh slug tiếng Việt chuẩn.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Hình thức giao quà
              </label>
              <select
                value={formData.fulfillmentType}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    fulfillmentType: e.target.value as "DIGITAL" | "PHYSICAL",
                  })
                }
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:bg-white focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-colors cursor-pointer"
              >
                <option value="DIGITAL">Kỹ thuật số (Voucher, Vật phẩm In-App)</option>
                <option value="PHYSICAL">Quà vật lý (Giao tận nhà theo địa chỉ)</option>
              </select>
            </div>
          </div>

          {/* Section: Phân loại & Giá */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Danh mục
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:bg-white focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-colors cursor-pointer"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Độ hiếm
              </label>
              <select
                value={formData.rarity}
                onChange={(e) => setFormData({ ...formData, rarity: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:bg-white focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-colors cursor-pointer"
              >
                {RARITIES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Giá Bánh Mì <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min={1}
                required
                value={formData.price}
                onChange={(e) =>
                  setFormData({ ...formData, price: Math.max(1, parseInt(e.target.value, 10) || 1) })
                }
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-amber-600 focus:bg-white focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-colors"
              />
            </div>
          </div>

          {/* Section: Tồn kho & Thứ tự & Trạng thái */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Số lượng tồn kho <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min={0}
                required
                value={formData.stock}
                onChange={(e) =>
                  setFormData({ ...formData, stock: Math.max(0, parseInt(e.target.value, 10) || 0) })
                }
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:bg-white focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Thứ tự sắp xếp
              </label>
              <input
                type="number"
                value={formData.order}
                onChange={(e) =>
                  setFormData({ ...formData, order: parseInt(e.target.value, 10) || 0 })
                }
                placeholder="0"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:bg-white focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-colors"
              />
            </div>

            <div className="flex flex-col justify-end">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Trạng thái hiển thị
              </label>
              <label className="flex items-center gap-2.5 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-100/70 transition-colors">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="rounded text-rose-600 focus:ring-rose-500 h-4 w-4"
                />
                <span className="text-sm font-bold text-slate-700">
                  {formData.isActive ? "Đang hiển thị" : "Đang ẩn (Tạm khóa)"}
                </span>
              </label>
            </div>
          </div>

          {/* Section: Ảnh quà tặng */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Hình ảnh quà tặng
            </label>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              {formData.imageUrl ? (
                <div className="relative w-16 h-16 rounded-xl border border-slate-200 overflow-hidden bg-slate-100 shrink-0">
                  <img
                    src={formData.imageUrl}
                    alt="Ảnh xem trước"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "/images/market/default.svg";
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, imageUrl: "" })}
                    className="absolute top-1 right-1 p-0.5 bg-black/60 hover:bg-black/80 text-white rounded-full transition-colors cursor-pointer"
                  >
                    <X size={10} />
                  </button>
                </div>
              ) : (
                <div className="w-16 h-16 rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-300 bg-slate-50 shrink-0">
                  <Package size={24} />
                </div>
              )}

              <div className="flex-1 w-full space-y-1.5">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formData.imageUrl}
                    onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                    placeholder="URL ảnh hoặc chọn file tải lên..."
                    className="flex-1 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-700 focus:bg-white focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-colors"
                  />
                  <label className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer transition-colors shrink-0">
                    {isUploading ? (
                      <Loader2 size={14} className="animate-spin text-rose-500" />
                    ) : (
                      <Upload size={14} />
                    )}
                    <span>{isUploading ? "Đang tải..." : "Tải ảnh"}</span>
                    <input
                      type="file"
                      accept="image/*"
                      disabled={isUploading}
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                </div>
                <p className="text-[11px] text-slate-400">
                  Tải ảnh lên hoặc dán đường dẫn ảnh.
                </p>
              </div>
            </div>
          </div>

          {/* Section: Mô tả */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Mô tả chi tiết
            </label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Giới thiệu về phần thưởng, quyền lợi nhận được khi đổi..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:bg-white focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-colors"
            />
          </div>

          {/* FOOTER ACTIONS */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isUploading}
              className="inline-flex items-center gap-2 px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Đang lưu...</span>
                </>
              ) : (
                <>
                  <Check size={16} />
                  <span>{isEditing ? "Cập nhật quà tặng" : "Tạo quà tặng mới"}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
