"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Loader2,
  Search,
  Trash2,
  Edit2,
  Send,
  Layers,
  ArrowRight,
} from "lucide-react";
import axiosClient from "@/lib/api/axiosClient";
import { Pagination } from "@/components/ui";
import { useAdminList } from "@/components/admin/useAdminList";
import { ADMIN_PAGE_SIZES } from "@/components/admin/adminList";
import toast from "react-hot-toast";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { getApiErrorMessage } from "@/lib/utils/apiError";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  STATUS_LABELS,
  categoryLabel,
  levelLabel,
  type SpeakingCategory,
  type SpeakingPracticeSet,
} from "@/components/admin/speaking/speakingCmsShared";

export default function AdminSpeakingPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [levelFilter, setLevelFilter] = useState<string>("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<
    "ALL" | "DRAFT" | "PUBLISHED"
  >("ALL");
  const [sortBy, setSortBy] = useState<
    "UPDATED" | "TITLE" | "LEVEL" | "FEWEST"
  >("UPDATED");
  const [showCategoryManagement, setShowCategoryManagement] = useState(false);
  const [categorySearch, setCategorySearch] = useState("");
  const [categoryCreateOpen, setCategoryCreateOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryCode, setNewCategoryCode] = useState("");
  const [newCategoryAllowExercise, setNewCategoryAllowExercise] =
    useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(
    null,
  );
  const [editingCategoryName, setEditingCategoryName] = useState("");
  const [editingCategoryDescription, setEditingCategoryDescription] =
    useState("");

  // Delete confirmations
  const [pendingDeleteSet, setPendingDeleteSet] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const [pendingLifecycle, setPendingLifecycle] =
    useState<SpeakingPracticeSet | null>(null);

  // QUERY SPEAKING PRACTICE SETS
  // One page from the server; search, filters and sort run there too.
  // 12 divides into the 2, 3 and 4 card rows the grid makes.
  const list = useAdminList<
    SpeakingPracticeSet,
    { total: number; published: number; levels: string[] }
  >({
    key: "admin-speaking-sets",
    url: "/admin/skill-content/speaking",
    search: searchTerm,
    filters: {
      level: levelFilter,
      category: categoryFilter,
      status: statusFilter,
      sort: sortBy === "UPDATED" ? "NEWEST" : sortBy,
    },
    initialPageSize: 12,
  });
  const isLoading = list.isLoading;
  // The page resets itself when a filter changes.
  const setCurrentPage = list.setPage;

  const { data: categories = [] } = useQuery<SpeakingCategory[]>({
    queryKey: ["admin-speaking-categories"],
    queryFn: async () => {
      const res: any = await axiosClient.get(
        "/admin/skill-content/speaking/categories?includeInactive=true",
      );
      return Array.isArray(res) ? res : res?.data || [];
    },
  });

  const createCategoryMutation = useMutation({
    mutationFn: async () => {
      const response: any = await axiosClient.post(
        "/admin/skill-content/speaking/categories",
        {
          name: newCategoryName.trim(),
          code: newCategoryCode.trim() || undefined,
          allowPracticeSet: true,
          allowExercise: newCategoryAllowExercise,
        },
      );
      return response?.data || response;
    },
    onSuccess: () => {
      toast.success("Đã tạo phân loại Speaking.");
      queryClient.invalidateQueries({
        queryKey: ["admin-speaking-categories"],
      });
      setCategoryCreateOpen(false);
      setNewCategoryName("");
      setNewCategoryCode("");
      setNewCategoryAllowExercise(false);
    },
    onError: (err: any) => {
      toast.error(getApiErrorMessage(err, "Không thể tạo phân loại Speaking."));
    },
  });

  const updateCategoryMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number;
      data: Partial<SpeakingCategory>;
    }) =>
      axiosClient.patch(`/admin/skill-content/speaking/categories/${id}`, data),
    onSuccess: () => {
      toast.success("Đã cập nhật phân loại Speaking.");
      setEditingCategoryId(null);
      queryClient.invalidateQueries({
        queryKey: ["admin-speaking-categories"],
      });
      queryClient.invalidateQueries({ queryKey: ["admin-speaking-sets"] });
    },
    onError: (err: any) => {
      toast.error(
        getApiErrorMessage(err, "Không thể cập nhật phân loại Speaking."),
      );
    },
  });

  const toggleCategory = (category: SpeakingCategory) => {
    updateCategoryMutation.mutate({
      id: category.id,
      data: { isActive: !category.isActive },
    });
  };

  // MUTATION: DELETE SET
  const deleteSetMutation = useMutation({
    mutationFn: async (id: string) => {
      return axiosClient.delete(`/admin/skill-content/speaking/${id}`);
    },
    onSuccess: () => {
      toast.success("Đã xóa bộ luyện nói!");
      setPendingDeleteSet(null);
      queryClient.invalidateQueries({ queryKey: ["admin-speaking-sets"] });
    },
    onError: (err: any) => {
      toast.error(getApiErrorMessage(err, "Không thể xóa bộ luyện nói."));
    },
  });

  // MUTATION: PUBLISH SET
  const publishSetMutation = useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: string;
      status: "DRAFT" | "PUBLISHED";
    }) => {
      return axiosClient.post(`/admin/skill-content/speaking/${id}/publish`, {
        status,
      });
    },
    onSuccess: (_, variables) => {
      toast.success(
        variables.status === "PUBLISHED"
          ? "Đã xuất bản bộ luyện nói thành công!"
          : "Đã chuyển bộ luyện nói về bản nháp!",
      );
      queryClient.invalidateQueries({ queryKey: ["admin-speaking-sets"] });
    },
    onError: (err: any) => {
      toast.error(
        getApiErrorMessage(err, "Không thể thay đổi trạng thái xuất bản."),
      );
    },
  });

  const totalSets = list.facets?.total ?? 0;
  const publishedSetCount = list.facets?.published ?? 0;
  const setFiltersActive =
    searchTerm.trim() !== "" ||
    levelFilter !== "ALL" ||
    categoryFilter !== "ALL" ||
    statusFilter !== "ALL";
  const levelOptions = list.facets?.levels ?? [];
  const paginatedSets = list.items;

  return (
    <div className="space-y-6 p-6">
      {/* HEADER */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-950">
            Bộ luyện nói
          </h1>
          <p className="mt-1 text-sm tabular-nums text-slate-600">
            {totalSets} bộ · {publishedSetCount} đã xuất bản ·{" "}
            {totalSets - publishedSetCount} bản nháp
          </p>
        </div>

        <Link
          href="/admin/speaking/new"
          className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white transition-colors hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        >
          <Plus size={16} /> Tạo bộ luyện
        </Link>
      </div>

      {/* FILTERS */}
      <div className="space-y-3">
        <label className="relative block">
          <span className="sr-only">Tìm bộ luyện nói</span>
          <Search
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            size={18}
            aria-hidden="true"
          />
          <input
            type="text"
            placeholder="Tìm theo tên, mô tả, phân loại..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="min-h-11 w-full rounded-lg border border-slate-200 bg-white py-2 pl-10 pr-3 text-sm text-slate-900 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
          />
        </label>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          <label className="flex items-center gap-2 text-sm text-slate-600">
            Trình độ
            <select
              value={levelFilter}
              onChange={(e) => {
                setLevelFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="min-h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
            >
              <option value="ALL">Tất cả</option>
              {levelOptions.map((level) => (
                <option key={level} value={level}>
                  {levelLabel(level)}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            Phân loại
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="min-h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
            >
              <option value="ALL">Tất cả</option>
              {categories.map((category) => (
                <option key={category.code} value={category.code}>
                  {category.name}
                  {category.isActive ? "" : " (đã tắt)"}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            Trạng thái
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as typeof statusFilter);
                setCurrentPage(1);
              }}
              className="min-h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
            >
              <option value="ALL">Tất cả</option>
              <option value="DRAFT">Bản nháp</option>
              <option value="PUBLISHED">Đã xuất bản</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            Sắp xếp
            <select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value as typeof sortBy);
                setCurrentPage(1);
              }}
              className="min-h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
            >
              <option value="UPDATED">Mới cập nhật trước</option>
              <option value="LEVEL">Trình độ thấp → cao</option>
              <option value="TITLE">Tên A → Z</option>
              <option value="FEWEST">Ít câu luyện trước</option>
            </select>
          </label>
          <div className="ml-auto flex items-center gap-3 text-sm text-slate-600">
            <span className="tabular-nums">
              {list.total === totalSets
                ? `${list.total} bộ`
                : `Khớp ${list.total}/${totalSets}`}
              {list.isFetching && !isLoading ? " · đang tải" : ""}
            </span>
            {setFiltersActive && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm("");
                  setLevelFilter("ALL");
                  setCategoryFilter("ALL");
                  setStatusFilter("ALL");
                  setCurrentPage(1);
                }}
                className="cursor-pointer font-semibold text-slate-900 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
              >
                Xóa bộ lọc
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-xs">
        <button
          type="button"
          onClick={() => setShowCategoryManagement((value) => !value)}
          className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold text-slate-800"
        >
          <span>Quản lý phân loại Speaking</span>
          <span className="text-xs font-normal text-slate-500">
            {categories.length} phân loại ·{" "}
            {showCategoryManagement ? "Thu gọn" : "Mở rộng"}
          </span>
        </button>
        {showCategoryManagement ? (
          <div className="border-t border-slate-100 p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <input
                value={categorySearch}
                onChange={(event) => setCategorySearch(event.target.value)}
                placeholder="Tìm theo tên hoặc mã phân loại..."
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 outline-none focus:border-slate-400 sm:max-w-sm"
              />
              <button
                type="button"
                onClick={() => setCategoryCreateOpen((open) => !open)}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800"
              >
                <Plus size={14} /> Thêm phân loại
              </button>
            </div>
            {categoryCreateOpen && (
              <div className="mt-3 grid gap-2 rounded-lg border border-slate-200 p-3 sm:grid-cols-[1fr_1fr_auto]">
                <input
                  value={newCategoryName}
                  onChange={(event) => setNewCategoryName(event.target.value)}
                  placeholder="Tên phân loại"
                  aria-label="Tên phân loại mới"
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                />
                <input
                  value={newCategoryCode}
                  onChange={(event) => setNewCategoryCode(event.target.value)}
                  placeholder="Mã (tuỳ chọn)"
                  aria-label="Mã phân loại mới"
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                />
                <button
                  type="button"
                  disabled={
                    !newCategoryName.trim() || createCategoryMutation.isPending
                  }
                  onClick={() => createCategoryMutation.mutate()}
                  className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  Tạo
                </button>
                <label className="flex items-center gap-2 text-sm text-slate-600 sm:col-span-3">
                  <input
                    type="checkbox"
                    checked={newCategoryAllowExercise}
                    onChange={(event) =>
                      setNewCategoryAllowExercise(event.target.checked)
                    }
                    className="size-4 rounded border-slate-300"
                  />
                  Cho phép chọn riêng cho từng câu luyện
                </label>
              </div>
            )}
            <div className="mt-3 space-y-2">
              {categories
                .filter((category) => {
                  const query = categorySearch.trim().toLowerCase();
                  return (
                    !query ||
                    category.name.toLowerCase().includes(query) ||
                    category.code.toLowerCase().includes(query)
                  );
                })
                .map((category) => (
                  <div
                    key={category.id}
                    className="rounded-lg border border-slate-200 p-3"
                  >
                    {editingCategoryId === category.id ? (
                      <div className="grid gap-2 md:grid-cols-[1fr_1fr_auto]">
                        <input
                          value={editingCategoryName}
                          onChange={(event) =>
                            setEditingCategoryName(event.target.value)
                          }
                          aria-label={`Tên ${category.code}`}
                          className="rounded border border-slate-300 px-2 py-1.5 text-xs text-slate-900"
                        />
                        <input
                          value={editingCategoryDescription}
                          onChange={(event) =>
                            setEditingCategoryDescription(event.target.value)
                          }
                          aria-label={`Mô tả ${category.code}`}
                          placeholder="Mô tả"
                          className="rounded border border-slate-300 px-2 py-1.5 text-xs text-slate-900"
                        />
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              updateCategoryMutation.mutate({
                                id: category.id,
                                data: {
                                  name: editingCategoryName,
                                  description: editingCategoryDescription,
                                },
                              })
                            }
                            className="rounded bg-slate-900 px-2 py-1 text-xs font-semibold text-white"
                          >
                            Lưu
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingCategoryId(null)}
                            className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-700"
                          >
                            Hủy
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-slate-800">
                              {category.name}
                            </span>
                            <code className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-600">
                              {category.code}
                            </code>
                            <span
                              className={`rounded px-1.5 py-0.5 text-[11px] ${category.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}
                            >
                              {category.isActive ? "Đang dùng" : "Đã tắt"}
                            </span>
                          </div>
                          <p className="mt-1 text-[11px] text-slate-500">
                            {category._count?.practiceSets || 0} bộ ·{" "}
                            {category._count?.exercises || 0} câu ·{" "}
                            {category.allowPracticeSet ? "Bộ luyện" : ""}
                            {category.allowPracticeSet && category.allowExercise
                              ? " · "
                              : ""}
                            {category.allowExercise ? "Câu luyện" : ""}
                          </p>
                        </div>
                        <div className="flex gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingCategoryId(category.id);
                              setEditingCategoryName(category.name);
                              setEditingCategoryDescription(
                                category.description || "",
                              );
                            }}
                            className="rounded border border-slate-200 px-2 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            Sửa
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleCategory(category)}
                            className="rounded border border-slate-200 px-2 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            {category.isActive ? "Tắt" : "Bật"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </div>
        ) : null}
      </div>

      {/* PRACTICE SETS LIST */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-slate-400" size={32} />
        </div>
      ) : paginatedSets.length > 0 ? (
        <div className="space-y-4">
          {/* Cards fill the canvas in 320px-minimum columns (3 at 1440,
              4 at 1920) with one 16px gutter. */}
          <div className="grid grid-cols-[repeat(auto-fill,minmax(min(320px,100%),1fr))] gap-4">
            {paginatedSets.map((set) => (
              <div
                key={set.id}
                className="flex h-full flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:border-slate-300"
              >
                <div className="flex items-center gap-2">
                  <span className="flex-none rounded-md bg-blue-50 px-1.5 py-0.5 text-xs font-semibold text-blue-800">
                    {levelLabel(set.level)}
                  </span>
                  <span className="truncate text-xs text-slate-500">
                    {categoryLabel(categories, set.category)}
                  </span>
                  <span
                    className={`ml-auto flex-none whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-semibold ${
                      set.publicationStatus === "PUBLISHED"
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-amber-50 text-amber-800"
                    }`}
                  >
                    {STATUS_LABELS[set.publicationStatus]}
                  </span>
                </div>
                <h2 className="mt-3 line-clamp-2 font-semibold text-slate-950">
                  <Link
                    href={`/admin/speaking/${set.id}`}
                    className="hover:text-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                  >
                    {set.title}
                  </Link>
                </h2>
                <p className="mt-1 line-clamp-2 text-sm text-slate-600">
                  {set.description || "Chưa có mô tả cho bộ luyện tập này."}
                </p>
                <div className="mt-auto pt-4">
                  <div className="flex items-center gap-2 border-t border-slate-100 pt-3 text-sm text-slate-600">
                    <span className="tabular-nums">
                      {set.exercises?.length || 0} câu luyện
                    </span>
                    <div className="ml-auto flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => router.push(`/admin/speaking/${set.id}`)}
                        className="inline-flex size-9 cursor-pointer items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                        aria-label={`Chỉnh sửa ${set.title}`}
                        title="Chỉnh sửa"
                      >
                        <Edit2 size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setPendingLifecycle(set)}
                        className="inline-flex size-9 cursor-pointer items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                        aria-label={`${set.publicationStatus === "PUBLISHED" ? "Chuyển về bản nháp" : "Xuất bản"} ${set.title}`}
                        title={
                          set.publicationStatus === "PUBLISHED"
                            ? "Chuyển về bản nháp"
                            : "Xuất bản"
                        }
                      >
                        <Send size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setPendingDeleteSet({ id: set.id, title: set.title })
                        }
                        className="inline-flex size-9 cursor-pointer items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                        aria-label={`Xóa ${set.title}`}
                        title="Xóa bộ"
                      >
                        <Trash2 size={15} />
                      </button>
                      <Link
                        href={`/admin/speaking/${set.id}`}
                        className="inline-flex min-h-9 items-center gap-1 rounded-lg px-2 font-semibold text-slate-900 transition-colors hover:text-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                      >
                        Mở <ArrowRight size={14} aria-hidden="true" />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2">
            <Pagination
              currentPage={list.page}
              totalPages={list.totalPages}
              totalItems={list.total}
              pageSize={list.pageSize}
              onPageChange={list.setPage}
              onPageSizeChange={list.setPageSize}
              pageSizeOptions={ADMIN_PAGE_SIZES}
            />
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-300 p-12 text-center text-sm text-slate-500">
          <Layers size={32} className="mx-auto mb-2 text-slate-300" />
          {totalSets
            ? "Không có bộ luyện nào khớp bộ lọc. Hãy đổi từ khóa hoặc bộ lọc."
            : "Chưa có bộ luyện nói nào. Nhấn “Tạo bộ luyện” để bắt đầu."}
        </div>
      )}

      {/* CONFIRM DELETE SET */}
      {pendingDeleteSet && (
        <ConfirmDialog
          open={true}
          title="Xóa bộ luyện nói"
          description={`Bạn có chắc muốn xóa bộ luyện "${pendingDeleteSet.title}"? Mọi câu luyện nói bên trong sẽ bị xóa.`}
          confirmLabel="Xác nhận xóa"
          onConfirm={() => deleteSetMutation.mutate(pendingDeleteSet.id)}
          onCancel={() => setPendingDeleteSet(null)}
        />
      )}

      {pendingLifecycle && (
        <ConfirmDialog
          open={true}
          title={
            pendingLifecycle.publicationStatus === "PUBLISHED"
              ? "Chuyển bộ luyện về bản nháp?"
              : "Xuất bản bộ luyện?"
          }
          description={
            pendingLifecycle.publicationStatus === "PUBLISHED"
              ? "Bộ luyện sẽ không còn hiển thị cho người học cho đến khi được xuất bản lại."
              : "Bộ luyện và các câu luyện bên trong sẽ hiển thị cho người học."
          }
          confirmLabel={
            pendingLifecycle.publicationStatus === "PUBLISHED"
              ? "Chuyển về bản nháp"
              : "Xuất bản"
          }
          onConfirm={() => {
            publishSetMutation.mutate({
              id: pendingLifecycle.id,
              status:
                pendingLifecycle.publicationStatus === "PUBLISHED"
                  ? "DRAFT"
                  : "PUBLISHED",
            });
            setPendingLifecycle(null);
          }}
          onCancel={() => setPendingLifecycle(null)}
        />
      )}

    </div>
  );
}
