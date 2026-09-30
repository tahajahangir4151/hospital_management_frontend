"use client";

import React, { useState } from "react";

interface DeptItem {
  id: string;
  name: string;
  patients: number;
  staff: number;
  capacity: number;
  color: string;
  urgency: "Normal" | "High" | "Critical";
}

const DEFAULT_DEPTS: DeptItem[] = [
  { id: "1", name: "Emergency & Trauma", patients: 42, staff: 16, capacity: 50, color: "from-rose-500 to-rose-600", urgency: "Critical" },
  { id: "2", name: "Cardiology", patients: 34, staff: 12, capacity: 40, color: "from-indigo-500 to-indigo-600", urgency: "High" },
  { id: "3", name: "General Medicine", patients: 48, staff: 14, capacity: 60, color: "from-blue-500 to-blue-600", urgency: "Normal" },
  { id: "4", name: "Pediatrics Unit", patients: 26, staff: 10, capacity: 35, color: "from-teal-500 to-teal-600", urgency: "Normal" },
  { id: "5", name: "Neurology & Stroke", patients: 21, staff: 9, capacity: 30, color: "from-purple-500 to-purple-600", urgency: "Normal" },
  { id: "6", name: "Orthopedics & Spine", patients: 29, staff: 11, capacity: 36, color: "from-amber-500 to-amber-600", urgency: "Normal" },
];

export function DepartmentWorkloadChart() {
  const [viewMode, setViewMode] = useState<"patients" | "ratio">("patients");
  const [hoveredDept, setHoveredDept] = useState<string | null>(null);

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white/95 p-6 shadow-xs backdrop-blur-xs transition-all duration-300 hover:shadow-md hover:border-indigo-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-blue-500 animate-pulse-glow" />
            <h3 className="text-base font-bold text-slate-900 tracking-tight">
              Department Load & Staff Allocation
            </h3>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Real-time census and clinical doctor/nurse staffing ratio across hospital divisions
          </p>
        </div>

        {/* Toggle Mode */}
        <div className="flex items-center rounded-lg bg-slate-100/90 p-0.5 text-xs font-semibold text-slate-600">
          <button
            type="button"
            onClick={() => setViewMode("patients")}
            className={`rounded-md px-2.5 py-1 transition-all cursor-pointer ${
              viewMode === "patients"
                ? "bg-white text-slate-900 shadow-2xs font-bold"
                : "hover:text-slate-900"
            }`}
          >
            Patient Volume
          </button>
          <button
            type="button"
            onClick={() => setViewMode("ratio")}
            className={`rounded-md px-2.5 py-1 transition-all cursor-pointer ${
              viewMode === "ratio"
                ? "bg-white text-slate-900 shadow-2xs font-bold"
                : "hover:text-slate-900"
            }`}
          >
            Staff Ratio
          </button>
        </div>
      </div>

      {/* Department Bars */}
      <div className="space-y-4">
        {DEFAULT_DEPTS.map((dept) => {
          const occupancyRate = Math.round((dept.patients / dept.capacity) * 100);
          const ratio = (dept.patients / dept.staff).toFixed(1);
          const isHovered = hoveredDept === dept.id;

          return (
            <div
              key={dept.id}
              onMouseEnter={() => setHoveredDept(dept.id)}
              onMouseLeave={() => setHoveredDept(null)}
              className={`p-3 rounded-xl border transition-all duration-200 ${
                isHovered
                  ? "bg-slate-50/90 border-slate-300 shadow-2xs"
                  : "border-slate-100 hover:border-slate-200"
              }`}
            >
              {/* Row title & values */}
              <div className="flex items-center justify-between text-xs mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 text-sm">
                    {dept.name}
                  </span>
                  {dept.urgency === "Critical" && (
                    <span className="rounded-md bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700 border border-rose-200">
                      Triage Peak
                    </span>
                  )}
                  {dept.urgency === "High" && (
                    <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-200">
                      High Flow
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  {viewMode === "patients" ? (
                    <span className="text-slate-700 font-medium">
                      <strong className="text-slate-900 font-extrabold">{dept.patients}</strong>{" "}
                      / {dept.capacity} beds ({occupancyRate}%)
                    </span>
                  ) : (
                    <span className="text-slate-700 font-medium">
                      <strong className="text-indigo-600 font-extrabold">1:{ratio}</strong>{" "}
                      staff to patient ({dept.staff} on duty)
                    </span>
                  )}
                </div>
              </div>

              {/* Progress Track */}
              <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden relative">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${dept.color} transition-all duration-700`}
                  style={{
                    width: `${viewMode === "patients" ? occupancyRate : Math.min(100, Number(ratio) * 20)}%`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Insight */}
      <div className="mt-4 flex items-center justify-between pt-3 border-t border-slate-100 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-indigo-500" />
          Optimal Clinical Staffing Ratio is 1:2.5 to 1:4.0
        </span>
        <span className="text-slate-400 font-medium">Updated 2 mins ago</span>
      </div>
    </div>
  );
}
