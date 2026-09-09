import React from "react";
import Link from "next/link";

export interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  badgeText?: string;
  badgeType?: "success" | "warning" | "neutral" | "info";
  icon: React.ReactNode;
  href?: string;
  isLoading?: boolean;
}

export function StatCard({
  title,
  value,
  subtitle,
  badgeText,
  badgeType = "neutral",
  icon,
  href,
  isLoading = false,
}: StatCardProps) {
  const badgeStyles = {
    success: "bg-emerald-50 text-emerald-700 border-emerald-200",
    warning: "bg-amber-50 text-amber-700 border-amber-200",
    neutral: "bg-slate-100 text-slate-700 border-slate-200",
    info: "bg-blue-50 text-blue-700 border-blue-200",
  };

  const content = (
    <div className={`rounded-xl border border-slate-200 bg-white p-5 shadow-xs transition-all ${href ? "hover:border-blue-300 hover:shadow-sm cursor-pointer group" : ""}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          {title}
        </span>
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-50 text-blue-600 border border-slate-100 group-hover:bg-blue-50 transition-colors">
          {icon}
        </div>
      </div>

      <div className="mt-3 flex items-baseline justify-between gap-2">
        {isLoading ? (
          <div className="h-8 w-16 animate-pulse rounded bg-slate-200" />
        ) : (
          <span className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            {value}
          </span>
        )}

        {badgeText && !isLoading && (
          <span
            className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${badgeStyles[badgeType]}`}
          >
            {badgeText}
          </span>
        )}
      </div>

      {subtitle && (
        <p className="mt-1 text-xs text-slate-500 font-normal">
          {subtitle}
        </p>
      )}
    </div>
  );

  if (href) {
    return <Link href={href} className="block">{content}</Link>;
  }

  return content;
}

