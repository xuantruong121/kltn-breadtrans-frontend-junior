"use client";

import { useState } from "react";

import { Pagination } from "@/components/ui";
import { CATALOG_PAGE_SIZES, catalogPage } from "@/lib/practice/catalogPage";

/** Pages a filtered list. A new `resetKey` (the filters) goes back to page 1. */
export function useCatalogPage<T>(list: readonly T[], resetKey: string) {
  const [requested, setRequested] = useState(1);
  const [pageSize, setPageSize] = useState(CATALOG_PAGE_SIZES[0]);
  const [seenKey, setSeenKey] = useState(resetKey);
  if (seenKey !== resetKey) {
    setSeenKey(resetKey);
    setRequested(1);
  }
  const { items, page, totalPages } = catalogPage(list, requested, pageSize);
  return {
    items,
    page,
    totalPages,
    total: list.length,
    pageSize,
    setPage: setRequested,
    setPageSize: (size: number) => {
      setPageSize(size);
      setRequested(1);
    },
  };
}

export function CatalogPagination({ paging }: { paging: ReturnType<typeof useCatalogPage> }) {
  return (
    <Pagination
      currentPage={paging.page}
      totalPages={paging.totalPages}
      totalItems={paging.total}
      pageSize={paging.pageSize}
      onPageChange={paging.setPage}
      onPageSizeChange={paging.setPageSize}
      pageSizeOptions={CATALOG_PAGE_SIZES}
      alwaysShow
    />
  );
}
