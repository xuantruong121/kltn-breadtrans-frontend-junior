"use client";

import React from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems?: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
  className?: string;
  showSummary?: boolean;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  pageSize = 10,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50],
  className = "",
  showSummary = true,
}) => {
  if (totalPages <= 1 && (!totalItems || totalItems <= pageSize)) {
    return null;
  }

  // Generate smart page numbers array
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible + 2) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);

      if (currentPage > 3) {
        pages.push("...");
      }

      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (currentPage < totalPages - 2) {
        pages.push("...");
      }

      pages.push(totalPages);
    }

    return pages;
  };

  const pages = getPageNumbers();
  const startItem = totalItems ? (currentPage - 1) * pageSize + 1 : 0;
  const endItem = totalItems ? Math.min(currentPage * pageSize, totalItems) : 0;

  return (
    <div
      className={`flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100 ${className}`}
    >
      {/* Left: Summary info & Page size selector */}
      {showSummary && totalItems !== undefined ? (
        <div className="flex items-center gap-3 text-xs font-semibold text-slate-500">
          <span>
            Hiển thị <strong className="text-slate-800 font-black">{startItem} - {endItem}</strong> trên <strong className="text-slate-800 font-black">{totalItems}</strong> mục
          </span>

          {onPageSizeChange && (
            <div className="hidden sm:flex items-center gap-1.5 pl-3 border-l border-slate-200">
              <span className="text-[11px] text-slate-400">Xem:</span>
              <select
                value={pageSize}
                onChange={(e) => onPageSizeChange(Number(e.target.value))}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-700 outline-none focus:border-blue-500"
              >
                {pageSizeOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt} / trang
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      ) : (
        <div />
      )}

      {/* Right: Pagination Controls */}
      <div className="flex items-center gap-1.5 self-center sm:self-auto">
        {/* First Page */}
        {totalPages > 4 && (
          <button
            type="button"
            onClick={() => onPageChange(1)}
            disabled={currentPage === 1}
            title="Trang đầu"
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-white border-2 border-slate-200 text-slate-500 hover:text-blue-600 hover:border-blue-300 disabled:opacity-40 disabled:pointer-events-none transition-all cursor-pointer shadow-2xs"
          >
            <ChevronsLeft size={16} />
          </button>
        )}

        {/* Prev Page */}
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          title="Trang trước"
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-white border-2 border-slate-200 text-slate-500 hover:text-blue-600 hover:border-blue-300 disabled:opacity-40 disabled:pointer-events-none transition-all cursor-pointer shadow-2xs"
        >
          <ChevronLeft size={16} />
        </button>

        {/* Page Numbers */}
        <div className="flex items-center gap-1">
          {pages.map((p, idx) => {
            if (p === "...") {
              return (
                <span
                  key={`ellipsis-${idx}`}
                  className="w-8 h-9 flex items-center justify-center text-slate-400 font-bold select-none"
                >
                  ...
                </span>
              );
            }

            const pageNum = Number(p);
            const isActive = pageNum === currentPage;

            return (
              <button
                key={`page-${pageNum}`}
                type="button"
                onClick={() => onPageChange(pageNum)}
                className={`w-9 h-9 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  isActive
                    ? "bg-blue-600 text-white shadow-md shadow-blue-500/20 border-2 border-blue-600"
                    : "bg-white border-2 border-slate-200 text-slate-600 hover:border-blue-300 hover:text-blue-600 shadow-2xs"
                }`}
              >
                {pageNum}
              </button>
            );
          })}
        </div>

        {/* Next Page */}
        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          title="Trang tiếp"
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-white border-2 border-slate-200 text-slate-500 hover:text-blue-600 hover:border-blue-300 disabled:opacity-40 disabled:pointer-events-none transition-all cursor-pointer shadow-2xs"
        >
          <ChevronRight size={16} />
        </button>

        {/* Last Page */}
        {totalPages > 4 && (
          <button
            type="button"
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage === totalPages}
            title="Trang cuối"
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-white border-2 border-slate-200 text-slate-500 hover:text-blue-600 hover:border-blue-300 disabled:opacity-40 disabled:pointer-events-none transition-all cursor-pointer shadow-2xs"
          >
            <ChevronsRight size={16} />
          </button>
        )}
      </div>
    </div>
  );
};
