"use client";

import React from "react";
import { Icon } from "@iconify/react";

export interface Column<T> {
  key: string;
  header: string;
  cell?: (item: T) => React.ReactNode;
}

export interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  loading: boolean;
  pagination?: PaginationInfo;
  onPageChange?: (page: number) => void;
  emptyIcon?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: React.ReactNode;
}

export function DataTable<T extends { _id: string }>({
  data,
  columns,
  loading,
  pagination,
  onPageChange,
  emptyIcon = "mdi:folder-open-outline",
  emptyTitle = "No records found",
  emptyDescription = "There are no records matching your criteria.",
  emptyAction,
}: DataTableProps<T>) {
  if (loading && !data.length) {
    return (
      <div className="divide-y divide-gray-100">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-6 py-4 animate-pulse">
            <div className="flex-1 space-y-2.5">
              <div className="h-4 w-32 bg-gray-200/60 rounded" />
              <div className="h-3 w-40 bg-gray-100/60 rounded" />
            </div>
            <div className="h-6 w-20 bg-gray-200/60 rounded-full" />
            <div className="h-6 w-24 bg-gray-200/60 rounded-full" />
            <div className="flex gap-2">
              <div className="h-8 w-8 bg-gray-200/60 rounded-lg" />
              <div className="h-8 w-8 bg-gray-200/60 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!data.length) {
    return (
      <div className="text-center py-16 px-6">
        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <Icon icon={emptyIcon} className="w-10 h-10 text-gray-400" />
        </div>
        <p className="text-lg font-semibold text-gray-900">{emptyTitle}</p>
        <p className="text-gray-500 mt-2 max-w-sm mx-auto">{emptyDescription}</p>
        {emptyAction && <div className="mt-6">{emptyAction}</div>}
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr className="bg-gray-50/80 border-b border-gray-100">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.map((row) => (
              <tr key={row._id} className="hover:bg-gray-50/80 transition-colors group">
                {columns.map((col) => (
                  <td key={col.key} className="px-6 py-4 whitespace-nowrap">
                    {col.cell ? col.cell(row) : (row as any)[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pagination && pagination.totalPages > 1 && onPageChange && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t border-gray-100 bg-gray-50/50">
          <p className="text-sm text-gray-500">
            Showing <span className="font-semibold text-gray-900">{(pagination.currentPage - 1) * pagination.itemsPerPage + 1}</span> to{" "}
            <span className="font-semibold text-gray-900">{Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalItems)}</span> of{" "}
            <span className="font-semibold text-gray-900">{pagination.totalItems}</span> results
          </p>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onPageChange(pagination.currentPage - 1)}
              disabled={!pagination.hasPrevPage}
              className="p-2 text-gray-500 hover:text-gray-900 hover:bg-white rounded-lg border border-transparent hover:border-gray-200 shadow-sm disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:border-transparent disabled:shadow-none transition-all"
            >
              <Icon icon="mdi:chevron-left" className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => onPageChange(page)}
                  className={`w-9 h-9 flex items-center justify-center text-sm font-semibold rounded-lg transition-all ${
                    pagination.currentPage === page
                      ? "bg-primary-600 text-white shadow-md shadow-primary-500/30"
                      : "text-gray-600 hover:bg-white hover:border-gray-200 border border-transparent"
                  }`}
                >
                  {page}
                </button>
              ))}
            </div>
            <button
              onClick={() => onPageChange(pagination.currentPage + 1)}
              disabled={!pagination.hasNextPage}
              className="p-2 text-gray-500 hover:text-gray-900 hover:bg-white rounded-lg border border-transparent hover:border-gray-200 shadow-sm disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:border-transparent disabled:shadow-none transition-all"
            >
              <Icon icon="mdi:chevron-right" className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
