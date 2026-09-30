"use client";

import React from "react";
import Link from "next/link";
import { Sparkline } from "./sparkline";

export interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  badgeText?: string;
  badgeType?: "success" | "warning" | "neutral" | "info" | "purple";
  icon: React.ReactNode;
  href?: string;
  isLoading?: boolean;
  sparklineData?: number[];
  accentColor?: "indigo" | "emerald" | "blue" | "amber" | "rose";
  trend?: {
    value: string;
    isPositive: boolean;
  };
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
  sparklineData,
  accentColor = "indigo",
  trend,
}: StatCardProps) {
  const badgeStyles = {
    success: "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-800/60 shadow-2xs",
    warning: "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200/80 dark:border-amber-800/60 shadow-2xs",
    neutral: "bg-slate-100/90 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200/80 dark:border-slate-700",
    info: "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200/80 dark:border-blue-800/60 shadow-2xs",
    purple: "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200/80 dark:border-indigo-800/60 shadow-2xs",
  };

  const accentStyles = {
    indigo: {
      iconBg: "bg-indigo-50/80 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900/60 group-hover:bg-indigo-600 group-hover:text-white",
      topBar: "from-indigo-500 via-indigo-600 to-blue-500",
    },
    emerald: {
      iconBg: "bg-emerald-50/80 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/60 group-hover:bg-emerald-600 group-hover:text-white",
      topBar: "from-emerald-400 via-teal-500 to-emerald-600",
    },
    blue: {
      iconBg: "bg-blue-50/80 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-900/60 group-hover:bg-blue-600 group-hover:text-white",
      topBar: "from-sky-400 via-blue-500 to-indigo-500",
    },
    amber: {
      iconBg: "bg-amber-50/80 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-900/60 group-hover:bg-amber-600 group-hover:text-white",
      topBar: "from-amber-400 via-amber-500 to-orange-500",
    },
    rose: {
      iconBg: "bg-rose-50/80 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-900/60 group-hover:bg-rose-600 group-hover:text-white",
      topBar: "from-rose-400 via-rose-500 to-pink-500",
    },
  }[accentColor];

  const content = (
    <div
      className={`group relative overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white/95 dark:bg-slate-900/90 p-5 shadow-xs transition-all duration-300 backdrop-blur-xs ${
        href
          ? "hover:-translate-y-1 hover:border-indigo-300 dark:hover:border-indigo-700/80 hover:shadow-xl hover:shadow-indigo-900/5 cursor-pointer"
          : ""
      }`}
    >
      {/* Subtle Top Gradient Accent Strip */}
      <div
        className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${accentStyles.topBar} opacity-80 group-hover:opacity-100 transition-opacity`}
      />

      {/* Card Header: Title & Icon */}
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {title}
        </span>
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl border transition-all duration-300 shadow-xs ${accentStyles.iconBg}`}
        >
          {icon}
        </div>
      </div>

      {/* Main Metric Row with Sparkline */}
      <div className="mt-3 flex items-baseline justify-between gap-3">
        <div>
          {isLoading ? (
            <div className="h-8 w-20 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />
          ) : (
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                {value}
              </span>
              {trend && (
                <span
                  className={`inline-flex items-center text-xs font-semibold ${
                    trend.isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500 dark:text-rose-400"
                  }`}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className={`h-3.5 w-3.5 mr-0.5 ${
                      trend.isPositive ? "" : "rotate-180"
                    }`}
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {trend.value}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Dynamic Mini Sparkline */}
        {sparklineData && sparklineData.length > 0 && !isLoading && (
          <div className="opacity-90 group-hover:opacity-100 transition-opacity">
            <Sparkline
              data={sparklineData}
              color={accentColor}
              height={34}
              width={88}
              showDot={true}
            />
          </div>
        )}
      </div>

      {/* Card Footer: Subtitle & Badge */}
      <div className="mt-3 flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
        {subtitle && (
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate">
            {subtitle}
          </p>
        )}

        {badgeText && !isLoading && (
          <span
            className={`shrink-0 inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold ${badgeStyles[badgeType]}`}
          >
            {badgeText}
          </span>
        )}
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block focus:outline-none focus:ring-2 focus:ring-indigo-500/40 rounded-2xl">
        {content}
      </Link>
    );
  }

  return content;
}
