"use client";

import React from "react";

export interface ColumnDef<T> {
  header: string;
  className?: string;
  align?: "left" | "center" | "right";
  render: (item: T, index: number) => React.ReactNode;
}

export interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  keyExtractor: (item: T, index: number) => string;
  isLoading?: boolean;
  loadingMessage?: string;
  emptyState?: {
    title: string;
    description: string;
    actionLabel?: string;
    onAction?: () => void;
  };
  footer?: {
    itemCount: number;
    totalCount: number;
    entityLabel: string;
    note?: string;
  };
  className?: string;
}

export function DataTable<T>({
  data,
  columns,
  keyExtractor,
  isLoading = false,
  loadingMessage = "Loading records...",
  emptyState = {
    title: "No records found",
    description: "No data matches the current criteria.",
  },
  footer,
  className = "",
}: DataTableProps<T>) {
  if (isLoading) {
    return (
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
        <div className="flex flex-col items-center justify-center py-20">
          <div className="h-10 w-10 animate-spin rounded-full border-3 border-blue-600 border-t-transparent" />
          <p className="mt-4 text-sm font-medium text-slate-600">{loadingMessage}</p>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-8 w-8"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <h3 className="mt-4 text-base font-bold text-slate-900">{emptyState.title}</h3>
          <p className="mt-1 max-w-sm text-sm text-slate-500">{emptyState.description}</p>
          {emptyState.actionLabel && emptyState.onAction && (
            <button
              type="button"
              onClick={emptyState.onAction}
              className="mt-4 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors cursor-pointer"
            >
              {emptyState.actionLabel}
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs ${className}`}
    >
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500 select-none">
            <tr>
              {columns.map((col, idx) => {
                const isFirst = idx === 0;
                const isLast = idx === columns.length - 1;
                const alignClass =
                  col.align === "right"
                    ? "text-right"
                    : col.align === "center"
                    ? "text-center"
                    : "text-left";
                const paddingClass = isFirst
                  ? "py-3.5 pl-6 pr-4"
                  : isLast
                  ? "py-3.5 pl-4 pr-6"
                  : "px-4 py-3.5";

                return (
                  <th
                    key={col.header || idx}
                    scope="col"
                    className={`${paddingClass} ${alignClass} ${col.className || ""}`}
                  >
                    {col.header}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.map((item, index) => (
              <tr
                key={keyExtractor(item, index)}
                className="hover:bg-slate-50/60 transition-colors group"
              >
                {columns.map((col, colIdx) => {
                  const isFirst = colIdx === 0;
                  const isLast = colIdx === columns.length - 1;
                  const alignClass =
                    col.align === "right"
                      ? "text-right"
                      : col.align === "center"
                      ? "text-center"
                      : "text-left";
                  const paddingClass = isFirst
                    ? "py-4 pl-6 pr-4"
                    : isLast
                    ? "py-4 pl-4 pr-6"
                    : "px-4 py-4";

                  return (
                    <td
                      key={colIdx}
                      className={`${paddingClass} ${alignClass} ${col.className || ""}`}
                    >
                      {col.render(item, index)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {footer && (
        <div className="flex items-center justify-between border-t border-slate-200 px-6 py-3.5 bg-slate-50/50 text-xs text-slate-500">
          <span>
            Showing <strong className="font-semibold text-slate-700">{footer.itemCount}</strong> of{" "}
            <strong className="font-semibold text-slate-700">{footer.totalCount}</strong> total{" "}
            {footer.entityLabel}
          </span>
          {footer.note && <span>{footer.note}</span>}
        </div>
      )}
    </div>
  );
}
