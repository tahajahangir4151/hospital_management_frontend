"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { StatCard } from "@/components/dashboard/stat-card";
import { AdmissionsChart } from "@/components/dashboard/admissions-chart";
import { WardOccupancyChart } from "@/components/dashboard/ward-occupancy-chart";
import { DepartmentWorkloadChart } from "@/components/dashboard/department-workload-chart";
import { QuickActionsBar } from "@/components/dashboard/quick-actions-bar";
import { authService } from "@/services/auth.service";
import { dashboardService, DashboardMetrics } from "@/services/dashboard.service";
import { admissionService } from "@/services/admission.service";
import { patientService } from "@/services/patient.service";
import { roomService } from "@/services/room.service";
import { doctorService } from "@/services/doctor.service";
import { treatmentService } from "@/services/treatment.service";
import { AuthUser } from "@/types/auth";
import { Admission } from "@/types/admission";
import { Patient } from "@/types/patient";
import { Room } from "@/types/room";
import { Doctor } from "@/types/doctor";
import { Treatment } from "@/types/treatment";

export default function DashboardPage() {
  const cachedMetrics = dashboardService.getCachedMetrics();
  const [user] = useState<AuthUser | null>(() => authService.getStoredUser());
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(() => cachedMetrics);
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(() => cachedMetrics === null);

  const [admissions, setAdmissions] = useState<Admission[]>(
    () => admissionService.getCachedAdmissions() || []
  );
  const [rooms, setRooms] = useState<Room[]>(() => roomService.getCachedRooms() || []);
  const [patients, setPatients] = useState<Patient[]>(
    () => patientService.getCachedPatients() || []
  );
  const [doctors, setDoctors] = useState<Doctor[]>(() => doctorService.getCachedDoctors() || []);
  const [treatments, setTreatments] = useState<Treatment[]>(
    () => treatmentService.getCachedTreatments() || []
  );
  const [isLoadingDetails, setIsLoadingDetails] = useState(
    () =>
      !admissionService.getCachedAdmissions() ||
      !roomService.getCachedRooms() ||
      !patientService.getCachedPatients()
  );

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "overview" | "admissions" | "wards" | "departments"
  >("overview");
  const [admissionSearch, setAdmissionSearch] = useState("");
  const [admissionFilter, setAdmissionFilter] = useState<"all" | "active" | "discharged">("all");

  const loadAll = async (force = false) => {
    if (force) setIsRefreshing(true);
    try {
      const [
        metricsData,
        admissionsData,
        roomsData,
        patientsData,
        doctorsData,
        treatmentsData,
      ] = await Promise.all([
        dashboardService.getMetrics(force),
        admissionService.getAdmissions(force),
        roomService.getRooms(force),
        patientService.getPatients(force),
        doctorService.getDoctors(force),
        treatmentService.getTreatments(force),
      ]);

      setMetrics(metricsData);
      setAdmissions(admissionsData);
      setRooms(roomsData);
      setPatients(patientsData);
      setDoctors(doctorsData);
      setTreatments(treatmentsData);
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
    } finally {
      setIsLoadingMetrics(false);
      setIsLoadingDetails(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    let active = true;
    loadAll(false);
    return () => {
      active = false;
    };
  }, []);

  const adminName = user?.full_name || user?.email?.split("@")[0] || "Administrator";

  // Lookup maps for fast relational joining
  const patientMap = useMemo(() => {
    const map = new Map<string, Patient>();
    patients.forEach((p) => map.set(p.id, p));
    return map;
  }, [patients]);

  const roomMap = useMemo(() => {
    const map = new Map<string, Room>();
    rooms.forEach((r) => map.set(r.id, r));
    return map;
  }, [rooms]);

  const doctorMap = useMemo(() => {
    const map = new Map<string, Doctor>();
    doctors.forEach((d) => map.set(d.id, d));
    return map;
  }, [doctors]);

  // Set of occupied room IDs
  const occupiedRoomIds = useMemo(() => {
    const set = new Set<string>();
    admissions.forEach((adm) => {
      if (!adm.discharge_date) {
        set.add(adm.room_id);
      }
    });
    return set;
  }, [admissions]);

  // Dynamic stat cards with visual sparklines and trends
  const statCards = [
    {
      title: "Total Departments",
      value: metrics ? metrics.totalDepartments : 0,
      subtitle: metrics
        ? `${metrics.totalDepartments} active medical specialties`
        : "Medical divisions",
      badgeText: "Operational",
      badgeType: "purple" as const,
      accentColor: "indigo" as const,
      href: "/dashboard/departments",
      isLoading: isLoadingMetrics,
      sparklineData: [4, 5, 5, 6, 6, 7, metrics?.totalDepartments || 8],
      trend: { value: "+12% cap", isPositive: true },
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
    },
    {
      title: "Active Doctors",
      value: metrics ? metrics.totalDoctors : 0,
      subtitle: metrics
        ? `${metrics.totalDoctors} physicians on clinical duty`
        : "Clinical staff duty",
      badgeText: metrics && metrics.totalDoctors > 0 ? "Staffed" : "Active",
      badgeType: "info" as const,
      accentColor: "blue" as const,
      href: "/dashboard/doctors",
      isLoading: isLoadingMetrics,
      sparklineData: [8, 10, 9, 12, 11, 13, metrics?.totalDoctors || 14],
      trend: { value: "100% on-duty", isPositive: true },
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
    },
    {
      title: "Patient Registry",
      value: metrics ? metrics.totalPatients : 0,
      subtitle: metrics
        ? `${metrics.totalPatients} registered electronic records`
        : "Patient records",
      badgeText: "Verified",
      badgeType: "success" as const,
      accentColor: "emerald" as const,
      href: "/dashboard/patients",
      isLoading: isLoadingMetrics,
      sparklineData: [15, 18, 22, 20, 26, 29, metrics?.totalPatients || 35],
      trend: { value: "+18.2%", isPositive: true },
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
    },
    {
      title: "Hospital Rooms",
      value: metrics ? metrics.totalRooms : 0,
      subtitle: metrics
        ? `${rooms.length - occupiedRoomIds.size} ready for immediate intake`
        : "Ward rooms configured",
      badgeText: `${rooms.length - occupiedRoomIds.size} Available`,
      badgeType: "success" as const,
      accentColor: "emerald" as const,
      href: "/dashboard/rooms",
      isLoading: isLoadingMetrics,
      sparklineData: [12, 12, 14, 14, 15, 15, metrics?.totalRooms || 16],
      trend: { value: "Optimal", isPositive: true },
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      title: "Active Admissions",
      value: metrics ? metrics.activeAdmissions : 0,
      subtitle: metrics
        ? `${metrics.activeAdmissions} admitted inpatients in wards`
        : "Inpatient admissions",
      badgeText: "In-Care",
      badgeType: "warning" as const,
      accentColor: "rose" as const,
      href: "/dashboard/admissions",
      isLoading: isLoadingMetrics,
      sparklineData: [5, 7, 6, 9, 8, 11, metrics?.activeAdmissions || 12],
      trend: { value: "+8.4%", isPositive: true },
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
      ),
    },
    {
      title: "Ward Nurses",
      value: metrics ? metrics.totalNurses : 0,
      subtitle: metrics
        ? `${metrics.totalNurses} registered nursing staff`
        : "Ward nurses assigned",
      badgeText: "24/7 Rotas",
      badgeType: "info" as const,
      accentColor: "amber" as const,
      href: "/dashboard/nurses",
      isLoading: isLoadingMetrics,
      sparklineData: [6, 7, 8, 8, 9, 10, metrics?.totalNurses || 11],
      trend: { value: "Full Cover", isPositive: true },
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
    },
  ];

  // Process recent admissions with doctor relations and filtering
  const processedAdmissions = useMemo(() => {
    const sorted = [...admissions].sort((a, b) => {
      const dateA = new Date(a.admission_date || a.created_at).getTime();
      const dateB = new Date(b.admission_date || b.created_at).getTime();
      return dateB - dateA;
    });

    return sorted.map((adm) => {
      const patient = patientMap.get(adm.patient_id);
      const room = roomMap.get(adm.room_id);
      const treatment = treatments.find((t) => t.patient_id === adm.patient_id);
      const doctor = treatment ? doctorMap.get(treatment.doctor_id) : null;

      const patientName = patient?.name || `Patient #${adm.patient_id.slice(0, 6)}`;
      const patientCode = patient?.id ? `P-${patient.id.slice(0, 5).toUpperCase()}` : "P-UNKN";
      const roomDisplay = room ? `Room ${room.room_number} (${room.type})` : "Unassigned";

      let dateDisplay = "Recent";
      if (adm.admission_date) {
        const d = new Date(adm.admission_date);
        if (!isNaN(d.getTime())) {
          dateDisplay = d.toLocaleDateString("en-US", {
            month: "short",
            day: "2-digit",
            year: "numeric",
          });
        }
      }

      let doctorDisplay = "Dr. Attending On-Call";
      if (doctor?.full_name) {
        doctorDisplay = doctor.full_name.toLowerCase().startsWith("dr")
          ? doctor.full_name
          : `Dr. ${doctor.full_name}`;
      }

      const isActive = !adm.discharge_date;
      const isICU = room?.type?.toLowerCase().includes("icu");

      let statusLabel = "Discharged";
      let statusColor = "bg-slate-100 text-slate-700 border-slate-200";

      if (isActive) {
        if (isICU) {
          statusLabel = "Critical Care";
          statusColor = "bg-rose-50 text-rose-700 border-rose-200 animate-pulse-rose";
        } else {
          statusLabel = "Active Inpatient";
          statusColor = "bg-emerald-50 text-emerald-700 border-emerald-200 animate-pulse-emerald";
        }
      }

      return {
        id: adm.id,
        patientName,
        patientCode,
        roomDisplay,
        roomNumber: room?.room_number || "—",
        dateDisplay,
        doctorDisplay,
        isActive,
        statusLabel,
        statusColor,
      };
    });
  }, [admissions, patientMap, roomMap, doctorMap, treatments]);

  // Filter admissions list by search query and active tab
  const filteredAdmissions = useMemo(() => {
    return processedAdmissions.filter((item) => {
      if (admissionFilter === "active" && !item.isActive) return false;
      if (admissionFilter === "discharged" && item.isActive) return false;

      if (!admissionSearch) return true;
      const q = admissionSearch.toLowerCase();
      return (
        item.patientName.toLowerCase().includes(q) ||
        item.patientCode.toLowerCase().includes(q) ||
        item.roomDisplay.toLowerCase().includes(q) ||
        item.doctorDisplay.toLowerCase().includes(q)
      );
    });
  }, [processedAdmissions, admissionFilter, admissionSearch]);

  const [currentDateStr] = useState(() =>
    new Date().toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "2-digit",
      year: "numeric",
    })
  );

  return (
    <div className="space-y-7 pb-12 animate-fade-in">
      {/* ============================================================ */}
      {/* 1. Next-Level Hero Welcome Banner & Live Status Beacon      */}
      {/* ============================================================ */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-xs backdrop-blur-md">
        {/* Subtle decorative background gradient glows */}
        <div className="absolute top-0 right-0 -mt-12 -mr-12 h-64 w-64 rounded-full bg-gradient-to-br from-indigo-500/10 via-sky-500/10 to-transparent blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 -mb-12 h-48 w-48 rounded-full bg-gradient-to-tr from-emerald-500/10 to-transparent blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200/80 px-3 py-1 text-xs font-bold text-emerald-700 shadow-2xs">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                Hospital Operations Live
              </span>
              <span className="inline-flex items-center rounded-full bg-indigo-50 border border-indigo-200/80 px-3 py-1 text-xs font-semibold text-indigo-700">
                System Health: 99.98%
              </span>
              <span className="hidden sm:inline-block text-xs text-slate-400">
                • {currentDateStr}
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              Welcome back, <span className="gradient-text-indigo">{adminName}</span>
            </h2>
            <p className="text-sm text-slate-600 max-w-2xl">
              Live medical command center: Monitor bed occupancy, inpatient admissions, attending physician schedules, and division workloads in real-time.
            </p>
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => loadAll(true)}
              disabled={isRefreshing}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 hover:border-slate-300 transition-all cursor-pointer disabled:opacity-50"
              title="Refresh all metrics"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className={`h-4 w-4 text-indigo-600 ${isRefreshing ? "animate-spin" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              <span>{isRefreshing ? "Syncing..." : "Sync Live Data"}</span>
            </button>

            <Link
              href="/dashboard/admissions"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-md shadow-indigo-600/20 hover:from-indigo-500 hover:to-blue-500 transition-all cursor-pointer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              <span>Admit Patient</span>
            </Link>
          </div>
        </div>

        {/* View Selection Tabs */}
        <div className="relative z-10 mt-6 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-5">
          {[
            { id: "overview", label: "Overview & Real-time Flow" },
            { id: "admissions", label: "Inpatient Trends & Admissions" },
            { id: "wards", label: "Ward Capacity & Bed Load" },
            { id: "departments", label: "Department Allocations" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
                activeTab === tab.id
                  ? "bg-slate-900 text-white shadow-sm"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ============================================================ */}
      {/* 2. 6 Upgraded Stat Cards with Sparklines & Trend Indicators */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {statCards.map((card) => (
          <StatCard
            key={card.title}
            title={card.title}
            value={card.value}
            subtitle={card.subtitle}
            badgeText={card.badgeText}
            badgeType={card.badgeType}
            accentColor={card.accentColor}
            sparklineData={card.sparklineData}
            trend={card.trend}
            icon={card.icon}
            href={card.href}
            isLoading={card.isLoading}
          />
        ))}
      </div>

      {/* ============================================================ */}
      {/* 3. Interactive Quick Actions Dock                           */}
      {/* ============================================================ */}
      <QuickActionsBar />

      {/* ============================================================ */}
      {/* 4. Dynamic Dashboard Views based on Active Tab               */}
      {/* ============================================================ */}

      {/* TAB 1: OVERVIEW & FLOW (Charts Grid + Table) */}
      {activeTab === "overview" && (
        <div className="space-y-7 animate-slide-up">
          {/* Top Charts Row: Area Admissions Chart (2 cols) + Ward Donut (1 col) */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <AdmissionsChart
                realAdmissionsCount={metrics?.activeAdmissions || 18}
                activeAdmissionsCount={metrics?.activeAdmissions || 12}
              />
            </div>
            <div>
              <WardOccupancyChart
                rooms={rooms}
                occupiedRoomIds={occupiedRoomIds}
                isLoading={isLoadingDetails}
              />
            </div>
          </div>

          {/* Department Workload Full Bar Chart */}
          <DepartmentWorkloadChart />
        </div>
      )}

      {/* TAB 2: ADMISSIONS ONLY */}
      {activeTab === "admissions" && (
        <div className="space-y-6 animate-slide-up">
          <AdmissionsChart
            realAdmissionsCount={metrics?.activeAdmissions || 24}
            activeAdmissionsCount={metrics?.activeAdmissions || 18}
          />
        </div>
      )}

      {/* TAB 3: WARDS & ROOM CAPACITY */}
      {activeTab === "wards" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 animate-slide-up">
          <WardOccupancyChart
            rooms={rooms}
            occupiedRoomIds={occupiedRoomIds}
            isLoading={isLoadingDetails}
          />
          <DepartmentWorkloadChart />
        </div>
      )}

      {/* TAB 4: DEPARTMENTS ALLOCATIONS */}
      {activeTab === "departments" && (
        <div className="animate-slide-up">
          <DepartmentWorkloadChart />
        </div>
      )}

      {/* ============================================================ */}
      {/* 5. Live Recent Admissions Interactive Table                 */}
      {/* ============================================================ */}
      <div className="rounded-2xl border border-slate-200/80 bg-white/95 p-6 shadow-xs backdrop-blur-xs">
        {/* Table Header & Controls */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-5 mb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-indigo-500 animate-pulse-glow" />
              <h3 className="text-base font-bold text-slate-900 tracking-tight">
                Live Inpatient Admissions Feed
              </h3>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600">
                {filteredAdmissions.length} Record{filteredAdmissions.length === 1 ? "" : "s"}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Real-time inpatient registry, assigned rooms, attending medical staff, and care status
            </p>
          </div>

          {/* Search & Filter Pills */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search Input */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search patient, room, doc..."
                value={admissionSearch}
                onChange={(e) => setAdmissionSearch(e.target.value)}
                className="w-48 sm:w-56 rounded-xl border border-slate-200 bg-slate-50/70 py-1.5 pl-8 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all"
              />
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            {/* Filter pills */}
            <div className="flex items-center rounded-xl bg-slate-100/90 p-0.5 text-xs font-semibold text-slate-600">
              <button
                type="button"
                onClick={() => setAdmissionFilter("all")}
                className={`rounded-lg px-2.5 py-1 transition-all cursor-pointer ${
                  admissionFilter === "all" ? "bg-white text-slate-900 shadow-2xs font-bold" : "hover:text-slate-900"
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setAdmissionFilter("active")}
                className={`rounded-lg px-2.5 py-1 transition-all cursor-pointer ${
                  admissionFilter === "active" ? "bg-emerald-600 text-white shadow-2xs font-bold" : "hover:text-slate-900"
                }`}
              >
                Active
              </button>
              <button
                type="button"
                onClick={() => setAdmissionFilter("discharged")}
                className={`rounded-lg px-2.5 py-1 transition-all cursor-pointer ${
                  admissionFilter === "discharged" ? "bg-slate-700 text-white shadow-2xs font-bold" : "hover:text-slate-900"
                }`}
              >
                Discharged
              </button>
            </div>

            <Link
              href="/dashboard/admissions"
              className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 hover:border-indigo-200 transition-colors"
            >
              Full Admissions Table →
            </Link>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <th className="pb-3 pr-4">Patient</th>
                <th className="pb-3 px-4">Ward / Room</th>
                <th className="pb-3 px-4">Admitted Date</th>
                <th className="pb-3 px-4">Attending Doctor</th>
                <th className="pb-3 pl-4 text-right">Care Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {isLoadingDetails ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400 text-xs">
                    <div className="flex items-center justify-center gap-2">
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
                      <span>Syncing live inpatient records...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredAdmissions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400 text-xs">
                    No matching admissions found.{" "}
                    <Link
                      href="/dashboard/admissions"
                      className="text-indigo-600 font-bold hover:underline"
                    >
                      Admit a new patient
                    </Link>
                  </td>
                </tr>
              ) : (
                filteredAdmissions.slice(0, 6).map((row) => (
                  <tr
                    key={row.id}
                    className="hover:bg-indigo-50/40 transition-colors group"
                  >
                    {/* Patient Name & Avatar */}
                    <td className="py-3.5 pr-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-100 to-sky-100 text-indigo-700 font-extrabold text-xs shadow-2xs">
                          {row.patientName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors leading-tight">
                            {row.patientName}
                          </p>
                          <p className="text-[11px] text-slate-400 font-mono leading-tight">
                            {row.patientCode}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Room */}
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-800">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16" />
                        </svg>
                        {row.roomDisplay}
                      </span>
                    </td>

                    {/* Date */}
                    <td className="py-3.5 px-4 text-xs font-medium text-slate-500">
                      {row.dateDisplay}
                    </td>

                    {/* Doctor */}
                    <td className="py-3.5 px-4 text-xs sm:text-sm font-semibold text-slate-700">
                      {row.doctorDisplay}
                    </td>

                    {/* Care Status Badge */}
                    <td className="py-3.5 pl-4 text-right">
                      <span
                        className={`inline-flex items-center rounded-lg border px-2.5 py-1 text-xs font-bold shadow-2xs ${row.statusColor}`}
                      >
                        {row.statusLabel}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
