"use client";

import React from "react";

export interface PageHeaderAction {
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
  id?: string;
  variant?: "primary" | "secondary";
}

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  badge?: {
    text: string | number;
    color?: "blue" | "emerald" | "rose" | "indigo" | "slate";
    pulse?: boolean;
  };
  onRefresh?: () => void;
  isRefreshing?: boolean;
  action?: PageHeaderAction;
  primaryAction?: PageHeaderAction;
  children?: React.ReactNode;
}

export function PageHeader({
  title,
  subtitle,
  badge,
  onRefresh,
  isRefreshing = false,
  action,
  primaryAction,
  children,
}: PageHeaderProps) {
  const resolvedAction = primaryAction || action;
  const getBadgeColor = (color = "blue") => {
    switch (color) {
      case "emerald":
        return "bg-emerald-50 text-emerald-700 border-emerald-200/60";
      case "rose":
        return "bg-rose-50 text-rose-700 border-rose-200/60";
      case "indigo":
        return "bg-indigo-50 text-indigo-700 border-indigo-200/60";
      case "slate":
        return "bg-slate-100 text-slate-700 border-slate-200/60";
      default:
        return "bg-blue-50 text-blue-700 border-blue-200/60";
    }
  };

  const getDotColor = (color = "blue") => {
    switch (color) {
      case "emerald":
        return "bg-emerald-500";
      case "rose":
        return "bg-rose-500";
      case "indigo":
        return "bg-indigo-500";
      case "slate":
        return "bg-slate-400";
      default:
        return "bg-blue-500";
    }
  };

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            {title}
          </h1>
          {badge && (
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold border ${getBadgeColor(
                badge.color
              )}`}
            >
              {badge.pulse && (
                <span
                  className={`h-1.5 w-1.5 rounded-full ${getDotColor(badge.color)} animate-pulse`}
                />
              )}
              {badge.text}
            </span>
          )}
        </div>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-2.5">
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-xs hover:bg-slate-50 hover:text-slate-900 disabled:opacity-60 transition-colors cursor-pointer"
            title="Reload records from server"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className={`h-4 w-4 ${isRefreshing ? "animate-spin text-blue-600" : "text-slate-500"}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            <span className="hidden sm:inline">Refresh</span>
          </button>
        )}

        {resolvedAction && (
          <button
            id={resolvedAction.id}
            type="button"
            onClick={resolvedAction.onClick}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold shadow-xs transition-colors cursor-pointer ${
              resolvedAction.variant === "secondary"
                ? "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                : "bg-blue-600 text-white shadow-blue-500/20 hover:bg-blue-700 active:bg-blue-800"
            }`}
          >
            {resolvedAction.icon || (
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
                  strokeWidth={2.2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
            )}
            <span>{resolvedAction.label}</span>
          </button>
        )}

        {children}
      </div>
    </div>
  );
}
