"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ShoppingBag,
  PackageCheck,
  Backpack,
  Search,
  AlertCircle,
  Clock,
  CheckCircle2,
  Wheat,
  X,
  RefreshCw,
  Trophy,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

import axiosClient from "@/lib/api/axiosClient";
import { useAuthStore } from "@/stores/authStore";
import { useGamificationStore } from "@/stores/gamificationStore";
import { MarketProduct, MarketOrder, MarketInventoryResponse, MarketBalanceResponse } from "../types";
import { MarketItemCard } from "../components/MarketItemCard";
import { AuthGateModal } from "@/components/auth/AuthGateModal";

const CATEGORIES = [
  { id: "ALL", label: "Tất cả" },
  { id: "BOOST", label: "Vật phẩm bảo vệ" },
  { id: "BADGE", label: "Huy hiệu" },
  { id: "AVATAR_FRAME", label: "Khung avatar" },
  { id: "PHYSICAL", label: "Quà hiện vật" },
];

export const MarketScreen: React.FC = () => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const isGuest = !user || user.role !== "STUDENT";

  const [activeTab, setActiveTab] = useState<"shop" | "orders">("shop");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authGateOpen, setAuthGateOpen] = useState(false);
  const [pendingItemName, setPendingItemName] = useState<string>("vật phẩm này");

  const {
    equippedAvatarFrame,
    equippedBadge,
    unlockItem,
    equipAvatarFrame,
    equipBadge,
  } = useGamificationStore();

  // 1. Products query (Public / Guest Allowed)
  const {
    data: products = [],
    isLoading: isProductsLoading,
    isError: isProductsError,
    refetch: refetchProducts,
  } = useQuery<MarketProduct[]>({
    queryKey: ["market-products"],
    queryFn: async () => {
      const res: any = await axiosClient.get("/market/products");
      return Array.isArray(res) ? res : res?.data || [];
    },
    staleTime: 300_000,
  });

  // 2. Student balance query
  const { data: balanceData } = useQuery<MarketBalanceResponse>({
    queryKey: ["market-balance"],
    queryFn: () => axiosClient.get("/market/currency/balance"),
    enabled: !isGuest,
    staleTime: 60_000,
  });

  // 3. Student inventory query
  const { data: inventory } = useQuery<MarketInventoryResponse>({
    queryKey: ["market-inventory"],
    queryFn: () => axiosClient.get("/market/inventory"),
    enabled: !isGuest,
    staleTime: 60_000,
  });

  // 4. Student orders query
  const {
    data: myOrders = [],
    isLoading: isOrdersLoading,
  } = useQuery<MarketOrder[]>({
    queryKey: ["my-market-orders"],
    queryFn: async () => {
      const res: any = await axiosClient.get("/market/orders/my");
      return Array.isArray(res) ? res : res?.data || [];
    },
    enabled: !isGuest && activeTab === "orders",
    staleTime: 30_000,
  });

  // Filter products by category and search
  const filteredProducts = useMemo(() => {
    return products.filter((item) => {
      if (item.isActive === false) return false;
      const matchesCategory =
        selectedCategory === "ALL" ||
        item.category?.toUpperCase() === selectedCategory.toUpperCase();
      const matchesSearch =
        !searchQuery.trim() ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  const isItemUnlocked = (product: MarketProduct) => {
    if (inventory?.ownedProductIds?.includes(product.id)) return true;
    if (inventory?.ownedSlugs?.includes(product.slug)) return true;
    if (inventory?.ownedItemNames?.some((n) => n.toLowerCase() === product.name.toLowerCase())) return true;
    return false;
  };

  const handleEquipToggle = (product: MarketProduct) => {
    const slugOrId = product.slug || String(product.id);
    if (product.category === "AVATAR_FRAME") {
      if (equippedAvatarFrame === slugOrId) {
        equipAvatarFrame(null);
        toast.success("Đã tháo khung avatar");
      } else {
        equipAvatarFrame(slugOrId);
        toast.success(`Đã trang bị khung "${product.name}"`);
      }
    } else if (product.category === "BADGE") {
      if (equippedBadge === slugOrId) {
        equipBadge(null);
        toast.success("Đã tháo huy hiệu");
      } else {
        equipBadge(slugOrId);
        toast.success(`Đã trang bị huy hiệu "${product.name}"`);
      }
    }
  };

  const handleRedeem = async (product: MarketProduct) => {
    if (isGuest) {
      setPendingItemName(product.name);
      setAuthGateOpen(true);
      return;
    }

    const currentBalance = balanceData?.totalBanh || 0;
    if (currentBalance < product.price) {
      toast.error("Bạn không đủ số Bánh Mì để đổi vật phẩm này!");
      return;
    }

    if (product.stock <= 0) {
      toast.error("Vật phẩm hiện tại đã hết hàng!");
      return;
    }

    const confirmed = window.confirm(
      `Xác nhận đổi "${product.name}" với giá ${product.price} Bánh Mì?`
    );
    if (!confirmed) return;

    setIsSubmitting(true);
    try {
      await axiosClient.post("/market/orders", {
        items: [{ id: product.id, slug: product.slug, quantity: 1 }],
      });

      unlockItem(product.slug || String(product.id));
      toast.success(`Đổi "${product.name}" thành công!`);

      queryClient.invalidateQueries({ queryKey: ["my-market-orders"] });
      queryClient.invalidateQueries({ queryKey: ["market-balance"] });
      queryClient.invalidateQueries({ queryKey: ["market-inventory"] });
      queryClient.invalidateQueries({ queryKey: ["user-stats"] });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Có lỗi xảy ra khi đổi quà!");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* HEADER BANNER */}
      <div className="relative overflow-hidden rounded-3xl border border-amber-200/80 bg-gradient-to-br from-amber-500/10 via-amber-100/40 to-white p-6 sm:p-8">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/80 bg-white/80 px-3 py-1 text-xs font-bold text-amber-900 shadow-2xs backdrop-blur-xs">
              <Wheat size={14} className="text-amber-600" />
              <span>Cửa hàng phần thưởng BreadTrans</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Đổi quà từ Bánh Mì tích lũy
            </h1>
            <p className="text-sm text-slate-600 leading-relaxed">
              Hoàn thành các bài tập rèn kỹ năng và đề thi TOEIC để nhận Bánh Mì, sau đó mở khóa các vật phẩm hỗ trợ học tập và quà tặng gửi tận nhà.
            </p>
          </div>

          {/* User Balance Card or Guest Prompt */}
          {!isGuest ? (
            <div className="flex items-center gap-3.5 rounded-2xl border border-amber-200 bg-white p-4 shadow-xs shrink-0">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                <Wheat size={24} aria-hidden="true" />
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Số dư Bánh Mì
                </span>
                <p className="text-2xl font-black text-amber-900 leading-tight">
                  {(balanceData?.totalBanh || 0).toLocaleString("vi-VN")}
                  <span className="text-xs font-semibold text-slate-500 ml-1">bánh</span>
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 rounded-2xl border border-amber-200/80 bg-white/90 p-4 shadow-xs shrink-0">
              <div>
                <span className="text-xs font-bold text-slate-700">Bạn đang duyệt ở chế độ Khách</span>
                <p className="text-[11px] text-slate-500">Đăng nhập để tích lũy Bánh Mì và nhận quà.</p>
              </div>
              <Link
                href="/login?redirect=/market"
                className="inline-flex items-center justify-center rounded-xl bg-amber-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-amber-700 transition-colors shrink-0"
              >
                Đăng nhập ngay
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* TOP NAVIGATION TABS & QUICK LINKS */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* Main Tabs */}
        <div className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-2xs">
          <button
            type="button"
            onClick={() => setActiveTab("shop")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold transition-colors cursor-pointer ${
              activeTab === "shop"
                ? "bg-amber-600 text-white shadow-2xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <ShoppingBag size={15} />
            <span>Vật phẩm ({products.length})</span>
          </button>

          {!isGuest && (
            <button
              type="button"
              onClick={() => setActiveTab("orders")}
              className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold transition-colors cursor-pointer ${
                activeTab === "orders"
                  ? "bg-amber-600 text-white shadow-2xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              <PackageCheck size={15} />
              <span>Đơn đổi quà {myOrders.length > 0 && `(${myOrders.length})`}</span>
            </button>
          )}
        </div>

        {/* Shortcuts */}
        <div className="flex items-center gap-2">
          {!isGuest && (
            <Link
              href="/student/profile?tab=inventory"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-2xs hover:bg-amber-50 hover:text-amber-800 hover:border-amber-300 transition-colors"
            >
              <Backpack size={15} className="text-amber-600" />
              <span>Kho đồ của tôi</span>
            </Link>
          )}
          <Link
            href="/arena"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-2xs hover:bg-amber-50 hover:text-amber-800 hover:border-amber-300 transition-colors"
          >
            <Trophy size={15} className="text-amber-600" />
            <span>Bảng xếp hạng</span>
          </Link>
        </div>
      </div>

      {/* TAB CONTENT: SHOP */}
      {activeTab === "shop" && (
        <div className="space-y-6">
          {/* Filters & Search Toolbar */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Category Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`rounded-xl px-3.5 py-2 text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                    selectedCategory === cat.id
                      ? "bg-slate-900 text-white shadow-2xs"
                      : "bg-white text-slate-600 border border-slate-200 hover:border-slate-300 hover:text-slate-900"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative w-full md:w-64">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm vật phẩm..."
                className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-8 text-xs font-medium text-slate-800 placeholder-slate-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Products Grid / States */}
          {isProductsLoading ? (
            /* Loading Skeletons */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="animate-pulse rounded-2xl border border-slate-200 bg-white p-5 space-y-4"
                >
                  <div className="flex justify-between">
                    <div className="h-4 w-16 bg-slate-100 rounded" />
                    <div className="h-4 w-20 bg-slate-100 rounded" />
                  </div>
                  <div className="h-28 w-full bg-slate-100 rounded-xl" />
                  <div className="h-5 w-3/4 bg-slate-100 rounded" />
                  <div className="h-4 w-full bg-slate-100 rounded" />
                  <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                    <div className="h-6 w-16 bg-slate-100 rounded" />
                    <div className="h-8 w-24 bg-slate-100 rounded-xl" />
                  </div>
                </div>
              ))}
            </div>
          ) : isProductsError ? (
            /* Error State */
            <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-8 text-center space-y-3">
              <AlertCircle size={32} className="mx-auto text-rose-500" />
              <h3 className="text-base font-bold text-rose-900">Không thể tải danh sách vật phẩm</h3>
              <p className="text-xs text-rose-700 max-w-sm mx-auto">
                Đã xảy ra lỗi khi kết nối với máy chủ cửa hàng. Vui lòng thử lại sau.
              </p>
              <button
                type="button"
                onClick={() => refetchProducts()}
                className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700 transition-colors cursor-pointer"
              >
                <RefreshCw size={14} /> Thử lại
              </button>
            </div>
          ) : filteredProducts.length === 0 ? (
            /* Empty State */
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center space-y-3">
              <ShoppingBag size={36} className="mx-auto text-slate-300" />
              <h3 className="text-base font-bold text-slate-700">Không tìm thấy vật phẩm</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                {searchQuery
                  ? `Không có kết quả nào khớp với từ khóa "${searchQuery}". Hãy thử tìm kiếm bằng từ khác.`
                  : "Hiện chưa có vật phẩm nào trong danh mục này."}
              </p>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  Xóa bộ lọc tìm kiếm
                </button>
              )}
            </div>
          ) : (
            /* Real Products Grid */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredProducts.map((product) => {
                const unlocked = isItemUnlocked(product);
                const isEquipped =
                  (product.category === "AVATAR_FRAME" &&
                    (equippedAvatarFrame === product.slug || equippedAvatarFrame === String(product.id))) ||
                  (product.category === "BADGE" &&
                    (equippedBadge === product.slug || equippedBadge === String(product.id)));

                return (
                  <MarketItemCard
                    key={product.id}
                    product={product}
                    isUnlocked={unlocked}
                    isEquipped={isEquipped}
                    canAfford={(balanceData?.totalBanh || 0) >= product.price && !isSubmitting}
                    isGuest={isGuest}
                    onRedeem={handleRedeem}
                    onEquipToggle={handleEquipToggle}
                  />
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: ORDERS */}
      {!isGuest && activeTab === "orders" && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-5">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-lg font-bold text-slate-900">Lịch sử đổi quà của bạn</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Theo dõi trạng thái các phần quà hiện vật và voucher từ quản trị viên.
            </p>
          </div>

          {isOrdersLoading ? (
            <div className="py-12 text-center text-xs font-semibold text-slate-400">
              Đang tải danh sách đơn đổi quà...
            </div>
          ) : myOrders.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <PackageCheck size={36} className="mx-auto text-slate-300" />
              <p className="text-sm font-bold text-slate-600">Bạn chưa có đơn đổi quà nào</p>
              <p className="text-xs text-slate-400">Hãy tích lũy Bánh Mì để nhận những phần quà ý nghĩa nhé.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {myOrders.map((order) => {
                const isPending = order.status?.toUpperCase() === "PENDING";
                const isApproved = order.status?.toUpperCase() === "APPROVED";
                const isRejected = order.status?.toUpperCase() === "REJECTED";
                const isRefunded = order.status?.toUpperCase() === "REFUNDED";

                const itemsText = Array.isArray(order.items)
                  ? order.items.map((i) => `${i.name || i.slug || "Vật phẩm"} (x${i.quantity || 1})`).join(", ")
                  : "Quà tặng";

                return (
                  <div
                    key={order.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-slate-100 bg-slate-50/70 p-4 transition-colors hover:bg-slate-50"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-400">#{order.id}</span>
                        <h4 className="text-sm font-bold text-slate-900">{itemsText}</h4>
                      </div>
                      <p className="text-xs text-slate-400">
                        Thời gian: {new Date(order.createdAt).toLocaleString("vi-VN")}
                      </p>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4">
                      <div className="text-left sm:text-right">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                          Chi phí
                        </span>
                        <span className="text-sm font-bold text-amber-900">
                          {order.totalPrice.toLocaleString("vi-VN")} Bánh Mì
                        </span>
                      </div>

                      <div>
                        {isPending && (
                          <span className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-800">
                            <Clock size={13} className="animate-spin" /> Đang chờ duyệt
                          </span>
                        )}
                        {isApproved && (
                          <span className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800">
                            <CheckCircle2 size={13} /> Đã phê duyệt
                          </span>
                        )}
                        {(isRejected || isRefunded) && (
                          <span className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-800">
                            <AlertCircle size={13} /> Từ chối (Đã hoàn bánh)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Guest AuthGateModal */}
      <AuthGateModal
        isOpen={authGateOpen}
        onClose={() => setAuthGateOpen(false)}
        targetLabel={pendingItemName}
        targetRoute="/market"
        onOpenLogin={() => router.push("/login?redirect=/market")}
        onOpenRegister={() => router.push("/register?redirect=/market")}
      />
    </div>
  );
};

export default MarketScreen;
