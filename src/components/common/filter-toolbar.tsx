"use client";

import React from "react";

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterSelect {
  id: string;
  label?: string;
  value: string;
  onChange: (val: string) => void;
  options: FilterOption[];
}

export interface FilterToolbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  searchPlaceholder?: string;
  filters?: FilterSelect[];
  sortBy?: string;
  onSortChange?: (sort: string) => void;
  sortOptions?: FilterOption[];
  viewMode?: "table" | "grid";
  onViewModeChange?: (mode: "table" | "grid") => void;
  children?: React.ReactNode;
}

export function FilterToolbar({
  searchQuery,
  onSearchChange,
  searchPlaceholder = "Search records...",
  filters = [],
  sortBy,
  onSortChange,
  sortOptions = [],
  viewMode,
  onViewModeChange,
  children,
}: FilterToolbarProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
      {/* Search Input */}
      <div className="relative flex-1">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2 pl-10 pr-9 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => onSearchChange("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
            aria-label="Clear search"
          >
            &times;
          </button>
        )}
      </div>

      {/* Filters, Sort, and View Controls */}
      <div className="flex flex-wrap items-center gap-2.5">
        {filters.map((filter) => (
          <div key={filter.id} className="flex items-center gap-1.5">
            {filter.label && (
              <span className="text-xs font-medium text-slate-500 hidden sm:inline">
                {filter.label}:
              </span>
            )}
            <select
              id={filter.id}
              value={filter.value}
              onChange={(e) => filter.onChange(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white py-2 px-3 text-sm text-slate-700 shadow-xs focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
            >
              {filter.options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        ))}

        {sortBy !== undefined && onSortChange && sortOptions.length > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-slate-500 hidden sm:inline">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white py-2 px-3 text-sm text-slate-700 shadow-xs focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
            >
              {sortOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {viewMode !== undefined && onViewModeChange && (
          <div className="flex items-center rounded-xl border border-slate-200 bg-slate-100/70 p-1">
            <button
              type="button"
              onClick={() => onViewModeChange("grid")}
              className={`rounded-lg p-1.5 transition-colors cursor-pointer ${
                viewMode === "grid"
                  ? "bg-white text-blue-600 shadow-xs"
                  : "text-slate-500 hover:text-slate-700"
              }`}
              title="Grid View"
              aria-label="Grid View"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange("table")}
              className={`rounded-lg p-1.5 transition-colors cursor-pointer ${
                viewMode === "table"
                  ? "bg-white text-blue-600 shadow-xs"
                  : "text-slate-500 hover:text-slate-700"
              }`}
              title="Table View"
              aria-label="Table View"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
          </div>
        )}

        {children}
      </div>
    </div>
  );
}
