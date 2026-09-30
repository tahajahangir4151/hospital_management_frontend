"use client";

import React, { useEffect, useState, useMemo } from "react";
import { treatmentService } from "@/services/treatment.service";
import { doctorService } from "@/services/doctor.service";
import { patientService } from "@/services/patient.service";
import {
  Treatment,
  CreateTreatmentDTO,
  UpdateTreatmentDTO,
  EnrichedTreatment,
} from "@/types/treatment";
import { Doctor } from "@/types/doctor";
import { Patient } from "@/types/patient";
import {
  PageHeader,
  FilterToolbar,
  DataTable,
  ColumnDef,
  ConfirmDeleteModal,
  Toast,
  ToastData,
} from "@/components/common";
import { Sparkline } from "@/components/dashboard/sparkline";

export default function TreatmentsPage() {
  const cachedTreatments = treatmentService.getCachedTreatments();
  const cachedDoctors = doctorService.getCachedDoctors();
  const cachedPatients = patientService.getCachedPatients();

  const [treatments, setTreatments] = useState<Treatment[]>(() => cachedTreatments || []);
  const [doctors, setDoctors] = useState<Doctor[]>(() => cachedDoctors || []);
  const [patients, setPatients] = useState<Patient[]>(() => cachedPatients || []);

  const [isLoading, setIsLoading] = useState(
    () => cachedTreatments === null || cachedDoctors === null || cachedPatients === null
  );
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [doctorFilter, setDoctorFilter] = useState("all");
  const [sortBy, setSortBy] = useState<string>("newest");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Toast
  const [toast, setToast] = useState<ToastData | null>(null);
  const showToast = (message: string, type: "success" | "error" = "success") => {
    const id = Date.now();
    setToast({ id, type, message });
    setTimeout(() => {
      setToast((current) => (current?.id === id ? null : current));
    }, 4000);
  };

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateTreatmentDTO>({
    doctor_id: "",
    patient_id: "",
    treatment_date: new Date().toISOString().split("T")[0],
    diagnosis: "",
    medication: "",
  });
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [editTreatment, setEditTreatment] = useState<EnrichedTreatment | null>(null);
  const [editForm, setEditForm] = useState<UpdateTreatmentDTO>({
    doctor_id: "",
    patient_id: "",
    treatment_date: "",
    diagnosis: "",
    medication: "",
  });
  const [isUpdating, setIsUpdating] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<EnrichedTreatment | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [viewTreatment, setViewTreatment] = useState<EnrichedTreatment | null>(null);

  // Data Fetching
  const loadData = async (forceRefresh = false) => {
    if (forceRefresh) {
      setIsRefreshing(true);
    } else if (treatments.length === 0) {
      setIsLoading(true);
    }
    setError(null);

    try {
      const [treatmentsData, doctorsData, patientsData] = await Promise.all([
        treatmentService.getTreatments(forceRefresh),
        doctorService.getDoctors(forceRefresh),
        patientService.getPatients(forceRefresh),
      ]);
      setTreatments(treatmentsData);
      setDoctors(doctorsData);
      setPatients(patientsData);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load treatment records.";
      setError(msg);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    let active = true;
    if (
      !treatmentService.getCachedTreatments() ||
      !doctorService.getCachedDoctors() ||
      !patientService.getCachedPatients()
    ) {
      Promise.all([
        treatmentService.getTreatments(false),
        doctorService.getDoctors(false),
        patientService.getPatients(false),
      ])
        .then(([treatmentsData, doctorsData, patientsData]) => {
          if (active) {
            setTreatments(treatmentsData);
            setDoctors(doctorsData);
            setPatients(patientsData);
            setIsLoading(false);
          }
        })
        .catch((err: unknown) => {
          if (active) {
            const msg = err instanceof Error ? err.message : "Failed to load treatment records.";
            setError(msg);
            setIsLoading(false);
          }
        });
    }
    return () => {
      active = false;
    };
  }, []);

  // Relational Lookups
  const doctorMap = useMemo(() => {
    const map = new Map<string, Doctor>();
    doctors.forEach((d) => map.set(d.id, d));
    return map;
  }, [doctors]);

  const patientMap = useMemo(() => {
    const map = new Map<string, Patient>();
    patients.forEach((p) => map.set(p.id, p));
    return map;
  }, [patients]);

  const enrichedTreatments = useMemo<EnrichedTreatment[]>(() => {
    return treatments.map((t) => ({
      ...t,
      doctor: doctorMap.get(t.doctor_id),
      patient: patientMap.get(t.patient_id),
    }));
  }, [treatments, doctorMap, patientMap]);

  // Date formatter
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

  // Metrics
  const metrics = useMemo(() => {
    const total = treatments.length;
    const uniquePatients = new Set(treatments.map((t) => t.patient_id)).size;
    const uniqueDoctors = new Set(treatments.map((t) => t.doctor_id)).size;
    const prescribedCount = treatments.filter((t) => t.medication && t.medication.trim()).length;

    return {
      total,
      uniquePatients,
      uniqueDoctors,
      prescribedCount,
    };
  }, [treatments]);

  // Filtered & Sorted
  const filteredTreatments = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return enrichedTreatments
      .filter((t) => {
        if (doctorFilter !== "all" && t.doctor_id !== doctorFilter) {
          return false;
        }

        if (!query) return true;
        const diagMatch = t.diagnosis?.toLowerCase().includes(query);
        const medMatch = t.medication?.toLowerCase().includes(query);
        const docMatch = t.doctor?.full_name?.toLowerCase().includes(query);
        const patientMatch = t.patient?.name?.toLowerCase().includes(query);
        const idMatch = t.id.toLowerCase().includes(query);

        return diagMatch || medMatch || docMatch || patientMatch || idMatch;
      })
      .sort((a, b) => {
        if (sortBy === "oldest") {
          return new Date(a.treatment_date).getTime() - new Date(b.treatment_date).getTime();
        }
        return new Date(b.treatment_date).getTime() - new Date(a.treatment_date).getTime();
      });
  }, [enrichedTreatments, searchQuery, doctorFilter, sortBy]);

  // Handlers
  const handleOpenCreate = () => {
    setCreateForm({
      doctor_id: doctors[0]?.id || "",
      patient_id: patients[0]?.id || "",
      treatment_date: new Date().toISOString().split("T")[0],
      diagnosis: "",
      medication: "",
    });
    setCreateError(null);
    setIsCreateOpen(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !createForm.doctor_id.trim() ||
      !createForm.patient_id.trim() ||
      !createForm.treatment_date.trim() ||
      !createForm.diagnosis.trim()
    ) {
      setCreateError("Doctor, Patient, Treatment Date, and Diagnosis are required.");
      return;
    }

    setIsCreating(true);
    setCreateError(null);

    try {
      const created = await treatmentService.createTreatment(createForm);
      setTreatments((prev) => [created, ...prev]);
      setIsCreateOpen(false);
      showToast("Medical treatment record created successfully!", "success");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to record treatment.";
      setCreateError(msg);
    } finally {
      setIsCreating(false);
    }
  };

  const handleOpenEdit = (t: EnrichedTreatment) => {
    setEditTreatment(t);
    setEditForm({
      doctor_id: t.doctor_id,
      patient_id: t.patient_id,
      treatment_date: t.treatment_date,
      diagnosis: t.diagnosis,
      medication: t.medication || "",
    });
    setEditError(null);
    setViewTreatment(null);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTreatment) return;

    if (
      !editForm.doctor_id.trim() ||
      !editForm.patient_id.trim() ||
      !editForm.treatment_date.trim() ||
      !editForm.diagnosis.trim()
    ) {
      setEditError("Doctor, Patient, Treatment Date, and Diagnosis are required.");
      return;
    }

    setIsUpdating(true);
    setEditError(null);

    try {
      const updated = await treatmentService.updateTreatment(editTreatment.id, editForm);
      setTreatments((prev) =>
        prev.map((item) => (item.id === editTreatment.id ? updated : item))
      );
      setEditTreatment(null);
      showToast("Treatment record updated successfully!", "success");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update treatment.";
      setEditError(msg);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;

    setIsDeleting(true);
    setDeleteError(null);

    try {
      await treatmentService.deleteTreatment(deleteTarget.id);
      setTreatments((prev) => prev.filter((item) => item.id !== deleteTarget.id));
      setDeleteTarget(null);
      showToast("Treatment record deleted successfully!", "success");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete treatment.";
      setDeleteError(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  // Table Columns Definition
  const columns: ColumnDef<EnrichedTreatment>[] = [
    {
      header: "Patient",
      render: (t) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-950/70 font-bold text-xs text-blue-700 dark:text-blue-300 border border-blue-200/50 dark:border-blue-900/50 select-none">
            {t.patient?.name
              ? t.patient.name
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
              onClick={() => setViewTreatment(t)}
              className="font-semibold text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-left cursor-pointer"
            >
              {t.patient?.name || `Patient #${t.patient_id.slice(0, 8)}`}
            </button>
            <p className="text-xs text-slate-400 dark:text-slate-500 font-mono">
              {t.patient?.phone_number || `ID: ${t.patient_id.slice(0, 8)}...`}
            </p>
          </div>
        </div>
      ),
    },
    {
      header: "Attending Doctor",
      render: (t) => (
        <div className="flex flex-col">
          <span className="font-semibold text-slate-900 dark:text-white">
            {t.doctor?.full_name || `Dr. #${t.doctor_id.slice(0, 8)}`}
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {t.doctor?.specialization || "Physician"}
          </span>
        </div>
      ),
    },
    {
      header: "Clinical Diagnosis",
      render: (t) => (
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/50 px-2.5 py-1 text-xs font-semibold text-amber-800 dark:text-amber-300 border border-amber-200/60 dark:border-amber-900/50">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
          {t.diagnosis}
        </span>
      ),
    },
    {
      header: "Prescribed Medication",
      render: (t) =>
        t.medication ? (
          <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-900/50">
            {t.medication}
          </span>
        ) : (
          <span className="text-xs text-slate-400 dark:text-slate-500 italic">None prescribed</span>
        ),
    },
    {
      header: "Treatment Date",
      render: (t) => (
        <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
          {formatDate(t.treatment_date)}
        </span>
      ),
    },
    {
      header: "Actions",
      align: "right",
      render: (t) => (
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            onClick={() => setViewTreatment(t)}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
            title="View treatment dossier"
            aria-label="View treatment dossier"
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
            onClick={() => handleOpenEdit(t)}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-blue-50 dark:hover:bg-blue-950/60 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
            title="Edit treatment"
            aria-label="Edit treatment"
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
            onClick={() => setDeleteTarget(t)}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 dark:hover:bg-red-950/60 hover:text-red-600 dark:hover:text-red-400 transition-colors cursor-pointer"
            title="Delete treatment"
            aria-label="Delete treatment"
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
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Notification */}
      <Toast toast={toast} onClose={() => setToast(null)} />

      {/* Page Header Component */}
      <PageHeader
        title="Medical Treatments & Prescriptions"
        subtitle="Record clinical diagnoses, prescribe medication, and track patient treatment history."
        badge={{
          text: `${treatments.length} Records`,
          color: "blue",
          pulse: true,
        }}
        onRefresh={() => loadData(true)}
        isRefreshing={isRefreshing}
        action={{
          label: "Record Treatment",
          onClick: handleOpenCreate,
          id: "create-treatment-btn",
        }}
      />

      {/* Metric Summary Cards with Sparklines */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex items-center justify-between rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-5 shadow-xs">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/50">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.8}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
                />
              </svg>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Total Treatments
              </p>
              <p className="mt-0.5 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                {metrics.total}
              </p>
            </div>
          </div>
          <Sparkline data={[12, 14, 16, 18, 17, 21, metrics.total || 22]} color="blue" width={70} height={32} />
        </div>

        <div className="flex items-center justify-between rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-5 shadow-xs">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/50">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
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
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Treated Patients
              </p>
              <p className="mt-0.5 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                {metrics.uniquePatients}
              </p>
            </div>
          </div>
          <Sparkline data={[8, 10, 11, 14, 13, 16, metrics.uniquePatients || 17]} color="emerald" width={70} height={32} />
        </div>

        <div className="flex items-center justify-between rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-5 shadow-xs">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/50">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
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
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Attending Doctors
              </p>
              <p className="mt-0.5 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                {metrics.uniqueDoctors}
              </p>
            </div>
          </div>
          <Sparkline data={[4, 4, 5, 5, 6, 7, metrics.uniqueDoctors || 8]} color="purple" width={70} height={32} />
        </div>

        <div className="flex items-center justify-between rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-5 shadow-xs">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/50">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.8}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Prescriptions Issued
              </p>
              <p className="mt-0.5 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                {metrics.prescribedCount}
              </p>
            </div>
          </div>
          <Sparkline data={[10, 11, 13, 15, 14, 17, metrics.prescribedCount || 18]} color="amber" width={70} height={32} />
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      )}

      {/* FilterToolbar Component */}
      <FilterToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search by diagnosis, medication, doctor, or patient..."
        filters={[
          {
            id: "doctor-filter",
            label: "Doctor",
            value: doctorFilter,
            onChange: setDoctorFilter,
            options: [
              { value: "all", label: "All Doctors" },
              ...doctors.map((d) => ({ value: d.id, label: `Dr. ${d.full_name}` })),
            ],
          },
        ]}
        sortBy={sortBy}
        onSortChange={setSortBy}
        sortOptions={[
          { value: "newest", label: "Most Recent Date" },
          { value: "oldest", label: "Earliest Date" },
        ]}
      />

      {/* DataTable Component */}
      <DataTable<EnrichedTreatment>
        data={filteredTreatments}
        columns={columns}
        keyExtractor={(item) => item.id}
        isLoading={isLoading}
        loadingMessage="Loading medical treatment records..."
        emptyState={{
          title: "No treatments recorded",
          description:
            searchQuery || doctorFilter !== "all"
              ? "Try adjusting your search criteria."
              : "Record the first medical treatment for an admitted or outpatient.",
          actionLabel:
            searchQuery || doctorFilter !== "all" ? undefined : "Record Treatment Now",
          onAction: handleOpenCreate,
        }}
        footer={{
          itemCount: filteredTreatments.length,
          totalCount: treatments.length,
          entityLabel: "treatment records",
          note: "Recorded under registered clinical practice protocols",
        }}
      />

      {/* Create Treatment Modal */}
      {isCreateOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200"
        >
          <div className="relative w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl text-slate-900 dark:text-white">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Record Medical Treatment</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Assign attending doctor, patient, clinical diagnosis, and medications.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                &times;
              </button>
            </div>

            {createError && (
              <div className="mt-4 rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/40 p-3 text-xs text-red-700 dark:text-red-400">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Attending Doctor <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={createForm.doctor_id}
                  onChange={(e) => setCreateForm({ ...createForm, doctor_id: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/40"
                >
                  <option value="" disabled>
                    -- Select Doctor --
                  </option>
                  {doctors.map((d) => (
                    <option key={d.id} value={d.id}>
                      Dr. {d.full_name} ({d.specialization})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Patient <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={createForm.patient_id}
                  onChange={(e) => setCreateForm({ ...createForm, patient_id: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/40"
                >
                  <option value="" disabled>
                    -- Select Patient --
                  </option>
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.gender}, {p.phone_number})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Treatment Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={createForm.treatment_date}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, treatment_date: e.target.value })
                  }
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-sm text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/40"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Diagnosis <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. High fever, Acute Bronchitis, Migraine"
                  value={createForm.diagnosis}
                  onChange={(e) => setCreateForm({ ...createForm, diagnosis: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/40"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Medication & Prescriptions
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Paracetamol 500mg, Amoxicillin 250mg TDS"
                  value={createForm.medication}
                  onChange={(e) => setCreateForm({ ...createForm, medication: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/40"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  disabled={isCreating}
                  className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-xs hover:bg-blue-700 disabled:opacity-60 transition-colors cursor-pointer"
                >
                  {isCreating ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Treatment</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Treatment Modal */}
      {editTreatment && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200"
        >
          <div className="relative w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl text-slate-900 dark:text-white">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Edit Treatment Record</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Update diagnosis, physician, or medication instructions.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditTreatment(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                &times;
              </button>
            </div>

            {editError && (
              <div className="mt-4 rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/40 p-3 text-xs text-red-700 dark:text-red-400">
                {editError}
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Attending Doctor <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={editForm.doctor_id}
                  onChange={(e) => setEditForm({ ...editForm, doctor_id: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/40"
                >
                  {doctors.map((d) => (
                    <option key={d.id} value={d.id}>
                      Dr. {d.full_name} ({d.specialization})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Patient <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={editForm.patient_id}
                  onChange={(e) => setEditForm({ ...editForm, patient_id: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/40"
                >
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.gender})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Treatment Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={editForm.treatment_date}
                  onChange={(e) => setEditForm({ ...editForm, treatment_date: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-sm text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/40"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Diagnosis <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editForm.diagnosis}
                  onChange={(e) => setEditForm({ ...editForm, diagnosis: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-sm text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/40"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Medication & Prescriptions
                </label>
                <textarea
                  rows={2}
                  value={editForm.medication}
                  onChange={(e) => setEditForm({ ...editForm, medication: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-sm text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/40"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditTreatment(null)}
                  disabled={isUpdating}
                  className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-xs hover:bg-blue-700 disabled:opacity-60 transition-colors cursor-pointer"
                >
                  {isUpdating ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      <span>Saving...</span>
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

      {/* Confirm Delete Modal Component */}
      <ConfirmDeleteModal
        isOpen={deleteTarget !== null}
        title="Delete Treatment Record?"
        description={
          <p>
            Are you sure you want to delete the treatment record for{" "}
            <strong className="font-semibold text-slate-900 dark:text-white">
              {deleteTarget?.patient?.name || "Patient"}
            </strong>{" "}
            diagnosed with <em>&ldquo;{deleteTarget?.diagnosis}&rdquo;</em>?
          </p>
        }
        confirmLabel="Delete Treatment"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
        isDeleting={isDeleting}
        errorMessage={deleteError}
      />

      {/* View Treatment Dossier Modal */}
      {viewTreatment && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200"
        >
          <div className="relative w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl text-slate-900 dark:text-white">
            <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Treatment Dossier</h3>
                <p className="text-xs font-mono text-slate-400 dark:text-slate-500 mt-0.5">
                  Record ID: {viewTreatment.id}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setViewTreatment(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="mt-4 space-y-3.5">
              <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/60 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">
                  Patient Information
                </p>
                <p className="text-base font-bold text-slate-900 dark:text-white">
                  {viewTreatment.patient?.name || "Unknown Patient"}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {viewTreatment.patient?.gender} • Phone:{" "}
                  {viewTreatment.patient?.phone_number || "N/A"}
                </p>
              </div>

              <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/60 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">
                  Attending Physician
                </p>
                <p className="text-base font-bold text-slate-900 dark:text-white">
                  Dr. {viewTreatment.doctor?.full_name || "Unknown Physician"}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Specialization: {viewTreatment.doctor?.specialization || "General"}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/60 p-3.5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Clinical Diagnosis
                  </p>
                  <p className="mt-1 font-semibold text-amber-800 dark:text-amber-300">
                    {viewTreatment.diagnosis}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/60 p-3.5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Treatment Date
                  </p>
                  <p className="mt-1 font-semibold text-slate-900 dark:text-white">
                    {formatDate(viewTreatment.treatment_date)}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/60 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">
                  Prescription & Medication
                </p>
                <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                  {viewTreatment.medication || "No medication specified."}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-4 mt-5">
              <button
                type="button"
                onClick={() => {
                  setDeleteTarget(viewTreatment);
                  setViewTreatment(null);
                }}
                className="text-xs font-semibold text-red-600 dark:text-red-400 hover:underline cursor-pointer"
              >
                Delete Record
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenEdit(viewTreatment)}
                  className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors cursor-pointer"
                >
                  Edit Record
                </button>
                <button
                  type="button"
                  onClick={() => setViewTreatment(null)}
                  className="rounded-xl bg-slate-900 dark:bg-slate-700 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 dark:hover:bg-slate-600 transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
