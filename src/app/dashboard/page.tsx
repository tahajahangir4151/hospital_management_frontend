"use client";

import React, { useEffect, useState } from "react";
import { StatCard } from "@/components/dashboard/stat-card";
import { authService } from "@/services/auth.service";
import { dashboardService, DashboardMetrics } from "@/services/dashboard.service";
import { AuthUser } from "@/types/auth";

export default function DashboardPage() {
  const cachedMetrics = dashboardService.getCachedMetrics();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(() => cachedMetrics);
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(() => cachedMetrics === null);

  useEffect(() => {
    const currentUser = authService.getStoredUser();
    setUser(currentUser);

    // Only load from network if not already cached
    if (!dashboardService.getCachedMetrics()) {
      const loadMetrics = async () => {
        try {
          const data = await dashboardService.getMetrics(false);
          setMetrics(data);
        } catch (err) {
          console.error("Failed to load dashboard metrics:", err);
        } finally {
          setIsLoadingMetrics(false);
        }
      };

      loadMetrics();
    }
  }, []);

  const adminName = user?.full_name || user?.email?.split("@")[0] || "Admin";

  const statCards = [
    {
      title: "Total Departments",
      value: metrics ? metrics.totalDepartments : 0,
      subtitle: metrics
        ? `${metrics.totalDepartments} active medical & support units`
        : "Active medical & support units",
      badgeText: "Stable",
      badgeType: "neutral" as const,
      href: "/dashboard/departments",
      isLoading: isLoadingMetrics,
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.75}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
          />
        </svg>
      ),
    },
    {
      title: "Total Doctors",
      value: metrics ? metrics.totalDoctors : 0,
      subtitle: metrics
        ? `${metrics.totalDoctors} on active hospital duty`
        : "Active hospital duty",
      badgeText: metrics && metrics.totalDoctors > 0 ? "Staffed" : "Active",
      badgeType: "info" as const,
      href: "/dashboard/doctors",
      isLoading: isLoadingMetrics,
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.75}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
          />
        </svg>
      ),
    },
    {
      title: "Total Patients",
      value: metrics ? metrics.totalPatients : 0,
      subtitle: metrics
        ? `${metrics.totalPatients} registered hospital patient${metrics.totalPatients === 1 ? "" : "s"}`
        : "Registered hospital patients",
      badgeText: "Active Registry",
      badgeType: "neutral" as const,
      isLoading: isLoadingMetrics,
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.75}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
      ),
    },
    {
      title: "Available Rooms",
      value: metrics ? metrics.totalRooms : 0,
      subtitle: metrics
        ? `${metrics.totalRooms} hospital rooms configured`
        : "Rooms configured",
      badgeText: metrics && metrics.totalRooms > 0 ? `${metrics.totalRooms} Rooms` : "Available",
      badgeType: "success" as const,
      isLoading: isLoadingMetrics,
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.75}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
          />
        </svg>
      ),
    },
    {
      title: "Active Admissions",
      value: metrics ? metrics.activeAdmissions : 0,
      subtitle: metrics
        ? `${metrics.activeAdmissions} currently admitted inpatient${metrics.activeAdmissions === 1 ? "" : "s"}`
        : "Currently admitted inpatients",
      badgeText: "Ongoing Care",
      badgeType: "info" as const,
      isLoading: isLoadingMetrics,
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.75}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
          />
        </svg>
      ),
    },
    {
      title: "Total Nurses",
      value: metrics ? metrics.totalNurses : 0,
      subtitle: metrics
        ? `${metrics.totalNurses} assigned across hospital wards`
        : "Assigned across hospital wards",
      badgeText: "Fully Staffed",
      badgeType: "success" as const,
      href: "/dashboard/nurses",
      isLoading: isLoadingMetrics,
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.75}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
          />
        </svg>
      ),
    },
  ];

  const recentAdmissions = [
    {
      patient: "Ali Khan",
      patientId: "P-1048",
      room: "ICU-02",
      date: "Sep 09, 2026",
      doctor: "Dr. Sarah Jenkins",
      status: "Active",
      statusType: "active",
    },
    {
      patient: "Sara Ahmed",
      patientId: "P-1042",
      room: "P-105",
      date: "Sep 08, 2026",
      doctor: "Dr. Marcus Vance",
      status: "Active",
      statusType: "active",
    },
    {
      patient: "Michael Chen",
      patientId: "P-1039",
      room: "G-204",
      date: "Sep 08, 2026",
      doctor: "Dr. Elena Rostova",
      status: "Active",
      statusType: "active",
    },
    {
      patient: "Fatima Noor",
      patientId: "P-1033",
      room: "ICU-01",
      date: "Sep 07, 2026",
      doctor: "Dr. Sarah Jenkins",
      status: "Observation",
      statusType: "observation",
    },
    {
      patient: "David Miller",
      patientId: "P-1025",
      room: "P-112",
      date: "Sep 06, 2026",
      doctor: "Dr. Robert Kim",
      status: "Discharged",
      statusType: "discharged",
    },
  ];

  const roomCategories = [
    { name: "General Ward", active: 24, total: 36, color: "bg-blue-600" },
    { name: "Private Rooms", active: 14, total: 24, color: "bg-blue-600" },
    { name: "Intensive Care (ICU)", active: 6, total: 8, color: "bg-amber-500" },
    { name: "Emergency Unit", active: 4, total: 16, color: "bg-emerald-600" },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Hospital Administration Portal
              </span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">
              Welcome back, {adminName}
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Real-time operational summary, patient admissions, and hospital ward metrics.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600">
              Wednesday, Sep 09, 2026
            </span>
          </div>
        </div>
      </div>

      {/* 6 Summary Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {statCards.map((card) => (
          <StatCard
            key={card.title}
            title={card.title}
            value={card.value}
            subtitle={card.subtitle}
            badgeText={card.badgeText}
            badgeType={card.badgeType}
            icon={card.icon}
            href={card.href}
            isLoading={card.isLoading}
          />
        ))}
      </div>

      {/* Two-Column Section: Recent Admissions (2 cols) & Room Overview (1 col) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left: Recent Admissions Table */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs lg:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Recent Admissions
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Latest inpatient hospital arrivals and assignments
              </p>
            </div>
            <span className="text-xs font-medium text-blue-600 hover:text-blue-700 cursor-pointer">
              View All
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  <th className="pb-3 pr-4">Patient</th>
                  <th className="pb-3 px-4">Room / Ward</th>
                  <th className="pb-3 px-4">Admitted</th>
                  <th className="pb-3 px-4">Attending Doctor</th>
                  <th className="pb-3 pl-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {recentAdmissions.map((row) => (
                  <tr key={row.patientId} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 pr-4">
                      <p className="font-semibold text-slate-900 leading-tight">
                        {row.patient}
                      </p>
                      <p className="text-xs text-slate-400 font-mono leading-tight">
                        {row.patientId}
                      </p>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-800">
                      {row.room}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 text-xs">
                      {row.date}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 text-xs sm:text-sm">
                      {row.doctor}
                    </td>
                    <td className="py-3.5 pl-4 text-right">
                      {row.statusType === "active" && (
                        <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 border border-emerald-200">
                          Active
                        </span>
                      )}
                      {row.statusType === "observation" && (
                        <span className="inline-flex items-center rounded-md bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 border border-amber-200">
                          Observation
                        </span>
                      )}
                      {row.statusType === "discharged" && (
                        <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 border border-slate-200">
                          Discharged
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Room Overview Card */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
          <div className="border-b border-slate-100 pb-4 mb-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">
                Room Overview
              </h3>
              <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 border border-blue-200">
                57% Occupancy
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Live capacity breakdown by ward type
            </p>
          </div>

          {/* Breakdown Items */}
          <div className="space-y-4">
            {roomCategories.map((category) => {
              const percentage = Math.round((category.active / category.total) * 100);
              return (
                <div key={category.name} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-800">{category.name}</span>
                    <span className="text-slate-500 font-mono">
                      {category.active} / {category.total} beds
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${category.color}`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Room Summary Note */}
          <div className="mt-6 rounded-lg bg-slate-50 p-3.5 border border-slate-100 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
              <p>
                <strong className="text-slate-900">36 Rooms Ready</strong>: Sanitized and available for immediate inpatient admission.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
