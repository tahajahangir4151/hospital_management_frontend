"use client";

import React, { useState, useId, useMemo } from "react";

interface DataPoint {
  label: string;
  admissions: number;
  discharges: number;
  bedOccupancy: number; // percentage
}

interface AdmissionsChartProps {
  realAdmissionsCount?: number;
  activeAdmissionsCount?: number;
}

export function AdmissionsChart({
  realAdmissionsCount = 24,
  activeAdmissionsCount = 18,
}: AdmissionsChartProps) {
  const [timeframe, setTimeframe] = useState<"7D" | "30D" | "6M">("7D");
  const [activeMetric, setActiveMetric] = useState<"all" | "admissions" | "discharges">("all");
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const gradientIdAdm = useId();
  const gradientIdDis = useId();

  // Dynamic datasets based on timeframe with realistic medical hospital flow pattern
  const data: DataPoint[] = useMemo(() => {
    if (timeframe === "7D") {
      const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
      const baseAdm = Math.max(3, Math.round(realAdmissionsCount / 4));
      return days.map((day, i) => {
        const variance = Math.sin(i * 1.2) * 3;
        const adm = Math.max(2, Math.round(baseAdm + variance + (i % 2 === 0 ? 2 : -1)));
        const dis = Math.max(1, Math.round(adm * 0.8 + (i % 3 === 0 ? 1 : -1)));
        const occ = Math.min(95, Math.max(60, Math.round(75 + variance * 2)));
        return {
          label: day,
          admissions: adm,
          discharges: dis,
          bedOccupancy: occ,
        };
      });
    }

    if (timeframe === "30D") {
      return [
        { label: "Week 1", admissions: 28, discharges: 24, bedOccupancy: 78 },
        { label: "Week 2", admissions: 35, discharges: 30, bedOccupancy: 86 },
        { label: "Week 3", admissions: 42, discharges: 37, bedOccupancy: 92 },
        { label: "Week 4", admissions: 31, discharges: 29, bedOccupancy: 79 },
      ];
    }

    // 6M
    return [
      { label: "May", admissions: 110, discharges: 98, bedOccupancy: 81 },
      { label: "Jun", admissions: 125, discharges: 112, bedOccupancy: 84 },
      { label: "Jul", admissions: 140, discharges: 130, bedOccupancy: 89 },
      { label: "Aug", admissions: 132, discharges: 124, bedOccupancy: 83 },
      { label: "Sep", admissions: 155, discharges: 142, bedOccupancy: 91 },
      { label: "Oct", admissions: 148, discharges: 139, bedOccupancy: 87 },
    ];
  }, [timeframe, realAdmissionsCount]);

  // Chart coordinates
  const svgWidth = 680;
  const svgHeight = 260;
  const paddingLeft = 40;
  const paddingRight = 24;
  const paddingTop = 28;
  const paddingBottom = 34;

  const chartWidth = svgWidth - paddingLeft - paddingRight;
  const chartHeight = svgHeight - paddingTop - paddingBottom;

  const maxVal = useMemo(() => {
    const highest = Math.max(...data.map((d) => Math.max(d.admissions, d.discharges)));
    return Math.ceil((highest * 1.25) / 5) * 5 || 10;
  }, [data]);

  const getY = (val: number) => {
    return svgHeight - paddingBottom - (val / maxVal) * chartHeight;
  };

  const getX = (idx: number) => {
    return paddingLeft + (idx / (data.length - 1)) * chartWidth;
  };

  // Build smooth bezier curves
  const makeSmoothPath = (values: number[]) => {
    const pts = values.map((val, idx) => ({ x: getX(idx), y: getY(val) }));
    return pts.reduce((acc, pt, i) => {
      if (i === 0) return `M ${pt.x},${pt.y}`;
      const prev = pts[i - 1];
      const cpX1 = prev.x + (pt.x - prev.x) / 2;
      const cpY1 = prev.y;
      const cpX2 = prev.x + (pt.x - prev.x) / 2;
      const cpY2 = pt.y;
      return `${acc} C ${cpX1},${cpY1} ${cpX2},${cpY2} ${pt.x},${pt.y}`;
    }, "");
  };

  const admPath = makeSmoothPath(data.map((d) => d.admissions));
  const disPath = makeSmoothPath(data.map((d) => d.discharges));

  const admArea = `${admPath} L ${getX(data.length - 1)},${svgHeight - paddingBottom} L ${getX(
    0
  )},${svgHeight - paddingBottom} Z`;

  const disArea = `${disPath} L ${getX(data.length - 1)},${svgHeight - paddingBottom} L ${getX(
    0
  )},${svgHeight - paddingBottom} Z`;

  const totalAdm = data.reduce((acc, d) => acc + d.admissions, 0);
  const totalDis = data.reduce((acc, d) => acc + d.discharges, 0);
  const avgOccupancy = Math.round(data.reduce((acc, d) => acc + d.bedOccupancy, 0) / data.length);

  return (
    <div className="relative rounded-2xl border border-slate-200/80 bg-white/95 p-6 shadow-xs backdrop-blur-xs transition-all duration-300 hover:shadow-md hover:border-indigo-200">
      {/* Header Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-indigo-500 animate-pulse-glow" />
            <h3 className="text-base font-bold text-slate-900 tracking-tight">
              Patient Inflow & Discharge Analytics
            </h3>
            <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-700 border border-indigo-100">
              Live Flow
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Real-time inpatient admission demand vs discharge clearance velocity
          </p>
        </div>

        {/* Action Controls: Metrics toggle & Timeframe toggle */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Metric Selector */}
          <div className="flex items-center rounded-lg bg-slate-100/80 p-0.5 text-xs font-medium text-slate-600">
            <button
              type="button"
              onClick={() => setActiveMetric("all")}
              className={`rounded-md px-2.5 py-1 transition-all ${
                activeMetric === "all"
                  ? "bg-white text-slate-900 font-semibold shadow-2xs"
                  : "hover:text-slate-900"
              }`}
            >
              All Trends
            </button>
            <button
              type="button"
              onClick={() => setActiveMetric("admissions")}
              className={`rounded-md px-2.5 py-1 transition-all ${
                activeMetric === "admissions"
                  ? "bg-indigo-600 text-white font-semibold shadow-2xs"
                  : "hover:text-slate-900"
              }`}
            >
              Admissions
            </button>
            <button
              type="button"
              onClick={() => setActiveMetric("discharges")}
              className={`rounded-md px-2.5 py-1 transition-all ${
                activeMetric === "discharges"
                  ? "bg-teal-600 text-white font-semibold shadow-2xs"
                  : "hover:text-slate-900"
              }`}
            >
              Discharges
            </button>
          </div>

          {/* Timeframe Selector */}
          <div className="flex items-center rounded-lg border border-slate-200/80 bg-white p-0.5 text-xs font-semibold text-slate-600 shadow-2xs">
            {(["7D", "30D", "6M"] as const).map((period) => (
              <button
                key={period}
                type="button"
                onClick={() => {
                  setTimeframe(period);
                  setHoveredIndex(null);
                }}
                className={`rounded-md px-2.5 py-1 transition-all cursor-pointer ${
                  timeframe === period
                    ? "bg-slate-900 text-white shadow-2xs"
                    : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                {period}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* KPI Highlight Strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 my-4 py-3 px-4 rounded-xl bg-slate-50/70 border border-slate-100">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Total Admitted
          </span>
          <p className="text-lg font-extrabold text-indigo-600 mt-0.5">{totalAdm}</p>
        </div>
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Total Discharges
          </span>
          <p className="text-lg font-extrabold text-teal-600 mt-0.5">{totalDis}</p>
        </div>
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Discharge Ratio
          </span>
          <p className="text-lg font-extrabold text-slate-800 mt-0.5">
            {totalAdm > 0 ? Math.round((totalDis / totalAdm) * 100) : 100}%
          </p>
        </div>
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Avg Bed Occupancy
          </span>
          <p className="text-lg font-extrabold text-emerald-600 mt-0.5">
            {avgOccupancy}%
          </p>
        </div>
      </div>

      {/* SVG Interactive Chart Canvas */}
      <div className="relative w-full overflow-hidden select-none">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-auto overflow-visible"
        >
          <defs>
            {/* Admissions Gradient Fill */}
            <linearGradient id={gradientIdAdm} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366F1" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#6366F1" stopOpacity="0.0" />
            </linearGradient>

            {/* Discharges Gradient Fill */}
            <linearGradient id={gradientIdDis} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0D9488" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#0D9488" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Horizontal Grid Lines & Y-Axis Labels */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const y = svgHeight - paddingBottom - ratio * chartHeight;
            const val = Math.round(ratio * maxVal);
            return (
              <g key={ratio}>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={svgWidth - paddingRight}
                  y2={y}
                  stroke="#E2E8F0"
                  strokeDasharray="4 4"
                  strokeWidth={1}
                />
                <text
                  x={paddingLeft - 8}
                  y={y + 3.5}
                  textAnchor="end"
                  fill="#94A3B8"
                  fontSize={10}
                  fontWeight={500}
                >
                  {val}
                </text>
              </g>
            );
          })}

          {/* Admissions Area & Line */}
          {(activeMetric === "all" || activeMetric === "admissions") && (
            <g className="transition-opacity duration-300">
              <path d={admArea} fill={`url(#${gradientIdAdm})`} />
              <path
                d={admPath}
                fill="none"
                stroke="#4F46E5"
                strokeWidth={2.75}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </g>
          )}

          {/* Discharges Area & Line */}
          {(activeMetric === "all" || activeMetric === "discharges") && (
            <g className="transition-opacity duration-300">
              <path d={disArea} fill={`url(#${gradientIdDis})`} />
              <path
                d={disPath}
                fill="none"
                stroke="#0D9488"
                strokeWidth={2.5}
                strokeDasharray={activeMetric === "all" ? "6 3" : undefined}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </g>
          )}

          {/* Vertical Guides & Data Points */}
          {data.map((pt, idx) => {
            const x = getX(idx);
            const isHovered = hoveredIndex === idx;

            return (
              <g key={pt.label}>
                {/* X Axis Label */}
                <text
                  x={x}
                  y={svgHeight - 10}
                  textAnchor="middle"
                  fill={isHovered ? "#0F172A" : "#64748B"}
                  fontSize={11}
                  fontWeight={isHovered ? 700 : 500}
                  className="transition-colors"
                >
                  {pt.label}
                </text>

                {/* Hover vertical crosshair */}
                {isHovered && (
                  <line
                    x1={x}
                    y1={paddingTop - 10}
                    x2={x}
                    y2={svgHeight - paddingBottom}
                    stroke="#4F46E5"
                    strokeWidth={1.5}
                    strokeDasharray="3 3"
                    className="animate-pulse"
                  />
                )}

                {/* Admissions Dot */}
                {(activeMetric === "all" || activeMetric === "admissions") && (
                  <circle
                    cx={x}
                    cy={getY(pt.admissions)}
                    r={isHovered ? 6 : 3.5}
                    fill="#4F46E5"
                    stroke="#ffffff"
                    strokeWidth={2}
                    className="transition-all duration-200 cursor-pointer"
                  />
                )}

                {/* Discharges Dot */}
                {(activeMetric === "all" || activeMetric === "discharges") && (
                  <circle
                    cx={x}
                    cy={getY(pt.discharges)}
                    r={isHovered ? 5.5 : 3}
                    fill="#0D9488"
                    stroke="#ffffff"
                    strokeWidth={2}
                    className="transition-all duration-200 cursor-pointer"
                  />
                )}

                {/* Invisible hover area trigger */}
                <rect
                  x={x - chartWidth / (data.length * 2)}
                  y={paddingTop}
                  width={chartWidth / data.length}
                  height={chartHeight + 15}
                  fill="transparent"
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredIndex(idx)}
                />
              </g>
            );
          })}
        </svg>

        {/* Floating Tooltip Box */}
        {hoveredIndex !== null && data[hoveredIndex] && (
          <div
            className="pointer-events-none absolute z-20 rounded-xl border border-slate-200 bg-slate-900/95 p-3 text-white shadow-xl backdrop-blur-md transition-all duration-150 animate-fade-in"
            style={{
              left: `clamp(12px, calc(${(hoveredIndex / (data.length - 1)) * 100}% - 70px), calc(100% - 160px))`,
              top: "14px",
            }}
          >
            <div className="flex items-center justify-between gap-3 border-b border-slate-700/80 pb-1.5 mb-2">
              <span className="text-xs font-bold text-slate-300">
                {data[hoveredIndex].label} Timeline
              </span>
              <span className="rounded bg-indigo-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-300">
                {data[hoveredIndex].bedOccupancy}% Bed Load
              </span>
            </div>
            <div className="space-y-1 text-xs">
              <div className="flex items-center justify-between gap-4">
                <span className="flex items-center gap-1.5 text-slate-400">
                  <span className="h-2 w-2 rounded-full bg-indigo-500" />
                  Admitted:
                </span>
                <span className="font-bold text-white">
                  {data[hoveredIndex].admissions} patients
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="flex items-center gap-1.5 text-slate-400">
                  <span className="h-2 w-2 rounded-full bg-teal-400" />
                  Discharged:
                </span>
                <span className="font-bold text-white">
                  {data[hoveredIndex].discharges} patients
                </span>
              </div>
              <div className="flex items-center justify-between gap-4 pt-1 border-t border-slate-800 text-[11px]">
                <span className="text-slate-400">Net Flow:</span>
                <span
                  className={`font-semibold ${
                    data[hoveredIndex].admissions - data[hoveredIndex].discharges >= 0
                      ? "text-indigo-400"
                      : "text-emerald-400"
                  }`}
                >
                  {data[hoveredIndex].admissions - data[hoveredIndex].discharges >= 0 ? "+" : ""}
                  {data[hoveredIndex].admissions - data[hoveredIndex].discharges} beds
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Legend & Interactive Note */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-3 text-xs text-slate-500">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-6 rounded-full bg-indigo-600" />
            <span className="font-medium text-slate-700">Patient Admissions</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-6 rounded-full bg-teal-600" />
            <span className="font-medium text-slate-700">Discharges (Treated)</span>
          </div>
        </div>
        <span className="text-[11px] text-slate-400">
          💡 Hover over any point to inspect patient flow metrics
        </span>
      </div>
    </div>
  );
}
