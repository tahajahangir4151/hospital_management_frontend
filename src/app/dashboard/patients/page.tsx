"use client";

import React, { useEffect, useState, useMemo } from "react";
import { patientService } from "@/services/patient.service";
import { dashboardService } from "@/services/dashboard.service";
import {
  Patient,
  CreatePatientDTO,
  UpdatePatientDTO,
  PatientTreatment,
  PatientAdmission,
} from "@/types/patient";
import {
  PageHeader,
  FilterToolbar,
  DataTable,
  ColumnDef,
  ConfirmDeleteModal,
  Toast,
  ToastNotification,
} from "@/components/common";

export default function PatientsPage() {
  const cachedPatients = patientService.getCachedPatients();

  const [patients, setPatients] = useState<Patient[]>(() => cachedPatients || []);
  const [isLoading, setIsLoading] = useState(() => cachedPatients === null);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [genderFilter, setGenderFilter] = useState<string>("all");
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
  // Create Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreatePatientDTO>({
    name: "",
    date_of_birth: "",
    gender: "Male",
    address: "",
    phone_number: "",
  });
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // View Details Modal
  const [viewPatient, setViewPatient] = useState<Patient | null>(null);
  const [viewTreatments, setViewTreatments] = useState<PatientTreatment[]>([]);
  const [viewAdmissions, setViewAdmissions] = useState<PatientAdmission[]>([]);
  const [isLoadingViewHistory, setIsLoadingViewHistory] = useState(false);
  const [activeTab, setActiveTab] = useState<"profile" | "treatments" | "admissions">("profile");

  // Edit Modal
  const [editPatient, setEditPatient] = useState<Patient | null>(null);
  const [editForm, setEditForm] = useState<UpdatePatientDTO>({
    name: "",
    date_of_birth: "",
    gender: "Male",
    address: "",
    phone_number: "",
  });
  const [isUpdating, setIsUpdating] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Delete Modal
  const [deleteTarget, setDeleteTarget] = useState<Patient | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // -------------------------------------------------------------
  // Data Fetching
  // -------------------------------------------------------------
  const loadPatients = async (forceRefresh = false) => {
    if (forceRefresh) {
      setIsRefreshing(true);
    } else if (patients.length === 0) {
      setIsLoading(true);
    }
    setError(null);

    try {
      const data = await patientService.getPatients(forceRefresh);
      setPatients(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load patients.";
      setError(msg);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    let active = true;
    if (!patientService.getCachedPatients()) {
      patientService
        .getPatients(false)
        .then((data) => {
          if (active) {
            setPatients(data);
            setIsLoading(false);
          }
        })
        .catch((err: unknown) => {
          if (active) {
            const msg = err instanceof Error ? err.message : "Failed to load patients.";
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
  // Helper Calculations
  // -------------------------------------------------------------
  const calculateAge = (dobString?: string | null): number | null => {
    if (!dobString) return null;
    const dob = new Date(dobString);
    if (isNaN(dob.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    return age >= 0 ? age : null;
  };

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

  // -------------------------------------------------------------
  // Summary Metrics
  // -------------------------------------------------------------
  const metrics = useMemo(() => {
    const total = patients.length;
    const maleCount = patients.filter((p) => p.gender?.toLowerCase() === "male").length;
    const femaleCount = patients.filter((p) => p.gender?.toLowerCase() === "female").length;
    const otherCount = total - maleCount - femaleCount;

    // Registrations in past 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentCount = patients.filter((p) => {
      if (!p.created_at) return false;
      const created = new Date(p.created_at);
      return !isNaN(created.getTime()) && created >= thirtyDaysAgo;
    }).length;

    return {
      total,
      maleCount,
      femaleCount,
      otherCount,
      recentCount,
    };
  }, [patients]);

  // -------------------------------------------------------------
  // Filtered & Sorted Patients
  // -------------------------------------------------------------
  const filteredPatients = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return patients
      .filter((patient) => {
        // Gender filter
        if (genderFilter !== "all") {
          if (patient.gender?.toLowerCase() !== genderFilter.toLowerCase()) {
            return false;
          }
        }

        // Search query
        if (!query) return true;
        const nameMatch = patient.name?.toLowerCase().includes(query);
        const phoneMatch = patient.phone_number?.toLowerCase().includes(query);
        const addressMatch = patient.address?.toLowerCase().includes(query);
        const idMatch = patient.id?.toLowerCase().includes(query);
        return nameMatch || phoneMatch || addressMatch || idMatch;
      })
      .sort((a, b) => {
        if (sortBy === "name-asc") {
          return (a.name || "").localeCompare(b.name || "");
        }
        if (sortBy === "name-desc") {
          return (b.name || "").localeCompare(a.name || "");
        }
        if (sortBy === "oldest") {
          return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
        }
        if (sortBy === "age-desc") {
          const ageA = calculateAge(a.date_of_birth) ?? -1;
          const ageB = calculateAge(b.date_of_birth) ?? -1;
          return ageB - ageA;
        }
        if (sortBy === "age-asc") {
          const ageA = calculateAge(a.date_of_birth) ?? 999;
          const ageB = calculateAge(b.date_of_birth) ?? 999;
          return ageA - ageB;
        }
        // default "newest"
        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      });
  }, [patients, searchQuery, genderFilter, sortBy]);

  // -------------------------------------------------------------
  // Create Patient Handler (POST /api/patients)
  // -------------------------------------------------------------
  const handleOpenCreate = () => {
    setCreateForm({
      name: "",
      date_of_birth: "",
      gender: "Male",
      address: "",
      phone_number: "",
    });
    setCreateError(null);
    setIsCreateOpen(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !createForm.name.trim() ||
      !createForm.date_of_birth.trim() ||
      !createForm.gender.trim() ||
      !createForm.address.trim() ||
      !createForm.phone_number.trim()
    ) {
      setCreateError("All fields are required.");
      return;
    }

    setIsCreating(true);
    setCreateError(null);

    try {
      const created = await patientService.createPatient(createForm);
      setPatients((prev) => [created, ...prev]);
      dashboardService.clearCache(); // Sync dashboard metric count
      setIsCreateOpen(false);
      showToast(`Patient "${created.name}" registered successfully!`, "success");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create patient.";
      setCreateError(msg);
    } finally {
      setIsCreating(false);
    }
  };

  // -------------------------------------------------------------
  // View Details Modal (GET /api/patients/{id})
  // -------------------------------------------------------------
  const handleOpenView = async (patient: Patient) => {
    setViewPatient(patient);
    setActiveTab("profile");
    setIsLoadingViewHistory(true);

    try {
      const [freshPatient, treatments, admissions] = await Promise.allSettled([
        patientService.getPatientById(patient.id),
        patientService.getPatientTreatments(patient.id),
        patientService.getPatientAdmissions(patient.id),
      ]);

      if (freshPatient.status === "fulfilled") {
        setViewPatient(freshPatient.value);
      }
      if (treatments.status === "fulfilled") {
        setViewTreatments(treatments.value);
      } else {
        setViewTreatments([]);
      }
      if (admissions.status === "fulfilled") {
        setViewAdmissions(admissions.value);
      } else {
        setViewAdmissions([]);
      }
    } catch {
      // Keep initial patient details
    } finally {
      setIsLoadingViewHistory(false);
    }
  };

  // -------------------------------------------------------------
  // Edit Patient Handler (PUT /api/patients/{id})
  // -------------------------------------------------------------
  const handleOpenEdit = (patient: Patient) => {
    setEditPatient(patient);
    setEditForm({
      name: patient.name,
      date_of_birth: patient.date_of_birth,
      gender: patient.gender,
      address: patient.address,
      phone_number: patient.phone_number,
    });
    setEditError(null);
    setViewPatient(null);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editPatient) return;

    if (
      !editForm.name.trim() ||
      !editForm.date_of_birth.trim() ||
      !editForm.gender.trim() ||
      !editForm.address.trim() ||
      !editForm.phone_number.trim()
    ) {
      setEditError("All fields are required.");
      return;
    }

    setIsUpdating(true);
    setEditError(null);

    try {
      const updated = await patientService.updatePatient(editPatient.id, editForm);
      setPatients((prev) =>
        prev.map((item) => (item.id === editPatient.id ? updated : item))
      );
      setEditPatient(null);
      showToast(`Patient "${updated.name}" updated successfully!`, "success");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update patient.";
      setEditError(msg);
    } finally {
      setIsUpdating(false);
    }
  };

  // -------------------------------------------------------------
  // Delete Patient Handler (DELETE /api/patients/{id})
  // -------------------------------------------------------------
  const handleOpenDelete = (patient: Patient) => {
    setDeleteTarget(patient);
    setDeleteError(null);
    setViewPatient(null);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;

    setIsDeleting(true);
    setDeleteError(null);

    try {
      await patientService.deletePatient(deleteTarget.id);
      setPatients((prev) => prev.filter((item) => item.id !== deleteTarget.id));
      dashboardService.clearCache(); // Sync dashboard metrics
      const deletedName = deleteTarget.name;
      setDeleteTarget(null);
      showToast(`Patient "${deletedName}" deleted successfully!`, "success");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete patient.";
      setDeleteError(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  // Table Column Definitions
  const columns = useMemo<ColumnDef<Patient>[]>(
    () => [
      {
        header: "Patient Name & Info",
        render: (patient) => {
          const initials = patient.name
            ? patient.name
                .split(" ")
                .map((n) => n[0])
                .slice(0, 2)
                .join("")
                .toUpperCase()
            : "PT";
          const isFemale = patient.gender?.toLowerCase() === "female";
          const isMale = patient.gender?.toLowerCase() === "male";
          return (
            <div className="flex items-center gap-3">
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-bold text-sm select-none ${
                  isFemale
                    ? "bg-rose-100 text-rose-700"
                    : isMale
                    ? "bg-blue-100 text-blue-700"
                    : "bg-slate-100 text-slate-700"
                }`}
              >
                {initials}
              </div>
              <div>
                <button
                  type="button"
                  onClick={() => handleOpenView(patient)}
                  className="font-semibold text-slate-900 hover:text-blue-600 transition-colors text-left cursor-pointer"
                >
                  {patient.name}
                </button>
                <p className="font-mono text-[11px] text-slate-400">
                  ID: {patient.id.slice(0, 8)}...
                </p>
              </div>
            </div>
          );
        },
      },
      {
        header: "Demographics",
        render: (patient) => {
          const age = calculateAge(patient.date_of_birth);
          return (
            <div className="flex flex-col">
              <span className="font-medium text-slate-900 text-xs">
                {age ? `${age} yrs` : "Age N/A"}
              </span>
              <span className="text-[11px] text-slate-400">
                DOB: {formatDate(patient.date_of_birth)}
              </span>
            </div>
          );
        },
      },
      {
        header: "Gender",
        render: (patient) => {
          const isFemale = patient.gender?.toLowerCase() === "female";
          const isMale = patient.gender?.toLowerCase() === "male";
          return (
            <span
              className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ${
                isMale
                  ? "bg-sky-50 text-sky-700 border border-sky-200/60"
                  : isFemale
                  ? "bg-rose-50 text-rose-700 border border-rose-200/60"
                  : "bg-slate-50 text-slate-700 border border-slate-200/60"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  isMale ? "bg-sky-500" : isFemale ? "bg-rose-500" : "bg-slate-400"
                }`}
              />
              {patient.gender}
            </span>
          );
        },
      },
      {
        header: "Contact & Address",
        render: (patient) => (
          <div className="flex flex-col max-w-xs">
            <a
              href={`tel:${patient.phone_number}`}
              className="inline-flex items-center gap-1.5 font-medium text-slate-900 hover:text-blue-600 transition-colors text-xs"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-3.5 w-3.5 text-slate-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                />
              </svg>
              <span>{patient.phone_number}</span>
            </a>
            <span className="mt-0.5 text-xs text-slate-500 truncate" title={patient.address}>
              {patient.address}
            </span>
          </div>
        ),
      },
      {
        header: "Registration Date",
        render: (patient) => (
          <span className="text-xs text-slate-500">{formatDate(patient.created_at)}</span>
        ),
      },
      {
        header: "Actions",
        align: "right",
        render: (patient) => (
          <div className="flex items-center justify-end gap-1">
            <button
              type="button"
              onClick={() => handleOpenView(patient)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
              title="View patient profile"
              aria-label={`View ${patient.name}`}
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

            <button
              type="button"
              onClick={() => handleOpenEdit(patient)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition-colors cursor-pointer"
              title="Edit patient"
              aria-label={`Edit ${patient.name}`}
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
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
            </button>

            <button
              type="button"
              onClick={() => handleOpenDelete(patient)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors cursor-pointer"
              title="Delete patient"
              aria-label={`Delete ${patient.name}`}
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
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
          </div>
        ),
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
        title="Patient Directory"
        subtitle="Manage patient demographics, contact records, admissions, and treatment profiles."
        badge={{
          text: `${patients.length} ${patients.length === 1 ? "Patient" : "Patients"}`,
          color: "blue",
        }}
        primaryAction={{
          id: "create-patient-btn",
          label: "Register Patient",
          onClick: handleOpenCreate,
        }}
        onRefresh={() => loadPatients(true)}
        isRefreshing={isRefreshing}
      />

      {/* Metrics Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Patients */}
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
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Total Patients
            </p>
            <p className="mt-0.5 text-2xl font-bold tracking-tight text-slate-900">
              {metrics.total}
            </p>
          </div>
        </div>

        {/* Male Patients */}
        <div className="flex items-center gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all hover:shadow-sm">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
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
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Male Patients
            </p>
            <div className="mt-0.5 flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight text-slate-900">
                {metrics.maleCount}
              </span>
              {metrics.total > 0 && (
                <span className="text-xs font-semibold text-sky-600">
                  {Math.round((metrics.maleCount / metrics.total) * 100)}%
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Female Patients */}
        <div className="flex items-center gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all hover:shadow-sm">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
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
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Female Patients
            </p>
            <div className="mt-0.5 flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight text-slate-900">
                {metrics.femaleCount}
              </span>
              {metrics.total > 0 && (
                <span className="text-xs font-semibold text-rose-600">
                  {Math.round((metrics.femaleCount / metrics.total) * 100)}%
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Recent Registrations */}
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
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Registered (Last 30d)
            </p>
            <p className="mt-0.5 text-2xl font-bold tracking-tight text-slate-900">
              {metrics.recentCount}
            </p>
          </div>
        </div>
      </div>

      {/* Error Alert Banner */}
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
              <p className="font-semibold">Unable to fetch patient records</p>
              <p className="mt-0.5 text-red-700">{error}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => loadPatients(true)}
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
        searchPlaceholder="Search by name, phone, address, or ID..."
        filters={[
          {
            id: "gender-filter",
            label: "Gender",
            value: genderFilter,
            onChange: setGenderFilter,
            options: [
              { value: "all", label: "All Genders" },
              { value: "Male", label: "Male" },
              { value: "Female", label: "Female" },
              { value: "Other", label: "Other" },
            ],
          },
        ]}
        sortBy={sortBy}
        onSortChange={setSortBy}
        sortOptions={[
          { value: "newest", label: "Recently Registered" },
          { value: "oldest", label: "First Registered" },
          { value: "name-asc", label: "Name (A-Z)" },
          { value: "name-desc", label: "Name (Z-A)" },
          { value: "age-desc", label: "Age (Oldest First)" },
          { value: "age-asc", label: "Age (Youngest First)" },
        ]}
      />

      {/* Main Content Area */}
      <DataTable<Patient>
        data={filteredPatients}
        columns={columns}
        keyExtractor={(p) => p.id}
        isLoading={isLoading}
        loadingMessage="Loading patients records..."
        emptyState={{
          title:
            searchQuery || genderFilter !== "all"
              ? "No matching patients found"
              : "No patients registered yet",
          description:
            searchQuery || genderFilter !== "all"
              ? "Try adjusting your search criteria or resetting filters."
              : "Get started by adding the first patient record to the system.",
          actionLabel:
            searchQuery || genderFilter !== "all"
              ? "Reset Search Filters"
              : "Register First Patient",
          onAction:
            searchQuery || genderFilter !== "all"
              ? () => {
                  setSearchQuery("");
                  setGenderFilter("all");
                }
              : handleOpenCreate,
        }}
        footer={{
          itemCount: filteredPatients.length,
          totalCount: patients.length,
          entityLabel: "patients",
          note: "All records encrypted & HIPAA compliant",
        }}
      />

      {/* ============================================================= */}
      {/* Create Patient Modal (POST /api/patients) */}
      {/* ============================================================= */}
      {isCreateOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
        >
          <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl transition-all">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Register New Patient</h3>
                <p className="text-xs text-slate-500">
                  Enter patient personal and contact information to register into the system.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                &times;
              </button>
            </div>

            {/* Error in modal */}
            {createError && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                {createError}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleCreateSubmit} className="mt-4 space-y-4">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ali Khan"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>

              {/* Date of Birth & Gender Grid */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Date of Birth <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    max={new Date().toISOString().split("T")[0]}
                    value={createForm.date_of_birth}
                    onChange={(e) => setCreateForm({ ...createForm, date_of_birth: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Gender <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={createForm.gender}
                    onChange={(e) => setCreateForm({ ...createForm, gender: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              {/* Phone Number */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. 03001234567"
                  value={createForm.phone_number}
                  onChange={(e) => setCreateForm({ ...createForm, phone_number: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>

              {/* Residential Address */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Residential Address <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="e.g. House #12, Street 4, Gulberg III, Lahore, Pakistan"
                  value={createForm.address}
                  onChange={(e) => setCreateForm({ ...createForm, address: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  disabled={isCreating}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  id="submit-create-patient"
                  type="submit"
                  disabled={isCreating}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-xs hover:bg-blue-700 disabled:opacity-60 transition-colors cursor-pointer"
                >
                  {isCreating ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      <span>Registering...</span>
                    </>
                  ) : (
                    <span>Register Patient</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* View Patient Details Modal (GET /api/patients/{id}) */}
      {/* ============================================================= */}
      {viewPatient && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
        >
          <div className="relative w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl transition-all">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-4">
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl font-bold text-lg select-none ${
                    viewPatient.gender?.toLowerCase() === "female"
                      ? "bg-rose-100 text-rose-700"
                      : "bg-blue-100 text-blue-700"
                  }`}
                >
                  {viewPatient.name
                    ? viewPatient.name
                        .split(" ")
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join("")
                        .toUpperCase()
                    : "PT"}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">{viewPatient.name}</h3>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-mono text-slate-600">
                      UUID: {viewPatient.id}
                    </span>
                    <span
                      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${
                        viewPatient.gender?.toLowerCase() === "female"
                          ? "bg-rose-50 text-rose-700"
                          : "bg-sky-50 text-sky-700"
                      }`}
                    >
                      {viewPatient.gender}
                    </span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewPatient(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                &times;
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-slate-200 mt-4">
              <button
                type="button"
                onClick={() => setActiveTab("profile")}
                className={`border-b-2 py-2.5 px-4 text-xs font-semibold uppercase tracking-wider transition-colors ${
                  activeTab === "profile"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                Profile Details
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("treatments")}
                className={`border-b-2 py-2.5 px-4 text-xs font-semibold uppercase tracking-wider transition-colors ${
                  activeTab === "treatments"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                Treatments ({viewTreatments.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("admissions")}
                className={`border-b-2 py-2.5 px-4 text-xs font-semibold uppercase tracking-wider transition-colors ${
                  activeTab === "admissions"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                Admissions ({viewAdmissions.length})
              </button>
            </div>

            {/* Tab Contents */}
            <div className="py-4">
              {activeTab === "profile" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5">
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Date of Birth & Age
                      </p>
                      <p className="mt-1 font-semibold text-slate-900">
                        {formatDate(viewPatient.date_of_birth)}{" "}
                        <span className="text-slate-500 font-normal">
                          ({calculateAge(viewPatient.date_of_birth)} years old)
                        </span>
                      </p>
                    </div>

                    <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5">
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Contact Phone
                      </p>
                      <a
                        href={`tel:${viewPatient.phone_number}`}
                        className="mt-1 inline-flex items-center gap-1.5 font-semibold text-blue-600 hover:underline"
                      >
                        {viewPatient.phone_number}
                      </a>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Residential Address
                    </p>
                    <p className="mt-1 text-sm font-medium text-slate-800">
                      {viewPatient.address}
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Initial Registration Date
                    </p>
                    <p className="mt-1 text-sm font-medium text-slate-800">
                      {formatDateTime(viewPatient.created_at)}
                    </p>
                  </div>
                </div>
              )}

              {activeTab === "treatments" && (
                <div className="space-y-3">
                  {isLoadingViewHistory ? (
                    <div className="py-8 text-center text-sm text-slate-500">
                      Loading treatment history...
                    </div>
                  ) : viewTreatments.length === 0 ? (
                    <div className="py-8 text-center text-sm text-slate-400">
                      No treatments recorded for this patient yet.
                    </div>
                  ) : (
                    <div className="max-h-60 overflow-y-auto space-y-2">
                      {viewTreatments.map((t, idx) => (
                        <div
                          key={t.id || idx}
                          className="rounded-xl border border-slate-100 bg-slate-50/60 p-3 text-xs"
                        >
                          <p className="font-semibold text-slate-900">
                            {t.treatment_name || t.diagnosis || "Medical Treatment"}
                          </p>
                          <p className="text-slate-500 mt-0.5">
                            {t.description || t.notes || "No notes available"}
                          </p>
                          {t.treatment_date && (
                            <p className="text-[11px] text-slate-400 mt-1">
                              Date: {formatDate(t.treatment_date)}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === "admissions" && (
                <div className="space-y-3">
                  {isLoadingViewHistory ? (
                    <div className="py-8 text-center text-sm text-slate-500">
                      Loading admissions history...
                    </div>
                  ) : viewAdmissions.length === 0 ? (
                    <div className="py-8 text-center text-sm text-slate-400">
                      No admission records found for this patient.
                    </div>
                  ) : (
                    <div className="max-h-60 overflow-y-auto space-y-2">
                      {viewAdmissions.map((adm, idx) => (
                        <div
                          key={adm.id || idx}
                          className="rounded-xl border border-slate-100 bg-slate-50/60 p-3 text-xs"
                        >
                          <div className="flex justify-between items-center">
                            <span className="font-semibold text-slate-900">
                              Admission #{adm.id?.slice(0, 8)}
                            </span>
                            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                              {adm.status || "Admitted"}
                            </span>
                          </div>
                          <p className="text-slate-500 mt-1">
                            Admitted on: {formatDate(adm.admission_date)}
                            {adm.discharge_date && ` • Discharged: ${formatDate(adm.discharge_date)}`}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => handleOpenDelete(viewPatient)}
                className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors"
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
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
                <span>Delete Patient</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenEdit(viewPatient)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 text-slate-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                  <span>Edit Profile</span>
                </button>

                <button
                  type="button"
                  onClick={() => setViewPatient(null)}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* Edit Patient Modal (PUT /api/patients/{id}) */}
      {/* ============================================================= */}
      {editPatient && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
        >
          <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl transition-all">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Edit Patient Profile</h3>
                <p className="text-xs text-slate-500">
                  Update demographics and contact details for {editPatient.name}.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditPatient(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                &times;
              </button>
            </div>

            {/* Error */}
            {editError && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                {editError}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleEditSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Date of Birth <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    max={new Date().toISOString().split("T")[0]}
                    value={editForm.date_of_birth}
                    onChange={(e) => setEditForm({ ...editForm, date_of_birth: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Gender <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={editForm.gender}
                    onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={editForm.phone_number}
                  onChange={(e) => setEditForm({ ...editForm, phone_number: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Residential Address <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={editForm.address}
                  onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditPatient(null)}
                  disabled={isUpdating}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  id="submit-edit-patient"
                  type="submit"
                  disabled={isUpdating}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-xs hover:bg-blue-700 disabled:opacity-60 transition-colors cursor-pointer"
                >
                  {isUpdating ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      <span>Saving Changes...</span>
                    </>
                  ) : (
                    <span>Save Changes</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* Delete Patient Modal */}
      <ConfirmDeleteModal
        isOpen={!!deleteTarget}
        title="Delete Patient Record?"
        subtitle="This action cannot be undone."
        description={
          deleteTarget ? (
            <p>
              Are you sure you want to delete the record for{" "}
              <strong className="font-semibold text-slate-900">{deleteTarget.name}</strong>?
              This will remove all associated profile data from the hospital registry.
            </p>
          ) : null
        }
        confirmLabel="Delete Patient"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
        isDeleting={isDeleting}
        errorMessage={deleteError}
      />
    </div>
  );
}
