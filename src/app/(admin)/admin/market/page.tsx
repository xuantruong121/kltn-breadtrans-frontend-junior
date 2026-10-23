"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
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
  User,
  Package,
  Clock,
  ShoppingBag,
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
    toggleProductActiveMutation.mutate({ id: p.id, isActive: !p.isActive });
  };

  const activeProductsCount = products.filter((p) => p.isActive).length;
  const pendingOrdersCount = orders.filter((o) => o.status === "pending").length;
  const completedOrdersCount = orders.filter(
    (o) => o.status === "approved" || o.status === "completed",
  ).length;

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-16">
      {/* PAGE HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950">Cửa hàng đổi quà</h1>
          <p className="mt-1 text-sm font-medium text-slate-500">
            Quản lý danh mục quà tặng đổi bằng Bánh Mì và phê duyệt yêu cầu đổi quà của học viên
          </p>
        </div>

        {activeTab === "catalog" && (
          <button
            onClick={() => {
              setEditingProduct(null);
              setIsProductModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 self-start rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-slate-800 active:scale-[0.98] cursor-pointer md:self-auto"
          >
            <Plus size={15} />
            <span>Thêm quà mới</span>
          </button>
        )}
      </div>

      {/* 3 KPI SUMMARY CARDS */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs transition hover:border-slate-300">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Danh mục quà tặng
            </span>
            <Package className="size-4 text-slate-400" />
          </div>
          <div className="mt-2 text-3xl font-bold tracking-tight text-slate-950 font-mono tabular-nums">
            {activeProductsCount}
          </div>
          <div className="mt-1 text-xs font-medium text-slate-500">
            Đang hiển thị trên tổng số <span className="font-bold text-slate-800 font-mono">{products.length}</span> vật phẩm
          </div>
        </div>

        <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs transition hover:border-slate-300">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Chờ phê duyệt
            </span>
            <Clock className="size-4 text-amber-500" />
          </div>
          <div className="mt-2 text-3xl font-bold tracking-tight text-amber-600 font-mono tabular-nums">
            {pendingOrdersCount}
          </div>
          <div className="mt-1 text-xs font-medium text-slate-500">
            Yêu cầu đổi quà đang chờ quản trị viên xử lý
          </div>
        </div>

        <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs transition hover:border-slate-300">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Tổng lượt đổi quà
            </span>
            <ShoppingBag className="size-4 text-slate-400" />
          </div>
          <div className="mt-2 text-3xl font-bold tracking-tight text-slate-950 font-mono tabular-nums">
            {orders.length}
          </div>
          <div className="mt-1 text-xs font-medium text-slate-500">
            <span className="font-bold text-emerald-600 font-mono">{completedOrdersCount}</span> yêu cầu đã duyệt thành công
          </div>
        </div>
      </div>

      {/* TOP TABS NAVIGATION */}
      <div className="flex items-center gap-6 border-b border-slate-200">
        <button
          onClick={() => setActiveTab("catalog")}
          className={`-mb-px flex items-center gap-2 border-b-2 px-1 py-3 text-sm font-semibold transition-colors cursor-pointer ${
            activeTab === "catalog"
              ? "border-slate-900 text-slate-950"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <span>Danh mục quà</span>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-mono font-medium ${
              activeTab === "catalog"
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-600"
            }`}
          >
            {products.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("orders")}
          className={`-mb-px flex items-center gap-2 border-b-2 px-1 py-3 text-sm font-semibold transition-colors cursor-pointer ${
            activeTab === "orders"
              ? "border-slate-900 text-slate-950"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <span>Yêu cầu đổi quà</span>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-mono font-medium ${
              pendingOrdersCount > 0
                ? "bg-amber-100 text-amber-800 font-bold"
                : activeTab === "orders"
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600"
            }`}
          >
            {orders.length}
          </span>
        </button>
      </div>

      {/* TAB 1: DANH MỤC QUÀ */}
      {activeTab === "catalog" && (
        <div className="space-y-4">
          {/* CATALOG FILTERS */}
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 md:grid-cols-4">
            <div className="relative">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
              />
              <input
                type="text"
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
                placeholder="Tìm tên hoặc slug quà..."
                className="h-9 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-xs font-medium text-slate-800 placeholder:text-slate-400 outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 shadow-2xs"
              />
            </div>

            <select
              value={catalogActiveFilter}
              onChange={(e) => setCatalogActiveFilter(e.target.value)}
              className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700 outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 shadow-2xs cursor-pointer"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="true">Đang hiển thị</option>
              <option value="false">Đang ẩn</option>
            </select>

            <select
              value={catalogFulfillmentFilter}
              onChange={(e) => setCatalogFulfillmentFilter(e.target.value)}
              className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700 outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 shadow-2xs cursor-pointer"
            >
              <option value="all">Tất cả hình thức</option>
              <option value="DIGITAL">Kỹ thuật số (In-App / Voucher)</option>
              <option value="PHYSICAL">Quà vật lý (Giao tận nhà)</option>
            </select>

            <select
              value={catalogCategoryFilter}
              onChange={(e) => setCatalogCategoryFilter(e.target.value)}
              className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700 outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 shadow-2xs cursor-pointer"
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
          <div className="rounded-xl border border-slate-200/90 bg-white shadow-xs overflow-hidden">
            {isLoadingProducts ? (
              <div className="flex justify-center py-16">
                <Loader2 className="animate-spin text-slate-400" size={28} />
              </div>
            ) : products.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-100/75 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                      <th className="py-3 px-5">Quà tặng</th>
                      <th className="py-3 px-4">Loại giao</th>
                      <th className="py-3 px-4">Độ hiếm</th>
                      <th className="py-3 px-4 text-right">Giá Bánh Mì</th>
                      <th className="py-3 px-4 text-right">Tồn kho</th>
                      <th className="py-3 px-4 text-right">Đã đổi</th>
                      <th className="py-3 px-4">Trạng thái</th>
                      <th className="py-3 px-5 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {products.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/70 transition">
                        <td className="py-3.5 px-5">
                          <div className="font-bold text-slate-950">{p.name}</div>
                          <div className="text-xs text-slate-500 font-mono">{p.slug}</div>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700">
                            {p.fulfillmentType === "PHYSICAL" ? (
                              <>
                                <Truck size={13} className="text-slate-500" />
                                <span>Vật lý</span>
                              </>
                            ) : (
                              <span>Kỹ thuật số</span>
                            )}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-xs font-semibold text-slate-600">{p.rarity}</td>

                        <td className="py-3.5 px-4 text-right tabular-nums font-mono font-bold text-amber-700">
                          {p.price} BM
                        </td>

                        <td className="py-3.5 px-4 text-right tabular-nums text-sm font-mono">
                          {p.stock === 0 ? (
                            <span className="text-rose-600 font-bold">Hết hàng</span>
                          ) : (
                            <span className="text-slate-800 font-semibold">{p.stock}</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right tabular-nums font-mono text-slate-700">
                          {p.purchaseCount}
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                              p.isActive
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200/80"
                                : "bg-slate-100 text-slate-600 border border-slate-200"
                            }`}
                          >
                            {p.isActive ? "Đang hiển thị" : "Đã ẩn"}
                          </span>
                        </td>

                        <td className="py-3.5 px-5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => {
                                setEditingProduct(p);
                                setIsProductModalOpen(true);
                              }}
                              className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg transition active:scale-[0.98] cursor-pointer"
                              title="Chỉnh sửa quà tặng"
                            >
                              <Edit size={15} />
                            </button>

                            <button
                              disabled={toggleProductActiveMutation.isPending}
                              onClick={() => handleToggleProductActive(p)}
                              className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg transition active:scale-[0.98] cursor-pointer"
                              title={p.isActive ? "Ngừng hiển thị" : "Kích hoạt hiển thị"}
                            >
                              {p.isActive ? <EyeOff size={15} /> : <Eye size={15} />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-16 text-center text-sm font-medium text-slate-500">
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
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
              />
              <input
                type="text"
                value={orderSearch}
                onChange={(e) => setOrderSearch(e.target.value)}
                placeholder="Tìm mã đơn, tên hoặc email học viên..."
                className="h-9 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-xs font-medium text-slate-800 placeholder:text-slate-400 outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 shadow-2xs"
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
                  className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all shadow-2xs cursor-pointer ${
                    orderStatusFilter === st.key
                      ? "bg-slate-900 text-white"
                      : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-300"
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>

          {/* ORDERS TABLE */}
          <div className="rounded-xl border border-slate-200/90 bg-white shadow-xs overflow-hidden">
            {isLoadingOrders ? (
              <div className="flex justify-center py-16">
                <Loader2 className="animate-spin text-slate-400" size={28} />
              </div>
            ) : orders.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-100/75 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                      <th className="py-3 px-5">Mã đơn</th>
                      <th className="py-3 px-4">Học viên</th>
                      <th className="py-3 px-4">Vật phẩm đổi & Địa chỉ giao</th>
                      <th className="py-3 px-4 text-right">Bánh Mì trừ</th>
                      <th className="py-3 px-4">Thời gian</th>
                      <th className="py-3 px-4">Trạng thái</th>
                      <th className="py-3 px-4">Người xử lý / Lý do</th>
                      <th className="py-3 px-5 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {orders.map((ord) => {
                      const itemsList = Array.isArray(ord.items)
                        ? ord.items
                            .map((i: any) => `${i.name} (x${i.quantity || 1})`)
                            .join(", ")
                        : "Vật phẩm";

                      const physical = ord.physicalRedemptions?.[0];

                      return (
                        <tr key={ord.id} className="hover:bg-slate-50/70 transition">
                          <td className="py-3.5 px-5 text-xs font-mono font-bold text-slate-800">
                            #{ord.id}
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-950">
                              {ord.studentName ||
                                ord.user?.profile?.fullName ||
                                "Học viên"}
                            </div>
                            <div className="text-xs text-slate-500 font-mono">{ord.user?.email}</div>
                          </td>

                          <td className="py-3.5 px-4 max-w-xs text-slate-700">
                            <div className="text-xs font-semibold leading-relaxed text-slate-900">{itemsList}</div>
                            {physical && (
                              <div className="mt-1.5 rounded-lg border border-slate-200/80 bg-slate-50/80 p-2.5 text-xs space-y-0.5">
                                <div className="flex items-center gap-1 font-semibold text-slate-800">
                                  <Truck size={12} className="shrink-0 text-slate-500" />
                                  <span>
                                    {physical.recipientName} ({physical.phone})
                                  </span>
                                </div>
                                <div className="text-slate-600 leading-relaxed font-normal">
                                  {physical.formattedAddress}
                                </div>
                              </div>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-right tabular-nums font-mono font-bold text-rose-600">
                            -{ord.totalBanh}
                          </td>

                          <td className="py-3.5 px-4 text-xs font-mono text-slate-600 whitespace-nowrap">
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
                              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                                ord.status === "approved" || ord.status === "completed"
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200/80"
                                  : ord.status === "rejected"
                                    ? "bg-rose-50 text-rose-700 border border-rose-200/80"
                                    : ord.status === "refunded"
                                      ? "bg-slate-100 text-slate-600 border border-slate-200"
                                      : "bg-amber-50 text-amber-700 border border-amber-200/80"
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

                          <td className="py-3.5 px-4 max-w-xs text-xs text-slate-600">
                            {ord.reviewedBy ? (
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-1 font-semibold text-slate-800">
                                  <User size={12} className="text-slate-400" />
                                  <span>{ord.reviewedBy}</span>
                                </div>
                                {ord.reason && (
                                  <div className="text-rose-600 font-medium">"{ord.reason}"</div>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>

                          <td className="py-3.5 px-5 text-right whitespace-nowrap">
                            {ord.status === "pending" ? (
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  disabled={approveOrderMutation.isPending}
                                  onClick={() => approveOrderMutation.mutate(ord.id)}
                                  className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 transition active:scale-[0.98] cursor-pointer"
                                  title="Phê duyệt đơn hàng"
                                >
                                  <CheckCircle size={13} />
                                  <span>Duyệt</span>
                                </button>

                                <button
                                  onClick={() => setRejectingOrder(ord)}
                                  className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 transition active:scale-[0.98] cursor-pointer"
                                  title="Từ chối đơn hàng"
                                >
                                  <XCircle size={13} />
                                  <span>Từ chối</span>
                                </button>
                              </div>
                            ) : ord.status === "approved" || ord.status === "completed" ? (
                              <button
                                onClick={() => setFailingOrder(ord)}
                                className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 border border-slate-200 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 transition active:scale-[0.98] cursor-pointer"
                                title="Đánh dấu giao/thực hiện thất bại và hoàn Bánh Mì"
                              >
                                <AlertTriangle size={13} />
                                <span>Giao thất bại</span>
                              </button>
                            ) : (
                              <span className="text-xs text-slate-300">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-16 text-center text-sm font-medium text-slate-500">
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
