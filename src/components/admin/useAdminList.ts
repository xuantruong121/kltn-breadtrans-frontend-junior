"use client";

import { useEffect, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import axiosClient from "@/lib/api/axiosClient";
import { adminListParams, type AdminListPage } from "./adminList";

/**
 * One page of a server-paged admin list. Search text is debounced; any
 * change of search or filters goes back to page 1. The query key starts
 * with `key`, so invalidating `[key]` refreshes every page.
 */
export function useAdminList<T, F = Record<string, unknown>>({
  key,
  url,
  search,
  filters,
  initialPageSize = 12,
  enabled = true,
}: {
  key: string;
  url: string;
  search: string;
  filters: Record<string, string | undefined>;
  initialPageSize?: number;
  /** False while the screen shows something else (an editor). */
  enabled?: boolean;
}) {
  const [debounced, setDebounced] = useState(search.trim());
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const [pageSize, setPageSizeState] = useState(initialPageSize);
  const signature = JSON.stringify({ q: debounced, ...filters, pageSize });
  // The page belongs to one filter set; a new set starts at page 1.
  const [paging, setPaging] = useState({ page: 1, signature });
  const page = paging.signature === signature ? paging.page : 1;
  const setPage = (next: number) => setPaging({ page: next, signature });
  const setPageSize = (size: number) => setPageSizeState(size);

  const params = adminListParams({ q: debounced, ...filters }, page, pageSize);
  const query = useQuery<AdminListPage<T, F>>({
    queryKey: [key, "page", params],
    enabled,
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const res: any = await axiosClient.get(url, { params });
      return (res?.data ?? res) as AdminListPage<T, F>;
    },
  });
  const data = query.data;
  return {
    items: data?.items ?? [],
    total: data?.total ?? 0,
    facets: data?.facets,
    // The server may move a page past the end back to the last page.
    page: data?.page ?? page,
    setPage,
    pageSize,
    setPageSize,
    totalPages: Math.max(1, Math.ceil((data?.total ?? 0) / pageSize)),
    isLoading: query.isLoading,
    isFetching: query.isFetching,
  };
}
