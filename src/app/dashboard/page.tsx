"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { StatCard } from "@/components/dashboard/stat-card";
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

  useEffect(() => {
    let active = true;

    const loadAll = async () => {
      try {
        const [
          metricsData,
          admissionsData,
          roomsData,
          patientsData,
          doctorsData,
          treatmentsData,
        ] = await Promise.all([
          dashboardService.getMetrics(false),
          admissionService.getAdmissions(false),
          roomService.getRooms(false),
          patientService.getPatients(false),
          doctorService.getDoctors(false),
          treatmentService.getTreatments(false),
        ]);

        if (active) {
          setMetrics(metricsData);
          setAdmissions(admissionsData);
          setRooms(roomsData);
          setPatients(patientsData);
          setDoctors(doctorsData);
          setTreatments(treatmentsData);
        }
      } catch (err) {
        console.error("Failed to load dashboard data:", err);
      } finally {
        if (active) {
          setIsLoadingMetrics(false);
          setIsLoadingDetails(false);
        }
      }
    };

    loadAll();

    return () => {
      active = false;
    };
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
      href: "/dashboard/patients",
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
      href: "/dashboard/rooms",
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
      href: "/dashboard/admissions",
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

  // Lookup maps for rapid relationship joins
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

  // Set of room IDs that currently have an active (not discharged) admission
  const occupiedRoomIds = useMemo(() => {
    const set = new Set<string>();
    admissions.forEach((adm) => {
      if (!adm.discharge_date) {
        set.add(adm.room_id);
      }
    });
    return set;
  }, [admissions]);

  // Real Recent Admissions list (most recent 5 arrivals)
  const recentAdmissions = useMemo(() => {
    const sorted = [...admissions].sort((a, b) => {
      const dateA = new Date(a.admission_date || a.created_at).getTime();
      const dateB = new Date(b.admission_date || b.created_at).getTime();
      return dateB - dateA;
    });

    return sorted.slice(0, 5).map((adm) => {
      const patient = patientMap.get(adm.patient_id);
      const room = roomMap.get(adm.room_id);
      // Associate attending doctor from medical treatment records if available
      const treatment = treatments.find((t) => t.patient_id === adm.patient_id);
      const doctor = treatment ? doctorMap.get(treatment.doctor_id) : null;

      const patientName = patient?.name || `Patient #${adm.patient_id.slice(0, 6)}`;
      const patientIdDisplay = patient?.id
        ? `P-${patient.id.slice(0, 4).toUpperCase()}`
        : `P-${adm.patient_id.slice(0, 4).toUpperCase()}`;

      const roomDisplay = room?.room_number || "Unassigned";

      let dateDisplay = "N/A";
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

      let doctorDisplay = "Attending On-Call";
      if (doctor?.full_name) {
        doctorDisplay = doctor.full_name.toLowerCase().startsWith("dr")
          ? doctor.full_name
          : `Dr. ${doctor.full_name}`;
      } else if (doctors.length > 0) {
        const primaryDoc = doctors[0];
        doctorDisplay = primaryDoc.full_name.toLowerCase().startsWith("dr")
          ? primaryDoc.full_name
          : `Dr. ${primaryDoc.full_name}`;
      }

      const isActive = !adm.discharge_date;
      let status = "Discharged";
      let statusType: "active" | "observation" | "discharged" = "discharged";

      if (isActive) {
        if (
          room?.type?.toLowerCase().includes("icu") ||
          room?.type?.toLowerCase().includes("emergency")
        ) {
          status = "Observation";
          statusType = "observation";
        } else {
          status = "Active";
          statusType = "active";
        }
      }

      return {
        id: adm.id,
        patient: patientName,
        patientId: patientIdDisplay,
        room: roomDisplay,
        date: dateDisplay,
        doctor: doctorDisplay,
        status,
        statusType,
      };
    });
  }, [admissions, patientMap, roomMap, doctorMap, treatments, doctors]);

  // Real Room Overview & Capacity breakdown
  const roomOverview = useMemo(() => {
    const totalRooms = rooms.length;
    const occupiedCount = occupiedRoomIds.size;
    const occupancyRate =
      totalRooms > 0 ? Math.round((occupiedCount / totalRooms) * 100) : 0;
    const readyRooms = Math.max(0, totalRooms - occupiedCount);

    const categories = [
      {
        name: "General Ward",
        match: (type: string) => /general/i.test(type),
        color: "bg-blue-600",
      },
      {
        name: "Private Rooms",
        match: (type: string) => /private|suite/i.test(type),
        color: "bg-blue-600",
      },
      {
        name: "Intensive Care (ICU)",
        match: (type: string) => /icu|critical|intensive/i.test(type),
        color: "bg-amber-500",
      },
      {
        name: "Emergency Unit",
        match: (type: string) => /emergency|isolation/i.test(type),
        color: "bg-emerald-600",
      },
    ];

    const breakdown = categories.map((cat) => {
      const matchingRooms = rooms.filter((r) => cat.match(r.type || ""));
      const total = matchingRooms.length;
      const active = matchingRooms.filter((r) => occupiedRoomIds.has(r.id)).length;
      const percentage = total > 0 ? Math.round((active / total) * 100) : 0;

      return {
        name: cat.name,
        active,
        total,
        percentage,
        color: cat.color,
      };
    });

    return {
      occupancyRate,
      readyRooms,
      breakdown,
    };
  }, [rooms, occupiedRoomIds]);

  const [currentDateStr] = useState(() =>
    new Date().toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "2-digit",
      year: "numeric",
    })
  );

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
              {currentDateStr}
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
            <Link
              href="/dashboard/admissions"
              className="text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
            >
              View All
            </Link>
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
                {isLoadingDetails ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400 text-xs">
                      <div className="flex items-center justify-center gap-2">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                        <span>Loading live admissions...</span>
                      </div>
                    </td>
                  </tr>
                ) : recentAdmissions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400 text-xs">
                      No recent admissions recorded.{" "}
                      <Link
                        href="/dashboard/admissions"
                        className="text-blue-600 font-medium hover:underline"
                      >
                        Admit a patient
                      </Link>
                    </td>
                  </tr>
                ) : (
                  recentAdmissions.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/70 transition-colors">
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
                  ))
                )}
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
                {roomOverview.occupancyRate}% Occupancy
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Live capacity breakdown by ward type
            </p>
          </div>

          {/* Breakdown Items */}
          <div className="space-y-4">
            {isLoadingDetails ? (
              <div className="py-8 flex items-center justify-center gap-2 text-slate-400 text-xs">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                <span>Loading ward breakdown...</span>
              </div>
            ) : (
              roomOverview.breakdown.map((category) => (
                <div key={category.name} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-800">{category.name}</span>
                    <span className="text-slate-500 font-mono">
                      {category.active} / {category.total}{" "}
                      {category.total === 1 ? "bed" : "beds"}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${category.color}`}
                      style={{ width: `${category.percentage}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Room Summary Note */}
          <div className="mt-6 rounded-lg bg-slate-50 p-3.5 border border-slate-100 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <span
                className={`h-2 w-2 rounded-full shrink-0 ${
                  roomOverview.readyRooms > 0 ? "bg-emerald-500" : "bg-amber-500"
                }`}
              />
              <p>
                <strong className="text-slate-900">
                  {roomOverview.readyRooms}{" "}
                  {roomOverview.readyRooms === 1 ? "Room" : "Rooms"} Ready
                </strong>
                :{" "}
                {roomOverview.readyRooms > 0
                  ? "Sanitized and available for immediate inpatient admission."
                  : "All configured rooms are currently occupied or none configured."}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
