"use client";

import React, { useEffect, useState, useMemo } from "react";
import { doctorService } from "@/services/doctor.service";
import { departmentService } from "@/services/department.service";
import { dashboardService } from "@/services/dashboard.service";
import { Doctor, CreateDoctorDTO, UpdateDoctorDTO } from "@/types/doctor";
import { Department } from "@/types/department";

interface ToastNotification {
  id: number;
  type: "success" | "error";
  message: string;
}

export default function DoctorsPage() {
  const cachedDoctors = doctorService.getCachedDoctors();
  const cachedDepartments = departmentService.getCachedDepartments();

  const [doctors, setDoctors] = useState<Doctor[]>(() => cachedDoctors || []);
  const [departments, setDepartments] = useState<Department[]>(() => cachedDepartments || []);
  const [isLoading, setIsLoading] = useState(() => cachedDoctors === null);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [specialtyFilter, setSpecialtyFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Toast notifications
  const [toast, setToast] = useState<ToastNotification | null>(null);
  const showToast = (message: string, type: "success" | "error" = "success") => {
    const id = Date.now();
    setToast({ id, type, message });
    setTimeout(() => {
      setToast((current) => (current?.id === id ? null : current));
    }, 4000);
  };

  // -------------------------------------------------------------
  // Modals state
  // -------------------------------------------------------------
  // Create Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateDoctorDTO>({
    full_name: "",
    specialization: "",
    years_of_experience: 1,
    contact_number: "",
    department_id: "",
  });
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // View Details Modal
  const [viewDoctor, setViewDoctor] = useState<Doctor | null>(null);
  const [viewTreatments, setViewTreatments] = useState<unknown[]>([]);
  const [isLoadingView, setIsLoadingView] = useState(false);

  // Edit Modal
  const [editDoctor, setEditDoctor] = useState<Doctor | null>(null);
  const [editForm, setEditForm] = useState<UpdateDoctorDTO>({
    full_name: "",
    specialization: "",
    years_of_experience: 1,
    contact_number: "",
    department_id: "",
  });
  const [isUpdating, setIsUpdating] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Delete Modal
  const [deleteTarget, setDeleteTarget] = useState<Doctor | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // -------------------------------------------------------------
  // Data Fetching
  // -------------------------------------------------------------
  const loadData = async (forceRefresh = false) => {
    if (forceRefresh) {
      setIsRefreshing(true);
    } else if (doctors.length === 0) {
      setIsLoading(true);
    }
    setError(null);

    try {
      const [doctorsData, departmentsData] = await Promise.all([
        doctorService.getDoctors(forceRefresh),
        departmentService.getDepartments(forceRefresh),
      ]);
      setDoctors(doctorsData);
      setDepartments(departmentsData);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load doctors.";
      setError(msg);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (!doctorService.getCachedDoctors() || !departmentService.getCachedDepartments()) {
      loadData(false);
    }
  }, []);

  // Department ID to Name lookup map
  const departmentMap = useMemo(() => {
    const map = new Map<string, Department>();
    departments.forEach((dept) => map.set(dept.id, dept));
    return map;
  }, [departments]);

  // Unique specializations for filter dropdown
  const uniqueSpecialties = useMemo(() => {
    const set = new Set<string>();
    doctors.forEach((doc) => {
      if (doc.specialization?.trim()) {
        set.add(doc.specialization.trim());
      }
    });
    return Array.from(set);
  }, [doctors]);

  // Filtered doctors list
  const filteredDoctors = useMemo(() => {
    return doctors.filter((doc) => {
      // Search matching name, specialty, phone, or department name
      const query = searchQuery.toLowerCase().trim();
      const dept = departmentMap.get(doc.department_id);
      const deptName = dept ? dept.name.toLowerCase() : "";

      const matchesSearch =
        !query ||
        doc.full_name.toLowerCase().includes(query) ||
        doc.specialization.toLowerCase().includes(query) ||
        doc.contact_number.toLowerCase().includes(query) ||
        deptName.includes(query);

      const matchesSpecialty =
        specialtyFilter === "all" || doc.specialization.toLowerCase() === specialtyFilter.toLowerCase();

      const matchesDepartment =
        departmentFilter === "all" || doc.department_id === departmentFilter;

      return matchesSearch && matchesSpecialty && matchesDepartment;
    });
  }, [doctors, searchQuery, specialtyFilter, departmentFilter, departmentMap]);

  // Metrics
  const avgExperience = useMemo(() => {
    if (doctors.length === 0) return 0;
    const total = doctors.reduce((acc, doc) => acc + (Number(doc.years_of_experience) || 0), 0);
    return Math.round((total / doctors.length) * 10) / 10;
  }, [doctors]);

  // -------------------------------------------------------------
  // Create Doctor (POST /api/doctors)
  // -------------------------------------------------------------
  const handleOpenCreate = () => {
    setCreateForm({
      full_name: "",
      specialization: "",
      years_of_experience: 1,
      contact_number: "",
      department_id: departments[0]?.id || "",
    });
    setCreateError(null);
    setIsCreateOpen(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.full_name.trim() || !createForm.specialization.trim() || !createForm.contact_number.trim() || !createForm.department_id) {
      setCreateError("All fields including department assignment are required.");
      return;
    }

    setIsCreating(true);
    setCreateError(null);

    try {
      const created = await doctorService.createDoctor(createForm);
      setDoctors((prev) => [created, ...prev]);
      dashboardService.clearCache(); // Keep dashboard stats in sync
      setIsCreateOpen(false);
      showToast(`Dr. "${created.full_name}" registered successfully!`, "success");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to register doctor.";
      setCreateError(msg);
    } finally {
      setIsCreating(false);
    }
  };

  // -------------------------------------------------------------
  // View Doctor (GET /api/doctors/{id})
  // -------------------------------------------------------------
  const handleOpenView = async (doc: Doctor) => {
    setViewDoctor(doc);
    setViewTreatments([]);
    setIsLoadingView(true);

    try {
      const [freshDoctor, treatments] = await Promise.all([
        doctorService.getDoctorById(doc.id),
        doctorService.getDoctorTreatments(doc.id),
      ]);
      setViewDoctor(freshDoctor);
      setViewTreatments(treatments);
    } catch {
      // Fallback to local doc record
    } finally {
      setIsLoadingView(false);
    }
  };

  // -------------------------------------------------------------
  // Edit Doctor (PUT /api/doctors/{id})
  // -------------------------------------------------------------
  const handleOpenEdit = (doc: Doctor) => {
    setEditDoctor(doc);
    setEditForm({
      full_name: doc.full_name,
      specialization: doc.specialization,
      years_of_experience: doc.years_of_experience,
      contact_number: doc.contact_number,
      department_id: doc.department_id,
    });
    setEditError(null);
    setViewDoctor(null);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editDoctor) return;

    if (!editForm.full_name.trim() || !editForm.specialization.trim() || !editForm.contact_number.trim() || !editForm.department_id) {
      setEditError("All fields are required.");
      return;
    }

    setIsUpdating(true);
    setEditError(null);

    try {
      await doctorService.updateDoctor(editDoctor.id, editForm);
      setDoctors((prev) =>
        prev.map((d) =>
          d.id === editDoctor.id
            ? {
                ...d,
                full_name: editForm.full_name.trim(),
                specialization: editForm.specialization.trim(),
                years_of_experience: Number(editForm.years_of_experience),
                contact_number: editForm.contact_number.trim(),
                department_id: editForm.department_id,
              }
            : d
        )
      );
      dashboardService.clearCache();
      setEditDoctor(null);
      showToast(`Dr. "${editForm.full_name}" updated successfully!`, "success");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update doctor details.";
      setEditError(msg);
    } finally {
      setIsUpdating(false);
    }
  };

  // -------------------------------------------------------------
  // Delete Doctor (DELETE /api/doctors/{id})
  // -------------------------------------------------------------
  const handleOpenDelete = (doc: Doctor) => {
    setDeleteTarget(doc);
    setDeleteError(null);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;

    setIsDeleting(true);
    setDeleteError(null);

    try {
      await doctorService.deleteDoctor(deleteTarget.id);
      setDoctors((prev) => prev.filter((d) => d.id !== deleteTarget.id));
      dashboardService.clearCache();
      showToast(`Dr. "${deleteTarget.full_name}" removed from registry.`, "success");
      setDeleteTarget(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete doctor.";
      setDeleteError(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "2-digit",
        year: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="space-y-6 relative">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-20 right-6 z-50 animate-in fade-in slide-in-from-top-4 duration-300">
          <div
            className={`flex items-center gap-3 rounded-xl border px-4 py-3 shadow-lg ${
              toast.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                : "border-red-200 bg-red-50 text-red-900"
            }`}
          >
            {toast.type === "success" ? (
              <svg className="h-5 w-5 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg className="h-5 w-5 text-red-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            <p className="text-sm font-medium">{toast.message}</p>
            <button
              type="button"
              onClick={() => setToast(null)}
              className="ml-2 text-slate-400 hover:text-slate-600"
            >
              &times;
            </button>
          </div>
        </div>
      )}

      {/* Page Header */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="h-2 w-2 rounded-full bg-blue-600" />
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Medical Staff Management
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              Doctors Directory
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Manage hospital physicians, clinical specialties, departmental assignments, and medical qualifications.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => loadData(true)}
              disabled={isRefreshing || isLoading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs sm:text-sm font-medium text-slate-700 hover:bg-slate-50 active:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50"
              title="Force reload doctors from API"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className={`h-4 w-4 text-slate-500 ${isRefreshing ? "animate-spin text-blue-600" : ""}`}
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
              <span>Refresh</span>
            </button>

            <button
              type="button"
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs sm:text-sm font-semibold text-white shadow-xs hover:bg-blue-700 active:bg-blue-800 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
              title="Register new doctor"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              <span>Add Doctor</span>
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Total Doctors
          </p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-slate-900">
              {doctors.length}
            </span>
            <span className="text-xs text-slate-500 font-medium">Physicians on staff</span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Clinical Specialties
          </p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-slate-900">
              {uniqueSpecialties.length}
            </span>
            <span className="text-xs text-slate-500 font-medium">Distinct fields</span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Average Experience
          </p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-slate-900">
              {avgExperience}
            </span>
            <span className="text-xs text-slate-500 font-medium">Years in practice</span>
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        {/* Search & Filter Bar */}
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center flex-1 max-w-2xl">
            {/* Search query */}
            <div className="relative flex-1">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 text-slate-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search by doctor name, specialty, contact..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-4 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 transition-colors"
              />
            </div>

            {/* Filter by Specialty */}
            {uniqueSpecialties.length > 0 && (
              <select
                value={specialtyFilter}
                onChange={(e) => setSpecialtyFilter(e.target.value)}
                className="rounded-lg border border-slate-200 bg-slate-50 py-2 px-3 text-xs sm:text-sm text-slate-700 focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
              >
                <option value="all">All Specialties</option>
                {uniqueSpecialties.map((spec) => (
                  <option key={spec} value={spec}>
                    {spec}
                  </option>
                ))}
              </select>
            )}

            {/* Filter by Department */}
            {departments.length > 0 && (
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="rounded-lg border border-slate-200 bg-slate-50 py-2 px-3 text-xs sm:text-sm text-slate-700 focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
              >
                <option value="all">All Departments</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>
              Showing <strong className="text-slate-800">{filteredDoctors.length}</strong> of{" "}
              <strong className="text-slate-800">{doctors.length}</strong> doctors
            </span>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-6">
            <div role="alert" className="flex items-start justify-between rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <div className="flex items-start gap-3">
                <svg className="h-5 w-5 shrink-0 text-red-500 mt-0.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
                </svg>
                <div>
                  <p className="font-semibold">Unable to load doctors</p>
                  <p className="mt-0.5 text-xs text-red-600">{error}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => loadData(true)}
                className="rounded-md border border-red-300 bg-white px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-50 cursor-pointer"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Loading Spinner */}
        {isLoading && (
          <div className="p-8 text-center">
            <div className="inline-flex items-center gap-3 text-sm font-medium text-slate-500">
              <svg className="h-5 w-5 animate-spin text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Loading medical personnel...
            </div>
          </div>
        )}

        {/* Doctors Table */}
        {!isLoading && !error && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4 sm:px-6">Doctor Name</th>
                  <th className="py-3 px-4">Specialization</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Experience</th>
                  <th className="py-3 px-4">Contact Phone</th>
                  <th className="py-3 px-4">Date Joined</th>
                  <th className="py-3 px-4 sm:px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredDoctors.map((doc) => {
                  const dept = departmentMap.get(doc.department_id);
                  const initial = (doc.full_name || "D").replace(/^Dr\.?\s*/i, "").charAt(0).toUpperCase();

                  return (
                    <tr key={doc.id} className="hover:bg-slate-50/80 transition-colors group">
                      {/* Name & Avatar */}
                      <td className="py-3.5 px-4 sm:px-6">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700 font-bold text-xs ring-2 ring-blue-50">
                            {initial}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900 leading-tight">
                              {doc.full_name}
                            </p>
                            <p className="text-[11px] font-mono text-slate-400 leading-tight mt-0.5">
                              ID: {doc.id.slice(0, 8)}...
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Specialization Badge */}
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 border border-blue-200">
                          {doc.specialization}
                        </span>
                      </td>

                      {/* Department */}
                      <td className="py-3.5 px-4">
                        {dept ? (
                          <div>
                            <p className="font-medium text-xs sm:text-sm text-slate-800 leading-tight">
                              {dept.name}
                            </p>
                            <p className="text-[11px] text-slate-400 leading-tight">
                              {dept.location}
                            </p>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 font-mono">
                            {doc.department_id ? `Dept: ${doc.department_id.slice(0, 8)}...` : "Unassigned"}
                          </span>
                        )}
                      </td>

                      {/* Years of Experience */}
                      <td className="py-3.5 px-4 text-xs font-medium text-slate-700">
                        <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-slate-800">
                          {doc.years_of_experience} {Number(doc.years_of_experience) === 1 ? "yr" : "yrs"} exp
                        </span>
                      </td>

                      {/* Contact Number */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 text-slate-600 font-mono text-xs sm:text-sm">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                          <span>{doc.contact_number}</span>
                        </div>
                      </td>

                      {/* Date Registered */}
                      <td className="py-3.5 px-4 text-xs text-slate-500">
                        {formatDate(doc.created_at)}
                      </td>

                      {/* Action Buttons */}
                      <td className="py-3.5 px-4 sm:px-6 text-right">
                        <div className="inline-flex items-center gap-1">
                          {/* View Details */}
                          <button
                            type="button"
                            onClick={() => handleOpenView(doc)}
                            className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
                            title="View Doctor Profile & Treatments"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>

                          {/* Edit Doctor */}
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(doc)}
                            className="rounded-md p-1.5 text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition-colors cursor-pointer"
                            title="Edit Doctor Details"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>

                          {/* Delete Doctor */}
                          <button
                            type="button"
                            onClick={() => handleOpenDelete(doc)}
                            className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors cursor-pointer"
                            title="Delete Doctor"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filteredDoctors.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-500">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                        <p className="text-sm font-semibold text-slate-700">
                          No doctors found
                        </p>
                        <p className="text-xs text-slate-400">
                          {searchQuery || specialtyFilter !== "all" || departmentFilter !== "all"
                            ? "Try adjusting your filters or search keywords."
                            : "Click 'Add Doctor' to register your first physician."}
                        </p>
                        {!searchQuery && specialtyFilter === "all" && departmentFilter === "all" && (
                          <button
                            type="button"
                            onClick={handleOpenCreate}
                            className="mt-2 text-xs font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
                          >
                            + Add Doctor
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* 1. CREATE DOCTOR MODAL (POST /api/doctors)                */}
      {/* ========================================================= */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200" role="dialog" aria-modal="true">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Add New Doctor</h2>
                  <p className="text-xs text-slate-500">Register a physician and assign to a department</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {createError && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Ahmed Khan"
                  value={createForm.full_name}
                  onChange={(e) => setCreateForm({ ...createForm, full_name: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                    Specialization <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Cardiologist"
                    value={createForm.specialization}
                    onChange={(e) => setCreateForm({ ...createForm, specialization: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                    Years of Experience <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    max={60}
                    value={createForm.years_of_experience}
                    onChange={(e) => setCreateForm({ ...createForm, years_of_experience: Number(e.target.value) })}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                  Department Assignment <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={createForm.department_id}
                  onChange={(e) => setCreateForm({ ...createForm, department_id: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
                >
                  <option value="" disabled>Select Department</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name} ({dept.location})
                    </option>
                  ))}
                </select>
                {departments.length === 0 && (
                  <p className="mt-1 text-xs text-amber-600">
                    No departments available. Please create a department first.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                  Contact Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 03001234567"
                  value={createForm.contact_number}
                  onChange={(e) => setCreateForm({ ...createForm, contact_number: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100 font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 mt-6">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {isCreating ? (
                    <>
                      <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Registering...
                    </>
                  ) : (
                    "Register Doctor"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. VIEW DOCTOR MODAL (GET /api/doctors/{id})              */}
      {/* ========================================================= */}
      {viewDoctor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200" role="dialog" aria-modal="true">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-700 font-bold text-sm">
                  {(viewDoctor.full_name || "D").charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">{viewDoctor.full_name}</h2>
                  <p className="text-xs text-slate-500">{viewDoctor.specialization}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewDoctor(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {isLoadingView ? (
              <div className="py-8 text-center text-sm text-slate-500">
                <svg className="h-5 w-5 animate-spin text-blue-600 mx-auto mb-2" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Fetching latest profile...
              </div>
            ) : (
              <div className="space-y-4 text-sm">
                <div className="rounded-lg bg-slate-50 p-3.5 border border-slate-100 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500 uppercase">Doctor ID</span>
                    <span className="font-mono text-xs text-slate-800 select-all font-medium bg-white px-2 py-0.5 rounded border border-slate-200">
                      {viewDoctor.id}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500 uppercase">Specialty</span>
                    <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 border border-blue-200">
                      {viewDoctor.specialization}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500 uppercase">Department</span>
                    <span className="font-medium text-slate-900">
                      {departmentMap.get(viewDoctor.department_id)?.name || "Unassigned"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500 uppercase">Experience</span>
                    <span className="font-medium text-slate-900">{viewDoctor.years_of_experience} Years</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500 uppercase">Phone</span>
                    <span className="font-mono font-medium text-slate-900">{viewDoctor.contact_number}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500 uppercase">Date Registered</span>
                    <span className="text-xs text-slate-700">{formatDate(viewDoctor.created_at)}</span>
                  </div>
                </div>

                {/* Treatments Performed Preview */}
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2">
                    Performed Treatments ({viewTreatments.length})
                  </h3>
                  {viewTreatments.length > 0 ? (
                    <div className="max-h-32 overflow-y-auto space-y-1 text-xs">
                      {viewTreatments.map((t: any, idx) => (
                        <div key={idx} className="rounded bg-slate-50 p-2 border border-slate-100 flex items-center justify-between">
                          <span>{t.treatment_name || t.diagnosis || `Treatment #${idx + 1}`}</span>
                          <span className="text-slate-400 font-mono">{t.created_at ? formatDate(t.created_at) : ""}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">No treatments recorded yet.</p>
                  )}
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(viewDoctor)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3.5 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition-colors cursor-pointer"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit Doctor
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewDoctor(null)}
                    className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 3. EDIT DOCTOR MODAL (PUT /api/doctors/{id})              */}
      {/* ========================================================= */}
      {editDoctor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200" role="dialog" aria-modal="true">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Edit Doctor Profile</h2>
                  <p className="text-xs text-slate-500">Update medical qualifications and clinical assignments</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditDoctor(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {editError && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                {editError}
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editForm.full_name}
                  onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                    Specialization <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.specialization}
                    onChange={(e) => setEditForm({ ...editForm, specialization: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                    Years of Experience <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    max={60}
                    value={editForm.years_of_experience}
                    onChange={(e) => setEditForm({ ...editForm, years_of_experience: Number(e.target.value) })}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                  Department Assignment <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={editForm.department_id}
                  onChange={(e) => setEditForm({ ...editForm, department_id: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
                >
                  <option value="" disabled>Select Department</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name} ({dept.location})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                  Contact Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editForm.contact_number}
                  onChange={(e) => setEditForm({ ...editForm, contact_number: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100 font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 mt-6">
                <button
                  type="button"
                  onClick={() => setEditDoctor(null)}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {isUpdating ? (
                    <>
                      <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Saving Changes...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 4. DELETE CONFIRMATION MODAL (DELETE /api/doctors/{id})   */}
      {/* ========================================================= */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200" role="dialog" aria-modal="true">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 text-red-600 shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Delete Doctor</h2>
                <p className="text-xs text-slate-500">This action cannot be undone</p>
              </div>
            </div>

            {deleteError && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                {deleteError}
              </div>
            )}

            <div className="rounded-lg bg-slate-50 p-3.5 border border-slate-100 mb-6 text-sm text-slate-700">
              <p>
                Are you sure you want to remove <strong className="text-slate-900 font-semibold">{deleteTarget.full_name}</strong> ({deleteTarget.specialization}) from the hospital medical staff registry?
              </p>
              <p className="mt-2 text-xs text-slate-500 font-mono">
                Doctor ID: {deleteTarget.id}
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-5 py-2 text-sm font-semibold text-white shadow-xs hover:bg-red-700 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isDeleting ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Deleting...
                  </>
                ) : (
                  "Delete Doctor"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
