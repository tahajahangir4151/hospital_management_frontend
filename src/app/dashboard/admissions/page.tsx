"use client";

import React, { useEffect, useState, useMemo } from "react";
import { admissionService } from "@/services/admission.service";
import { patientService } from "@/services/patient.service";
import { roomService } from "@/services/room.service";
import { dashboardService } from "@/services/dashboard.service";
import { Admission, AdmitPatientDTO, EnrichedAdmission } from "@/types/admission";
import { Patient } from "@/types/patient";
import { Room } from "@/types/room";
import {
  PageHeader,
  FilterToolbar,
  DataTable,
  ColumnDef,
  Toast,
  ToastNotification,
} from "@/components/common";

export default function AdmissionsPage() {
  const cachedAdmissions = admissionService.getCachedAdmissions();
  const cachedPatients = patientService.getCachedPatients();
  const cachedRooms = roomService.getCachedRooms();

  const [admissions, setAdmissions] = useState<Admission[]>(() => cachedAdmissions || []);
  const [patients, setPatients] = useState<Patient[]>(() => cachedPatients || []);
  const [rooms, setRooms] = useState<Room[]>(() => cachedRooms || []);

  const [isLoading, setIsLoading] = useState(
    () => cachedAdmissions === null || cachedPatients === null || cachedRooms === null
  );
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "discharged">("all");
  const [sortBy, setSortBy] = useState<string>("newest");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Toast notifications
  const [toast, setToast] = useState<ToastNotification | null>(null);
  const showToast = (message: string, type: "success" | "error" = "success") => {
    const id = Date.now();
    setToast({ id, type, message });
    setTimeout(() => {
      setToast((current: ToastNotification | null) => (current?.id === id ? null : current));
    }, 4000);
  };

  // -------------------------------------------------------------
  // Modals state
  // -------------------------------------------------------------
  // Admit Patient Modal
  const [isAdmitOpen, setIsAdmitOpen] = useState(false);
  const [admitForm, setAdmitForm] = useState<AdmitPatientDTO>({
    patient_id: "",
    room_id: "",
    admission_date: "",
  });
  const [isAdmitting, setIsAdmitting] = useState(false);
  const [admitError, setAdmitError] = useState<string | null>(null);

  // Discharge Modal
  const [dischargeTarget, setDischargeTarget] = useState<EnrichedAdmission | null>(null);
  const [isDischarging, setIsDischarging] = useState(false);
  const [dischargeError, setDischargeError] = useState<string | null>(null);

  // View Details Modal
  const [viewAdmission, setViewAdmission] = useState<EnrichedAdmission | null>(null);

  // -------------------------------------------------------------
  // Data Fetching
  // -------------------------------------------------------------
  const loadData = async (forceRefresh = false) => {
    if (forceRefresh) {
      setIsRefreshing(true);
    } else if (admissions.length === 0) {
      setIsLoading(true);
    }
    setError(null);

    try {
      const [admissionsData, patientsData, roomsData] = await Promise.all([
        admissionService.getAdmissions(forceRefresh),
        patientService.getPatients(forceRefresh),
        roomService.getRooms(forceRefresh),
      ]);
      setAdmissions(admissionsData);
      setPatients(patientsData);
      setRooms(roomsData);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load admission data.";
      setError(msg);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    let active = true;
    if (
      !admissionService.getCachedAdmissions() ||
      !patientService.getCachedPatients() ||
      !roomService.getCachedRooms()
    ) {
      Promise.all([
        admissionService.getAdmissions(false),
        patientService.getPatients(false),
        roomService.getRooms(false),
      ])
        .then(([admissionsData, patientsData, roomsData]) => {
          if (active) {
            setAdmissions(admissionsData);
            setPatients(patientsData);
            setRooms(roomsData);
            setIsLoading(false);
          }
        })
        .catch((err: unknown) => {
          if (active) {
            const msg = err instanceof Error ? err.message : "Failed to load admission data.";
            setError(msg);
            setIsLoading(false);
          }
        });
    }
    return () => {
      active = false;
    };
  }, []);

  // -------------------------------------------------------------
  // Relational Lookup Maps
  // -------------------------------------------------------------
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

  // Set of actively admitted patient IDs
  const activePatientIds = useMemo(() => {
    const set = new Set<string>();
    admissions.forEach((adm) => {
      if (!adm.discharge_date) {
        set.add(adm.patient_id);
      }
    });
    return set;
  }, [admissions]);

  // Map of room ID -> count of active occupants
  const roomOccupantCounts = useMemo(() => {
    const map = new Map<string, number>();
    admissions.forEach((adm) => {
      if (!adm.discharge_date) {
        map.set(adm.room_id, (map.get(adm.room_id) || 0) + 1);
      }
    });
    return map;
  }, [admissions]);

  // Enriched Admissions
  const enrichedAdmissions = useMemo<EnrichedAdmission[]>(() => {
    return admissions.map((adm) => ({
      ...adm,
      patient: patientMap.get(adm.patient_id),
      room: roomMap.get(adm.room_id),
    }));
  }, [admissions, patientMap, roomMap]);

  // -------------------------------------------------------------
  // Calculations & Formatting Helpers
  // -------------------------------------------------------------
  const formatDate = (dateStr?: string | null): string => {
    if (!dateStr) return "N/A";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatDateTime = (dateStr?: string | null): string => {
    if (!dateStr) return "N/A";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatCurrency = (amount?: number | null): string => {
    if (amount === undefined || amount === null || isNaN(amount)) return "PKR 0";
    return `PKR ${Number(amount).toLocaleString()}`;
  };

  const calculateStayDuration = (
    admissionDateStr: string,
    dischargeDateStr?: string | null
  ): { days: number; label: string } => {
    const start = new Date(admissionDateStr);
    const end = dischargeDateStr ? new Date(dischargeDateStr) : new Date();
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return { days: 1, label: "1 day" };
    }

    const diffMs = Math.max(0, end.getTime() - start.getTime());
    const totalHours = Math.round(diffMs / (1000 * 60 * 60));
    const days = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

    if (totalHours < 24) {
      return { days: 1, label: `${totalHours} hrs (1 day rate)` };
    }
    return { days, label: `${days} ${days === 1 ? "day" : "days"}` };
  };

  // -------------------------------------------------------------
  // Summary Metrics
  // -------------------------------------------------------------
  const metrics = useMemo(() => {
    const total = admissions.length;
    const active = admissions.filter((a) => !a.discharge_date).length;
    const discharged = total - active;

    // Daily revenue potential from active admissions
    const activeDailyRevenue = admissions.reduce((acc, a) => {
      if (!a.discharge_date) {
        const room = roomMap.get(a.room_id);
        return acc + (room ? Number(room.daily_charge) || 0 : 0);
      }
      return acc;
    }, 0);

    return {
      total,
      active,
      discharged,
      activeDailyRevenue,
    };
  }, [admissions, roomMap]);

  // -------------------------------------------------------------
  // Filtered & Sorted Admissions
  // -------------------------------------------------------------
  const filteredAdmissions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return enrichedAdmissions
      .filter((item) => {
        // Status filter
        if (statusFilter === "active" && item.discharge_date) return false;
        if (statusFilter === "discharged" && !item.discharge_date) return false;

        // Search query
        if (!query) return true;
        const patientName = item.patient?.name?.toLowerCase() || "";
        const patientPhone = item.patient?.phone_number?.toLowerCase() || "";
        const roomNum = item.room?.room_number?.toLowerCase() || "";
        const roomType = item.room?.type?.toLowerCase() || "";
        const idMatch = item.id.toLowerCase().includes(query);

        return (
          patientName.includes(query) ||
          patientPhone.includes(query) ||
          roomNum.includes(query) ||
          roomType.includes(query) ||
          idMatch
        );
      })
      .sort((a, b) => {
        if (sortBy === "oldest") {
          return new Date(a.admission_date).getTime() - new Date(b.admission_date).getTime();
        }
        if (sortBy === "active-first") {
          const aActive = !a.discharge_date ? 1 : 0;
          const bActive = !b.discharge_date ? 1 : 0;
          if (aActive !== bActive) return bActive - aActive;
          return new Date(b.admission_date).getTime() - new Date(a.admission_date).getTime();
        }
        // Default "newest"
        return new Date(b.admission_date).getTime() - new Date(a.admission_date).getTime();
      });
  }, [enrichedAdmissions, searchQuery, statusFilter, sortBy]);

  // -------------------------------------------------------------
  // Admit Patient Handler (POST /api/admissions)
  // -------------------------------------------------------------
  const handleOpenAdmit = () => {
    // Default to first available patient not already admitted
    const availablePatient = patients.find((p) => !activePatientIds.has(p.id));
    const defaultPatientId = availablePatient ? availablePatient.id : patients[0]?.id || "";

    // Default to first available room
    const availableRoom = rooms.find((r) => {
      const isGeneral = r.type?.toLowerCase() === "general";
      const count = roomOccupantCounts.get(r.id) || 0;
      return isGeneral || count === 0;
    });
    const defaultRoomId = availableRoom ? availableRoom.id : rooms[0]?.id || "";

    setAdmitForm({
      patient_id: defaultPatientId,
      room_id: defaultRoomId,
      admission_date: new Date().toISOString().slice(0, 16), // YYYY-MM-DDTHH:mm
    });
    setAdmitError(null);
    setIsAdmitOpen(true);
  };

  const handleAdmitSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!admitForm.patient_id || !admitForm.room_id) {
      setAdmitError("Patient and Room selection are required.");
      return;
    }

    setIsAdmitting(true);
    setAdmitError(null);

    try {
      const admissionDateIso = admitForm.admission_date
        ? new Date(admitForm.admission_date).toISOString()
        : new Date().toISOString();

      const created = await admissionService.admitPatient({
        patient_id: admitForm.patient_id,
        room_id: admitForm.room_id,
        admission_date: admissionDateIso,
      });

      setAdmissions((prev) => [created, ...prev]);
      dashboardService.clearCache(); // Sync dashboard active admissions
      setIsAdmitOpen(false);

      const admittedPatient = patientMap.get(created.patient_id);
      const admittedRoom = roomMap.get(created.room_id);
      showToast(
        `Patient ${admittedPatient?.name || "Patient"} successfully admitted to Room #${
          admittedRoom?.room_number || ""
        }!`,
        "success"
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to admit patient.";
      setAdmitError(msg);
    } finally {
      setIsAdmitting(false);
    }
  };

  // -------------------------------------------------------------
  // Discharge Patient Handler (PATCH /api/admissions/{id}/discharge)
  // -------------------------------------------------------------
  const handleOpenDischarge = (adm: EnrichedAdmission) => {
    setDischargeTarget(adm);
    setDischargeError(null);
    setViewAdmission(null);
  };

  const handleDischargeConfirm = async () => {
    if (!dischargeTarget) return;

    setIsDischarging(true);
    setDischargeError(null);

    try {
      const updated = await admissionService.dischargePatient(dischargeTarget.id);
      setAdmissions((prev) =>
        prev.map((item) =>
          item.id === dischargeTarget.id
            ? { ...item, discharge_date: updated.discharge_date || new Date().toISOString() }
            : item
        )
      );
      dashboardService.clearCache(); // Sync dashboard active admissions count
      const patientName = dischargeTarget.patient?.name || "Patient";
      setDischargeTarget(null);
      showToast(`Patient ${patientName} discharged successfully!`, "success");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to discharge patient.";
      setDischargeError(msg);
    } finally {
      setIsDischarging(false);
    }
  };

  // Table Column Definitions
  const columns = useMemo<ColumnDef<EnrichedAdmission>[]>(
    () => [
      {
        header: "Admitted Patient",
        render: (adm) => (
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-bold text-sm select-none ${
                adm.patient?.gender?.toLowerCase() === "female"
                  ? "bg-rose-100 text-rose-700"
                  : "bg-blue-100 text-blue-700"
              }`}
            >
              {adm.patient?.name
                ? adm.patient.name
                    .split(" ")
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join("")
                    .toUpperCase()
                : "PT"}
            </div>
            <div>
              <button
                type="button"
                onClick={() => setViewAdmission(adm)}
                className="font-semibold text-slate-900 hover:text-blue-600 transition-colors text-left cursor-pointer"
              >
                {adm.patient?.name || `Patient #${adm.patient_id.slice(0, 8)}`}
              </button>
              <p className="text-xs text-slate-500">
                {adm.patient?.phone_number || `UUID: ${adm.patient_id.slice(0, 8)}...`}
              </p>
            </div>
          </div>
        ),
      },
      {
        header: "Room Allocation",
        render: (adm) => (
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-900">
                Room #{adm.room?.room_number || "Unassigned"}
              </span>
              {adm.room?.type && (
                <span
                  className={`inline-flex items-center rounded-md px-2 py-0.2 text-[10px] font-semibold ${
                    adm.room.type.toLowerCase().includes("icu")
                      ? "bg-rose-50 text-rose-700 border border-rose-200"
                      : "bg-indigo-50 text-indigo-700 border border-indigo-200"
                  }`}
                >
                  {adm.room.type}
                </span>
              )}
            </div>
            <span className="text-xs text-slate-400">
              {formatCurrency(adm.room?.daily_charge)} / day
            </span>
          </div>
        ),
      },
      {
        header: "Admission Date",
        render: (adm) => (
          <div className="flex flex-col">
            <span className="font-medium text-slate-900">
              {formatDate(adm.admission_date)}
            </span>
            <span className="text-[11px] text-slate-400">
              {formatDateTime(adm.admission_date).split(",")[1]?.trim()}
            </span>
          </div>
        ),
      },
      {
        header: "Stay Duration",
        render: (adm) => {
          const stayInfo = calculateStayDuration(adm.admission_date, adm.discharge_date);
          return (
            <div className="flex flex-col">
              <span className="font-semibold text-slate-800 text-xs">
                {stayInfo.label}
              </span>
              {adm.room?.daily_charge && (
                <span className="text-[11px] text-slate-500">
                  Est. {formatCurrency(stayInfo.days * adm.room.daily_charge)}
                </span>
              )}
            </div>
          );
        },
      },
      {
        header: "Status",
        render: (adm) => {
          const isActive = !adm.discharge_date;
          return isActive ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200/60">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Active Inpatient
            </span>
          ) : (
            <div className="flex flex-col">
              <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 w-fit">
                Discharged
              </span>
              <span className="text-[10px] text-slate-400 mt-0.5">
                {formatDate(adm.discharge_date)}
              </span>
            </div>
          );
        },
      },
      {
        header: "Actions",
        align: "right",
        render: (adm) => {
          const isActive = !adm.discharge_date;
          return (
            <div className="flex items-center justify-end gap-2">
              {isActive && (
                <button
                  type="button"
                  onClick={() => handleOpenDischarge(adm)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition-colors cursor-pointer"
                  title="Discharge patient"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-3.5 w-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                    />
                  </svg>
                  <span>Discharge</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setViewAdmission(adm)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
                title="View dossier"
                aria-label={`View admission details for ${adm.patient?.name || adm.id}`}
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
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
              </button>
            </div>
          );
        },
      },
    ],
    []
  );

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Notification */}
      <Toast toast={toast} onClose={() => setToast(null)} />

      {/* Header Section */}
      <PageHeader
        title="Inpatient Admissions & Discharge"
        subtitle="Admit patients to hospital wards, monitor room occupancies, and manage patient discharges."
        badge={{
          text: `${metrics.active} ${metrics.active === 1 ? "Active Patient" : "Active Patients"}`,
          color: "emerald",
          pulse: true,
        }}
        primaryAction={{
          id: "admit-patient-btn",
          label: "Admit Patient",
          onClick: handleOpenAdmit,
        }}
        onRefresh={() => loadData(true)}
        isRefreshing={isRefreshing}
      />

      {/* Metric Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Active Inpatients */}
        <div className="flex items-center gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all hover:shadow-sm">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.8}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              />
            </svg>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Active Inpatients
            </p>
            <div className="mt-0.5 flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight text-slate-900">
                {metrics.active}
              </span>
              <span className="text-xs font-semibold text-emerald-600">Bed Occupied</span>
            </div>
          </div>
        </div>

        {/* Total Admissions */}
        <div className="flex items-center gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all hover:shadow-sm">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.8}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
              />
            </svg>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Lifetime Admissions
            </p>
            <p className="mt-0.5 text-2xl font-bold tracking-tight text-slate-900">
              {metrics.total}
            </p>
          </div>
        </div>

        {/* Discharged Patients */}
        <div className="flex items-center gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all hover:shadow-sm">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.8}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Discharged Stays
            </p>
            <p className="mt-0.5 text-2xl font-bold tracking-tight text-slate-900">
              {metrics.discharged}
            </p>
          </div>
        </div>

        {/* Active Daily Inpatient Revenue */}
        <div className="flex items-center gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all hover:shadow-sm">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.8}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Active Daily Billing
            </p>
            <p className="mt-0.5 text-2xl font-bold tracking-tight text-slate-900">
              {formatCurrency(metrics.activeDailyRevenue)}
            </p>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div
          role="alert"
          className="flex items-start justify-between rounded-2xl border border-red-200 bg-red-50/80 p-4 text-sm text-red-800"
        >
          <div className="flex items-start gap-3">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 shrink-0 text-red-600 mt-0.5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <div>
              <p className="font-semibold">Unable to fetch admission records</p>
              <p className="mt-0.5 text-red-700">{error}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => loadData(true)}
            className="rounded-lg bg-red-100 px-3 py-1 font-semibold text-red-800 hover:bg-red-200 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Search & Filters Toolbar */}
      <FilterToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search by patient name, phone, room number, or ID..."
        filters={[
          {
            id: "status-filter",
            label: "Status",
            value: statusFilter,
            onChange: (val) => setStatusFilter(val as "all" | "active" | "discharged"),
            options: [
              { value: "all", label: "All Records" },
              { value: "active", label: "Active Inpatients Only" },
              { value: "discharged", label: "Discharged Stays Only" },
            ],
          },
        ]}
        sortBy={sortBy}
        onSortChange={setSortBy}
        sortOptions={[
          { value: "newest", label: "Most Recent Admission" },
          { value: "active-first", label: "Active Inpatients First" },
          { value: "oldest", label: "Earliest Admission" },
        ]}
      />

      {/* Main Table Area */}
      <DataTable<EnrichedAdmission>
        data={filteredAdmissions}
        columns={columns}
        keyExtractor={(adm) => adm.id}
        isLoading={isLoading}
        loadingMessage="Loading admission records..."
        emptyState={{
          title:
            searchQuery || statusFilter !== "all"
              ? "No matching admission records found"
              : "No patient admissions recorded yet",
          description:
            searchQuery || statusFilter !== "all"
              ? "Try adjusting your search criteria or resetting the status filter."
              : "Begin managing inpatients by admitting a registered patient to a hospital room.",
          actionLabel:
            searchQuery || statusFilter !== "all"
              ? "Reset Search Filters"
              : "Admit First Patient Now",
          onAction:
            searchQuery || statusFilter !== "all"
              ? () => {
                  setSearchQuery("");
                  setStatusFilter("all");
                }
              : handleOpenAdmit,
        }}
        footer={{
          itemCount: filteredAdmissions.length,
          totalCount: admissions.length,
          entityLabel: "admission records",
          note: "All assignments logged under clinical protocol",
        }}
      />

      {/* ============================================================= */}
      {/* Admit Patient Modal (POST /api/admissions) */}
      {/* ============================================================= */}
      {isAdmitOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
        >
          <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl transition-all">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Admit Patient to Room</h3>
                <p className="text-xs text-slate-500">
                  Assign an active inpatient admission to an available hospital room.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAdmitOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                &times;
              </button>
            </div>

            {/* Error in modal */}
            {admitError && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                {admitError}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleAdmitSubmit} className="mt-4 space-y-4">
              {/* Select Patient */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Select Patient <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={admitForm.patient_id}
                  onChange={(e) => setAdmitForm({ ...admitForm, patient_id: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                >
                  <option value="" disabled>
                    -- Choose Patient --
                  </option>
                  {patients.map((p) => {
                    const isAlreadyAdmitted = activePatientIds.has(p.id);
                    return (
                      <option
                        key={p.id}
                        value={p.id}
                        disabled={isAlreadyAdmitted}
                        className={isAlreadyAdmitted ? "text-slate-400" : "text-slate-900"}
                      >
                        {p.name} ({p.gender}, {p.phone_number})
                        {isAlreadyAdmitted ? " [Currently Admitted]" : ""}
                      </option>
                    );
                  })}
                </select>
                <p className="mt-1 text-[11px] text-slate-400">
                  Patients with an active admission cannot be assigned to another room until discharged.
                </p>
              </div>

              {/* Select Room */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Select Room / Ward <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={admitForm.room_id}
                  onChange={(e) => setAdmitForm({ ...admitForm, room_id: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                >
                  <option value="" disabled>
                    -- Choose Room --
                  </option>
                  {rooms.map((r) => {
                    const isGeneral = r.type?.toLowerCase() === "general";
                    const occupantCount = roomOccupantCounts.get(r.id) || 0;
                    const isOccupied = !isGeneral && occupantCount > 0;

                    return (
                      <option
                        key={r.id}
                        value={r.id}
                        disabled={isOccupied}
                        className={isOccupied ? "text-slate-400" : "text-slate-900"}
                      >
                        Room #{r.room_number} — {r.type} ({formatCurrency(r.daily_charge)}/day)
                        {isOccupied ? " [Occupied]" : isGeneral ? ` (${occupantCount} patients)` : " [Available]"}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Admission Date/Time */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Admission Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={admitForm.admission_date}
                  onChange={(e) => setAdmitForm({ ...admitForm, admission_date: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
                <p className="mt-1 text-[11px] text-slate-400">
                  Defaults to current timestamp if left unchanged.
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAdmitOpen(false)}
                  disabled={isAdmitting}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  id="submit-admit-patient"
                  type="submit"
                  disabled={isAdmitting}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-xs hover:bg-blue-700 disabled:opacity-60 transition-colors cursor-pointer"
                >
                  {isAdmitting ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      <span>Admitting...</span>
                    </>
                  ) : (
                    <span>Confirm Admission</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* Discharge Confirmation Modal (PATCH /api/admissions/{id}/discharge) */}
      {/* ============================================================= */}
      {dischargeTarget && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
        >
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl transition-all">
            <div className="flex items-center gap-3.5 text-rose-600">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rose-100">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Discharge Patient?</h3>
                <p className="text-xs text-slate-500">Record final release and free the room.</p>
              </div>
            </div>

            {dischargeError && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                {dischargeError}
              </div>
            )}

            <div className="mt-4 space-y-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Patient:</span>
                <span className="font-semibold text-slate-900">
                  {dischargeTarget.patient?.name || "Patient"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Assigned Room:</span>
                <span className="font-semibold text-slate-900">
                  Room #{dischargeTarget.room?.room_number} ({dischargeTarget.room?.type})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Admitted On:</span>
                <span className="font-semibold text-slate-900">
                  {formatDateTime(dischargeTarget.admission_date)}
                </span>
              </div>
              <div className="flex justify-between border-t border-slate-200/80 pt-2">
                <span className="text-slate-500">Total Stay:</span>
                <span className="font-semibold text-emerald-700">
                  {calculateStayDuration(dischargeTarget.admission_date).label}
                </span>
              </div>
              {dischargeTarget.room?.daily_charge && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Est. Accommodation Fee:</span>
                  <span className="font-bold text-slate-900">
                    {formatCurrency(
                      calculateStayDuration(dischargeTarget.admission_date).days *
                        dischargeTarget.room.daily_charge
                    )}
                  </span>
                </div>
              )}
            </div>

            <p className="mt-3 text-xs text-slate-500">
              This action will stamp the discharge date with current timestamp and make Room #
              {dischargeTarget.room?.room_number} available for new admissions.
            </p>

            <div className="flex items-center justify-end gap-3 pt-5 border-t border-slate-100 mt-5">
              <button
                type="button"
                onClick={() => setDischargeTarget(null)}
                disabled={isDischarging}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                id="confirm-discharge-btn"
                type="button"
                onClick={handleDischargeConfirm}
                disabled={isDischarging}
                className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-rose-700 disabled:opacity-60 transition-colors cursor-pointer"
              >
                {isDischarging ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>Discharging...</span>
                  </>
                ) : (
                  <span>Confirm Discharge</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* View Admission Details Dossier */}
      {/* ============================================================= */}
      {viewAdmission && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
        >
          <div className="relative w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl transition-all">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Admission Dossier</h3>
                <p className="text-xs font-mono text-slate-400 mt-0.5">
                  Admission ID: {viewAdmission.id}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setViewAdmission(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                &times;
              </button>
            </div>

            <div className="mt-4 space-y-4">
              {/* Patient Card */}
              <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Patient Demographics
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-500">Name:</span>{" "}
                    <strong className="font-semibold text-slate-900">
                      {viewAdmission.patient?.name || "N/A"}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Gender:</span>{" "}
                    <span className="font-semibold text-slate-900">
                      {viewAdmission.patient?.gender || "N/A"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">Phone:</span>{" "}
                    <span className="font-semibold text-slate-900">
                      {viewAdmission.patient?.phone_number || "N/A"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">DOB:</span>{" "}
                    <span className="font-semibold text-slate-900">
                      {formatDate(viewAdmission.patient?.date_of_birth)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Room Card */}
              <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Room & Accommodation
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-500">Room Number:</span>{" "}
                    <strong className="font-semibold text-slate-900">
                      #{viewAdmission.room?.room_number || "N/A"}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Category:</span>{" "}
                    <span className="font-semibold text-slate-900">
                      {viewAdmission.room?.type || "N/A"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">Daily Charge:</span>{" "}
                    <span className="font-semibold text-emerald-600">
                      {formatCurrency(viewAdmission.room?.daily_charge)} / day
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">Room UUID:</span>{" "}
                    <span className="font-mono text-[10px] text-slate-500">
                      {viewAdmission.room_id.slice(0, 8)}...
                    </span>
                  </div>
                </div>
              </div>

              {/* Timeline Card */}
              <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Hospitalization Period & Billing
                </p>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Admission Timestamp:</span>
                    <span className="font-medium text-slate-900">
                      {formatDateTime(viewAdmission.admission_date)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Discharge Timestamp:</span>
                    <span className="font-medium text-slate-900">
                      {viewAdmission.discharge_date
                        ? formatDateTime(viewAdmission.discharge_date)
                        : "Active (In Hospital)"}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-slate-200/60 pt-1.5">
                    <span className="text-slate-500">Duration of Stay:</span>
                    <strong className="font-semibold text-emerald-700">
                      {calculateStayDuration(viewAdmission.admission_date, viewAdmission.discharge_date).label}
                    </strong>
                  </div>
                  {viewAdmission.room?.daily_charge && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Estimated Accommodation Subtotal:</span>
                      <strong className="font-bold text-slate-900">
                        {formatCurrency(
                          calculateStayDuration(
                            viewAdmission.admission_date,
                            viewAdmission.discharge_date
                          ).days * viewAdmission.room.daily_charge
                        )}
                      </strong>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between border-t border-slate-100 pt-4 mt-5">
              {!viewAdmission.discharge_date ? (
                <button
                  type="button"
                  onClick={() => handleOpenDischarge(viewAdmission)}
                  className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition-colors"
                >
                  Discharge Patient
                </button>
              ) : (
                <span className="text-xs text-slate-400">Admission is closed</span>
              )}

              <button
                type="button"
                onClick={() => setViewAdmission(null)}
                className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
