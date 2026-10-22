"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ShoppingBag,
  Package,
  Plus,
  Search,
  CheckCircle,
  XCircle,
  Loader2,
  Truck,
  AlertTriangle,
  Edit,
  Eye,
  EyeOff,
  Clock,
  User,
  Gift,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  AdminMarketProduct,
  AdminMarketOrder,
  adminMarketService,
} from "@/lib/api/services/admin-market.service";
import AdminRewardCreateEditModal from "@/modules/admin/market/components/AdminRewardCreateEditModal";
import AdminRejectOrderModal from "@/modules/admin/market/components/AdminRejectOrderModal";
import AdminFulfillmentFailedModal from "@/modules/admin/market/components/AdminFulfillmentFailedModal";

type ActiveTab = "catalog" | "orders";

export default function AdminMarketPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<ActiveTab>("catalog");

  // State: Tab Catalog
  const [catalogSearch, setCatalogSearch] = useState("");
  const [catalogActiveFilter, setCatalogActiveFilter] = useState<string>("all");
  const [catalogFulfillmentFilter, setCatalogFulfillmentFilter] = useState<string>("all");
  const [catalogCategoryFilter, setCatalogCategoryFilter] = useState<string>("all");

  // State: Modals Catalog
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<AdminMarketProduct | null>(null);

  // State: Tab Orders
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>("all");
  const [orderSearch, setOrderSearch] = useState("");

  // State: Modals Orders
  const [rejectingOrder, setRejectingOrder] = useState<AdminMarketOrder | null>(null);
  const [failingOrder, setFailingOrder] = useState<AdminMarketOrder | null>(null);

  // Query: Products Catalog
  const { data: productsData, isLoading: isLoadingProducts } = useQuery({
    queryKey: [
      "admin-market-products",
      catalogSearch,
      catalogActiveFilter,
      catalogFulfillmentFilter,
      catalogCategoryFilter,
    ],
    queryFn: () =>
      adminMarketService.getProducts({
        search: catalogSearch.trim() || undefined,
        isActive: catalogActiveFilter !== "all" ? catalogActiveFilter : undefined,
        fulfillmentType:
          catalogFulfillmentFilter !== "all" ? catalogFulfillmentFilter : undefined,
        category: catalogCategoryFilter !== "all" ? catalogCategoryFilter : undefined,
      }),
  });

  const products: AdminMarketProduct[] = Array.isArray(productsData?.data)
    ? productsData.data
    : Array.isArray(productsData)
      ? productsData
      : [];

  // Query: Orders List
  const { data: orders = [], isLoading: isLoadingOrders } = useQuery<AdminMarketOrder[]>({
    queryKey: ["admin-market-orders", orderStatusFilter, orderSearch],
    queryFn: () =>
      adminMarketService.getOrders({
        status: orderStatusFilter !== "all" ? orderStatusFilter : undefined,
        search: orderSearch.trim() || undefined,
      }),
  });

  // Mutation: Approve Order
  const approveOrderMutation = useMutation({
    mutationFn: (orderId: number) =>
      adminMarketService.reviewOrder(orderId, "approved"),
    onSuccess: (_, orderId) => {
      toast.success(`Đã phê duyệt đơn hàng #${orderId}!`);
      queryClient.invalidateQueries({ queryKey: ["admin-market-orders"] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Không thể phê duyệt đơn hàng");
    },
  });

  // Mutation: Toggle Product Active State
  const toggleProductActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      adminMarketService.toggleProductActive(id, isActive),
    onSuccess: (updated) => {
      toast.success(
        updated.isActive
          ? `Đã kích hoạt hiển thị quà tặng "${updated.name}"!`
          : `Đã ngừng hiển thị quà tặng "${updated.name}"!`,
      );
      queryClient.invalidateQueries({ queryKey: ["admin-market-products"] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Không thể thay đổi trạng thái quà tặng");
    },
  });

  const handleToggleProductActive = (p: AdminMarketProduct) => {
    const actionText = p.isActive ? "ngừng hiển thị" : "kích hoạt hiển thị lại";
    if (
      window.confirm(
        `Bạn có chắc chắn muốn ${actionText} quà tặng "${p.name}" trong Cửa Hàng Bánh Mì không?`,
      )
    ) {
      toggleProductActiveMutation.mutate({ id: p.id, isActive: !p.isActive });
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-16">
      {/* PAGE HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-rose-500 p-3.5 rounded-2xl text-white shadow-xs">
            <ShoppingBag size={28} />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-slate-800">
              Cửa Hàng Đổi Quà
            </h1>
            <p className="text-slate-500 font-medium text-xs md:text-sm">
              Quản lý danh mục quà tặng đổi bằng Bánh Mì và phê duyệt yêu cầu đổi quà của học viên
            </p>
          </div>
        </div>

        {activeTab === "catalog" && (
          <button
            onClick={() => {
              setEditingProduct(null);
              setIsProductModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm rounded-xl shadow-xs transition-colors cursor-pointer self-start md:self-auto"
          >
            <Plus size={18} />
            <span>Thêm quà mới</span>
          </button>
        )}
      </div>

      {/* TOP TABS NAVIGATION */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab("catalog")}
          className={`flex items-center gap-2 px-5 py-3 font-bold text-sm border-b-2 transition-colors cursor-pointer ${
            activeTab === "catalog"
              ? "border-rose-600 text-rose-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Package size={18} />
          <span>Danh mục quà ({products.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("orders")}
          className={`flex items-center gap-2 px-5 py-3 font-bold text-sm border-b-2 transition-colors cursor-pointer ${
            activeTab === "orders"
              ? "border-rose-600 text-rose-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <ShoppingBag size={18} />
          <span>Yêu cầu đổi quà ({orders.length})</span>
        </button>
      </div>

      {/* TAB 1: DANH MỤC QUÀ */}
      {activeTab === "catalog" && (
        <div className="space-y-4">
          {/* CATALOG FILTERS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
                placeholder="Tìm tên hoặc slug quà..."
                className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-colors"
              />
            </div>

            <select
              value={catalogActiveFilter}
              onChange={(e) => setCatalogActiveFilter(e.target.value)}
              className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:bg-white focus:border-rose-500 transition-colors cursor-pointer"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="true">Đang hiển thị (Active)</option>
              <option value="false">Đang ẩn (Tạm khóa)</option>
            </select>

            <select
              value={catalogFulfillmentFilter}
              onChange={(e) => setCatalogFulfillmentFilter(e.target.value)}
              className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:bg-white focus:border-rose-500 transition-colors cursor-pointer"
            >
              <option value="all">Tất cả hình thức</option>
              <option value="DIGITAL">Kỹ thuật số (In-App / Voucher)</option>
              <option value="PHYSICAL">Quà vật lý (Giao tận nhà)</option>
            </select>

            <select
              value={catalogCategoryFilter}
              onChange={(e) => setCatalogCategoryFilter(e.target.value)}
              className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:bg-white focus:border-rose-500 transition-colors cursor-pointer"
            >
              <option value="all">Tất cả danh mục</option>
              <option value="GENERAL">Chung (Phổ thông)</option>
              <option value="PHYSICAL">Quà vật lý</option>
              <option value="BOOSTER">Bổ trợ học tập</option>
              <option value="BADGE">Huy hiệu danh giá</option>
              <option value="STREAK">Khiên giữ chuỗi</option>
              <option value="SPECIAL">Đặc biệt</option>
            </select>
          </div>

          {/* CATALOG TABLE */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            {isLoadingProducts ? (
              <div className="flex justify-center py-16">
                <Loader2 className="animate-spin text-rose-500" size={36} />
              </div>
            ) : products.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50 text-slate-500 font-bold text-xs uppercase tracking-wider">
                      <th className="py-3.5 px-5">Quà tặng</th>
                      <th className="py-3.5 px-4">Loại giao</th>
                      <th className="py-3.5 px-4">Độ hiếm</th>
                      <th className="py-3.5 px-4">Giá Bánh Mì</th>
                      <th className="py-3.5 px-4">Tồn kho</th>
                      <th className="py-3.5 px-4">Đã đổi</th>
                      <th className="py-3.5 px-4">Trạng thái</th>
                      <th className="py-3.5 px-5 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-sm">
                    {products.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-5">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 shrink-0 overflow-hidden flex items-center justify-center">
                              {p.imageUrl ? (
                                <img
                                  src={p.imageUrl}
                                  alt={p.name}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src =
                                      "/images/market/default.svg";
                                  }}
                                />
                              ) : (
                                <Package size={22} className="text-slate-400" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="text-slate-800 font-bold truncate">
                                {p.name}
                              </div>
                              <div className="text-[11px] font-mono text-slate-400">
                                slug: {p.slug}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full border ${
                              p.fulfillmentType === "PHYSICAL"
                                ? "bg-amber-50 text-amber-800 border-amber-200"
                                : "bg-sky-50 text-sky-800 border-sky-200"
                            }`}
                          >
                            {p.fulfillmentType === "PHYSICAL" ? (
                              <>
                                <Truck size={12} />
                                <span>Vật lý</span>
                              </>
                            ) : (
                              <>
                                <Gift size={12} />
                                <span>Kỹ thuật số</span>
                              </>
                            )}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="text-xs font-semibold text-slate-600">
                            {p.rarity}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="font-black text-amber-600 text-sm">
                            {p.price} Bánh Mì
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`font-bold text-xs ${
                              p.stock === 0
                                ? "text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md"
                                : "text-slate-700"
                            }`}
                          >
                            {p.stock === 0 ? "Hết hàng (0)" : `${p.stock} cái`}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="text-xs font-bold text-slate-600">
                            {p.purchaseCount} lượt
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${
                              p.isActive
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-slate-200 text-slate-600"
                            }`}
                          >
                            {p.isActive ? "Đang hiển thị" : "Đã ẩn"}
                          </span>
                        </td>

                        <td className="py-3.5 px-5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                setEditingProduct(p);
                                setIsProductModalOpen(true);
                              }}
                              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                              title="Chỉnh sửa quà tặng"
                            >
                              <Edit size={16} />
                            </button>

                            <button
                              disabled={toggleProductActiveMutation.isPending}
                              onClick={() => handleToggleProductActive(p)}
                              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                p.isActive
                                  ? "text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                                  : "text-slate-400 hover:text-emerald-600 hover:bg-emerald-50"
                              }`}
                              title={p.isActive ? "Ngừng hiển thị" : "Kích hoạt hiển thị"}
                            >
                              {p.isActive ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-16 text-slate-400 font-medium text-sm">
                Không tìm thấy quà tặng nào phù hợp với bộ lọc hiện tại.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: YÊU CẦU ĐỔI QUÀ */}
      {activeTab === "orders" && (
        <div className="space-y-4">
          {/* ORDERS FILTERS */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="relative w-full sm:w-72">
              <Search
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                value={orderSearch}
                onChange={(e) => setOrderSearch(e.target.value)}
                placeholder="Tìm mã đơn, tên hoặc email học viên..."
                className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-colors"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
              {[
                { key: "all", label: "Tất cả" },
                { key: "pending", label: "Chờ duyệt" },
                { key: "approved", label: "Đã duyệt" },
                { key: "rejected", label: "Từ chối" },
                { key: "refunded", label: "Đã hoàn tiền" },
              ].map((st) => (
                <button
                  key={st.key}
                  onClick={() => setOrderStatusFilter(st.key)}
                  className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-colors cursor-pointer shrink-0 ${
                    orderStatusFilter === st.key
                      ? "bg-rose-600 text-white shadow-2xs"
                      : "text-slate-500 hover:bg-slate-100"
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>

          {/* ORDERS TABLE */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            {isLoadingOrders ? (
              <div className="flex justify-center py-16">
                <Loader2 className="animate-spin text-rose-500" size={36} />
              </div>
            ) : orders.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50 text-slate-500 font-bold text-xs uppercase tracking-wider">
                      <th className="py-3.5 px-5">Mã đơn</th>
                      <th className="py-3.5 px-4">Học viên</th>
                      <th className="py-3.5 px-4">Vật phẩm đổi & Địa chỉ giao</th>
                      <th className="py-3.5 px-4">Bánh Mì trừ</th>
                      <th className="py-3.5 px-4">Thời gian</th>
                      <th className="py-3.5 px-4">Trạng thái</th>
                      <th className="py-3.5 px-4">Người xử lý / Lý do</th>
                      <th className="py-3.5 px-5 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-sm">
                    {orders.map((ord) => {
                      const itemsList = Array.isArray(ord.items)
                        ? ord.items
                            .map((i: any) => `${i.name} (x${i.quantity || 1})`)
                            .join(", ")
                        : "Vật phẩm";

                      const physical = ord.physicalRedemptions?.[0];

                      return (
                        <tr key={ord.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3.5 px-5 text-slate-400 font-mono text-xs">
                            #{ord.id}
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="text-slate-800 font-bold">
                              {ord.studentName ||
                                ord.user?.profile?.fullName ||
                                "Học viên"}
                            </div>
                            <div className="text-xs text-slate-400 font-normal">
                              {ord.user?.email}
                            </div>
                          </td>

                          <td className="py-3.5 px-4 text-slate-700 max-w-xs">
                            <div className="font-semibold text-xs leading-relaxed">
                              {itemsList}
                            </div>
                            {physical && (
                              <div className="mt-1.5 p-2 rounded-lg bg-amber-50 border border-amber-200/80 text-xs space-y-0.5">
                                <div className="flex items-center gap-1 font-bold text-amber-900 text-[11px]">
                                  <Truck size={12} className="text-amber-700 shrink-0" />
                                  <span>
                                    {physical.recipientName} ({physical.phone})
                                  </span>
                                </div>
                                <div className="text-slate-600 font-normal text-[11px] leading-relaxed">
                                  {physical.formattedAddress}
                                </div>
                              </div>
                            )}
                          </td>

                          <td className="py-3.5 px-4 font-black text-amber-600 text-sm">
                            -{ord.totalBanh} Bánh Mì
                          </td>

                          <td className="py-3.5 px-4 text-xs text-slate-500 whitespace-nowrap">
                            {new Date(ord.createdAt).toLocaleDateString("vi-VN", {
                              hour: "2-digit",
                              minute: "2-digit",
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                            })}
                          </td>

                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-flex items-center gap-1 text-xs font-black px-2.5 py-1 rounded-full border ${
                                ord.status === "approved" || ord.status === "completed"
                                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                  : ord.status === "rejected"
                                    ? "bg-rose-50 text-rose-800 border-rose-200"
                                    : ord.status === "refunded"
                                      ? "bg-slate-100 text-slate-700 border-slate-300"
                                      : "bg-amber-50 text-amber-800 border-amber-200"
                              }`}
                            >
                              {ord.status === "approved"
                                ? "Đã duyệt"
                                : ord.status === "completed"
                                  ? "Hoàn tất"
                                  : ord.status === "rejected"
                                    ? "Từ chối"
                                    : ord.status === "refunded"
                                      ? "Đã hoàn tiền"
                                      : "Chờ duyệt"}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-xs text-slate-600 max-w-xs">
                            {ord.reviewedBy ? (
                              <div className="space-y-0.5">
                                <div className="font-semibold text-slate-800 flex items-center gap-1">
                                  <User size={12} className="text-slate-400" />
                                  <span>{ord.reviewedBy}</span>
                                </div>
                                {ord.reason && (
                                  <div className="text-[11px] text-rose-600 italic">
                                    "{ord.reason}"
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>

                          <td className="py-3.5 px-5 text-right whitespace-nowrap">
                            {ord.status === "pending" ? (
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  disabled={approveOrderMutation.isPending}
                                  onClick={() => approveOrderMutation.mutate(ord.id)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-2xs"
                                  title="Phê duyệt đơn hàng"
                                >
                                  <CheckCircle size={14} />
                                  <span>Duyệt</span>
                                </button>

                                <button
                                  onClick={() => setRejectingOrder(ord)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-2xs"
                                  title="Từ chối đơn hàng"
                                >
                                  <XCircle size={14} />
                                  <span>Từ chối</span>
                                </button>
                              </div>
                            ) : ord.status === "approved" || ord.status === "completed" ? (
                              <button
                                onClick={() => setFailingOrder(ord)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                title="Đánh dấu giao/thực hiện thất bại và hoàn Bánh Mì"
                              >
                                <AlertTriangle size={14} />
                                <span>Giao thất bại</span>
                              </button>
                            ) : (
                              <span className="text-xs text-slate-300 font-mono">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-16 text-slate-400 font-medium text-sm">
                Không có yêu cầu đổi quà nào phù hợp với bộ lọc hiện tại.
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODALS */}
      <AdminRewardCreateEditModal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        product={editingProduct}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["admin-market-products"] });
        }}
      />

      <AdminRejectOrderModal
        isOpen={Boolean(rejectingOrder)}
        onClose={() => setRejectingOrder(null)}
        order={rejectingOrder}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["admin-market-orders"] });
        }}
      />

      <AdminFulfillmentFailedModal
        isOpen={Boolean(failingOrder)}
        onClose={() => setFailingOrder(null)}
        order={failingOrder}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["admin-market-orders"] });
        }}
      />
    </div>
  );
}
