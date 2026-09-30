"use client";

import React, { useState, useMemo } from "react";
import { Room } from "@/types/room";

interface WardOccupancyChartProps {
  rooms: Room[];
  occupiedRoomIds: Set<string>;
  isLoading?: boolean;
}

interface CategorySlice {
  name: string;
  type: string;
  total: number;
  occupied: number;
  available: number;
  occupancyRate: number;
  color: string;
  hoverColor: string;
  bgBadge: string;
}

export function WardOccupancyChart({
  rooms,
  occupiedRoomIds,
  isLoading = false,
}: WardOccupancyChartProps) {
  const [hoveredSlice, setHoveredSlice] = useState<string | null>(null);

  const totalRooms = rooms.length;
  const totalOccupied = occupiedRoomIds.size;
  const overallOccupancy =
    totalRooms > 0 ? Math.round((totalOccupied / totalRooms) * 100) : 0;
  const totalAvailable = Math.max(0, totalRooms - totalOccupied);

  // Group rooms into recognized clinical categories
  const categories: CategorySlice[] = useMemo(() => {
    const defs = [
      {
        name: "General Ward",
        regex: /general/i,
        color: "#3B82F6", // blue-500
        hoverColor: "#1D4ED8",
        bgBadge: "bg-blue-50 text-blue-700 border-blue-200",
      },
      {
        name: "Private Suites",
        regex: /private|suite/i,
        color: "#6366F1", // indigo-500
        hoverColor: "#4338CA",
        bgBadge: "bg-indigo-50 text-indigo-700 border-indigo-200",
      },
      {
        name: "ICU & Critical Care",
        regex: /icu|critical|intensive/i,
        color: "#F43F5E", // rose-500
        hoverColor: "#BE123C",
        bgBadge: "bg-rose-50 text-rose-700 border-rose-200",
      },
      {
        name: "Emergency & Triage",
        regex: /emergency|isolation/i,
        color: "#10B981", // emerald-500
        hoverColor: "#047857",
        bgBadge: "bg-emerald-50 text-emerald-700 border-emerald-200",
      },
    ];

    return defs.map((def) => {
      const matched = rooms.filter((r) => def.regex.test(r.type || ""));
      const total = matched.length;
      const occupied = matched.filter((r) => occupiedRoomIds.has(r.id)).length;
      const available = Math.max(0, total - occupied);
      const occupancyRate = total > 0 ? Math.round((occupied / total) * 100) : 0;

      return {
        name: def.name,
        type: def.name,
        total,
        occupied,
        available,
        occupancyRate,
        color: def.color,
        hoverColor: def.hoverColor,
        bgBadge: def.bgBadge,
      };
    });
  }, [rooms, occupiedRoomIds]);

  // Donut geometry calculations
  const size = 210;
  const center = size / 2;
  const radius = 80;
  const strokeWidth = 22;
  const circumference = 2 * Math.PI * radius;

  // Calculate SVG stroke dashes for each category
  const slicesWithOffsets = useMemo(() => {
    // If no rooms, render placeholder
    const sum = categories.reduce((acc, c) => acc + (c.total || 1), 0);
    let cumulative = 0;

    return categories.map((cat) => {
      const share = sum > 0 ? (cat.total > 0 ? cat.total / sum : 0.05) : 0.25;
      const strokeDash = share * circumference;
      const strokeOffset = circumference - cumulative;
      cumulative += strokeDash;

      return {
        ...cat,
        strokeDash: `${Math.max(0, strokeDash - 4)} ${circumference}`,
        strokeOffset,
      };
    });
  }, [categories, circumference]);

  const activeCategory = hoveredSlice
    ? categories.find((c) => c.name === hoveredSlice)
    : null;

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white/95 p-6 shadow-xs backdrop-blur-xs transition-all duration-300 hover:shadow-md hover:border-indigo-200 flex flex-col justify-between">
      {/* Header */}
      <div className="border-b border-slate-100 pb-4 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse-emerald" />
            <h3 className="text-base font-bold text-slate-900 tracking-tight">
              Ward Capacity & Bed Load
            </h3>
          </div>
          <span
            className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-bold border ${
              overallOccupancy > 85
                ? "bg-rose-50 text-rose-700 border-rose-200"
                : overallOccupancy > 60
                ? "bg-amber-50 text-amber-700 border-amber-200"
                : "bg-emerald-50 text-emerald-700 border-emerald-200"
            }`}
          >
            {overallOccupancy}% Active
          </span>
        </div>
        <p className="mt-1 text-xs text-slate-500">
          Distribution of hospital beds and real-time census by department unit
        </p>
      </div>

      {isLoading ? (
        <div className="py-16 flex flex-col items-center justify-center gap-3 text-slate-400">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
          <span className="text-xs">Computing ward analytics...</span>
        </div>
      ) : (
        <div className="flex flex-col items-center">
          {/* Donut Visual with Center Metric */}
          <div className="relative my-2">
            <svg
              width={size}
              height={size}
              viewBox={`0 0 ${size} ${size}`}
              className="transform -rotate-90 select-none overflow-visible"
            >
              {/* Background Ring */}
              <circle
                cx={center}
                cy={center}
                r={radius}
                fill="transparent"
                stroke="#F1F5F9"
                strokeWidth={strokeWidth}
              />

              {/* Slices */}
              {slicesWithOffsets.map((slice) => {
                const isHovered = hoveredSlice === slice.name;
                return (
                  <circle
                    key={slice.name}
                    cx={center}
                    cy={center}
                    r={radius}
                    fill="transparent"
                    stroke={isHovered ? slice.hoverColor : slice.color}
                    strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                    strokeDasharray={slice.strokeDash}
                    strokeDashoffset={slice.strokeOffset}
                    strokeLinecap="round"
                    className="transition-all duration-300 cursor-pointer"
                    onMouseEnter={() => setHoveredSlice(slice.name)}
                    onMouseLeave={() => setHoveredSlice(null)}
                  />
                );
              })}
            </svg>

            {/* Center Dynamic Label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
              {activeCategory ? (
                <div className="animate-fade-in px-4">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block leading-tight">
                    {activeCategory.name}
                  </span>
                  <span className="text-2xl font-extrabold text-slate-900 block leading-tight mt-0.5">
                    {activeCategory.occupied}/{activeCategory.total}
                  </span>
                  <span className="text-[11px] font-semibold text-indigo-600 block leading-tight">
                    {activeCategory.occupancyRate}% Bed Load
                  </span>
                </div>
              ) : (
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block leading-tight">
                    Census
                  </span>
                  <span className="text-3xl font-extrabold tracking-tight text-slate-900 block leading-tight">
                    {overallOccupancy}%
                  </span>
                  <span className="text-[11px] font-medium text-emerald-600 block leading-tight mt-0.5">
                    {totalAvailable} Free Beds
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Interactive Legend List */}
          <div className="w-full mt-4 space-y-2.5">
            {categories.map((cat) => {
              const isHovered = hoveredSlice === cat.name;
              return (
                <div
                  key={cat.name}
                  onMouseEnter={() => setHoveredSlice(cat.name)}
                  onMouseLeave={() => setHoveredSlice(null)}
                  className={`flex items-center justify-between p-2 rounded-xl border transition-all duration-200 cursor-pointer ${
                    isHovered
                      ? "bg-slate-50 border-slate-300 shadow-2xs translate-x-1"
                      : "border-slate-100 hover:bg-slate-50/60"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className="h-3 w-3 rounded-full shrink-0 shadow-2xs"
                      style={{ backgroundColor: cat.color }}
                    />
                    <span className="text-xs font-semibold text-slate-800">
                      {cat.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-medium text-slate-600">
                      {cat.occupied}/{cat.total}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${cat.bgBadge}`}
                    >
                      {cat.occupancyRate}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Status Note */}
          <div className="w-full mt-4 rounded-xl bg-slate-50/80 p-3 border border-slate-100 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
              <p>
                <strong className="text-slate-900 font-semibold">
                  {totalAvailable} of {totalRooms} rooms available
                </strong>{" "}
                for immediate patient intake and triage.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
