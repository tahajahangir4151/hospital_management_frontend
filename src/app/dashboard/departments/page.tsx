"use client";

import React, { useEffect, useState, useMemo } from "react";
import { departmentService } from "@/services/department.service";
import { dashboardService } from "@/services/dashboard.service";
import { Department, CreateDepartmentDTO, UpdateDepartmentDTO } from "@/types/department";
import { Sparkline } from "@/components/dashboard/sparkline";

interface ToastNotification {
  id: number;
  type: "success" | "error";
  message: string;
}

export default function DepartmentsPage() {
  const cached = departmentService.getCachedDepartments();
  const [departments, setDepartments] = useState<Department[]>(() => cached || []);
  const [isLoading, setIsLoading] = useState(() => cached === null);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [floorFilter, setFloorFilter] = useState<string>("all");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Toast notifications state
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
  const [createForm, setCreateForm] = useState<CreateDepartmentDTO>({
    name: "",
    location: "",
    contact_number: "",
  });
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // View Details Modal
  const [viewDepartment, setViewDepartment] = useState<Department | null>(null);
  const [isLoadingView, setIsLoadingView] = useState(false);

  // Edit Modal
  const [editDepartment, setEditDepartment] = useState<Department | null>(null);
  const [editForm, setEditForm] = useState<UpdateDepartmentDTO>({
    name: "",
    location: "",
    contact_number: "",
  });
  const [isUpdating, setIsUpdating] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Delete Modal
  const [deleteTarget, setDeleteTarget] = useState<Department | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // -------------------------------------------------------------
  // Fetch Departments (GET /api/departments)
  // -------------------------------------------------------------
  const fetchDepartments = async (forceRefresh = false) => {
    if (forceRefresh) {
      setIsRefreshing(true);
    } else if (departments.length === 0) {
      setIsLoading(true);
    }
    setError(null);

    try {
      const data = await departmentService.getDepartments(forceRefresh);
      setDepartments(data);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Failed to fetch departments from the server.";
      setError(message);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    // Only perform network fetch if not already in cache
    if (!departmentService.getCachedDepartments()) {
      fetchDepartments(false);
    }
  }, []);

  // -------------------------------------------------------------
  // Create Department (POST /api/departments)
  // -------------------------------------------------------------
  const handleOpenCreate = () => {
    setCreateForm({ name: "", location: "", contact_number: "" });
    setCreateError(null);
    setIsCreateOpen(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.name.trim() || !createForm.location.trim() || !createForm.contact_number.trim()) {
      setCreateError("All fields are required.");
      return;
    }

    setIsCreating(true);
    setCreateError(null);

    try {
      const created = await departmentService.createDepartment(createForm);
      setDepartments((prev) => [created, ...prev]);
      dashboardService.clearCache(); // Sync dashboard metric count
      setIsCreateOpen(false);
      showToast(`Department "${created.name}" created successfully!`, "success");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create department.";
      setCreateError(msg);
    } finally {
      setIsCreating(false);
    }
  };

  // -------------------------------------------------------------
  // View Department Details (GET /api/departments/{id})
  // -------------------------------------------------------------
  const handleOpenView = async (dept: Department) => {
    setViewDepartment(dept);
    setIsLoadingView(true);

    try {
      // Fetch latest single department record from backend
      const freshData = await departmentService.getDepartmentById(dept.id);
      setViewDepartment(freshData);
    } catch {
      // Fall back to current row data if individual fetch fails
    } finally {
      setIsLoadingView(false);
    }
  };

  // -------------------------------------------------------------
  // Edit Department (PUT /api/departments/{id})
  // -------------------------------------------------------------
  const handleOpenEdit = (dept: Department) => {
    setEditDepartment(dept);
    setEditForm({
      name: dept.name,
      location: dept.location,
      contact_number: dept.contact_number,
    });
    setEditError(null);
    setViewDepartment(null); // Close view modal if opened from it
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editDepartment) return;
    if (!editForm.name?.trim() || !editForm.location?.trim() || !editForm.contact_number?.trim()) {
      setEditError("All fields are required.");
      return;
    }

    setIsUpdating(true);
    setEditError(null);

    try {
      await departmentService.updateDepartment(editDepartment.id, editForm);
      const updatedDept: Department = {
        ...editDepartment,
        name: editForm.name.trim(),
        location: editForm.location.trim(),
        contact_number: editForm.contact_number.trim(),
      };
      setDepartments((prev) => prev.map((d) => (d.id === editDepartment.id ? updatedDept : d)));
      dashboardService.clearCache();
      setEditDepartment(null);
      showToast(`Department "${updatedDept.name}" updated successfully!`, "success");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update department.";
      setEditError(msg);
    } finally {
      setIsUpdating(false);
    }
  };

  // -------------------------------------------------------------
  // Delete Department (DELETE /api/departments/{id})
  // -------------------------------------------------------------
  const handleOpenDelete = (dept: Department) => {
    setDeleteTarget(dept);
    setDeleteError(null);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;

    setIsDeleting(true);
    setDeleteError(null);

    try {
      await departmentService.deleteDepartment(deleteTarget.id);
      setDepartments((prev) => prev.filter((d) => d.id !== deleteTarget.id));
      dashboardService.clearCache(); // Sync dashboard metric count
      showToast(`Department "${deleteTarget.name}" deleted successfully!`, "success");
      setDeleteTarget(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete department.";
      setDeleteError(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  // -------------------------------------------------------------
  // Computed stats & filtering
  // -------------------------------------------------------------
  const allLocations = useMemo(() => {
    const locs = Array.from(new Set(departments.map((d) => d.location.trim()))).filter(Boolean);
    return locs;
  }, [departments]);

  const filteredDepartments = useMemo(() => {
    return departments.filter((dept) => {
      const matchesSearch =
        !searchQuery.trim() ||
        dept.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        dept.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
        dept.contact_number.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesFloor = floorFilter === "all" || dept.location.toLowerCase() === floorFilter.toLowerCase();

      return matchesSearch && matchesFloor;
    });
  }, [departments, searchQuery, floorFilter]);

  const uniqueFloors = useMemo(() => {
    const floors = new Set(departments.map((d) => d.location));
    return floors.size;
  }, [departments]);

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
      {/* Floating Toast Notification */}
      {toast && (
        <div className="fixed top-20 right-6 z-50 animate-in fade-in slide-in-from-top-4 duration-300">
          <div
            className={`flex items-center gap-3 rounded-xl border px-4 py-3 shadow-lg ${
              toast.type === "success"
                ? "border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/90 text-emerald-900 dark:text-emerald-100"
                : "border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/90 text-red-900 dark:text-red-100"
            }`}
          >
            {toast.type === "success" ? (
              <svg className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            <p className="text-sm font-medium">{toast.message}</p>
            <button
              type="button"
              onClick={() => setToast(null)}
              className="ml-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              &times;
            </button>
          </div>
        </div>
      )}

      {/* Page Header */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-600 dark:bg-blue-400"></span>
              </span>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Hospital Administration
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Departments & Clinical Units
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 max-w-2xl">
              Directory of hospital wings, clinical services, floor allocations, and rapid-response emergency extensions.
            </p>
          </div>

          {/* Actions: Refresh & Add Department */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => fetchDepartments(true)}
              disabled={isRefreshing || isLoading}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 px-3.5 py-2 text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 active:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50 shadow-xs"
              title="Force reload departments from API"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className={`h-4 w-4 text-slate-500 dark:text-slate-400 ${isRefreshing ? "animate-spin text-blue-600" : ""}`}
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
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-md shadow-blue-500/20 hover:from-blue-700 hover:to-indigo-700 active:scale-[0.98] transition-all focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
              title="Add new department"
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
              <span>Add Department</span>
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Row with Sparklines */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total Departments
            </p>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
                {departments.length}
              </span>
              <span className="text-xs text-blue-600 dark:text-blue-400 font-semibold bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-md border border-blue-200 dark:border-blue-900/50">
                Active units
              </span>
            </div>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">Hospital medical divisions</p>
          </div>
          <Sparkline data={[6, 7, 8, 8, 9, 10, departments.length || 10]} color="blue" width={90} height={36} />
        </div>

        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Active Hospital Floors
            </p>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
                {uniqueFloors}
              </span>
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-900/50">
                Distinct zones
              </span>
            </div>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">Multi-level campus coverage</p>
          </div>
          <Sparkline data={[2, 3, 3, 4, 4, 4, uniqueFloors || 4]} color="emerald" width={90} height={36} />
        </div>

        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Operational Status
            </p>
            <div className="mt-2 flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-md bg-teal-50 dark:bg-teal-950/60 px-2.5 py-1 text-xs font-bold text-teal-700 dark:text-teal-400 border border-teal-200 dark:border-teal-900/50">
                <span className="h-2 w-2 rounded-full bg-teal-500 animate-pulse" />
                100% Operational
              </span>
            </div>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">All clinical facilities connected</p>
          </div>
          <Sparkline data={[100, 100, 99, 100, 100, 100, 100]} color="teal" width={90} height={36} />
        </div>
      </div>

      {/* Main Table Card */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md shadow-xs overflow-hidden">
        {/* Search & Filter Bar */}
        <div className="flex flex-col gap-3 border-b border-slate-200/80 dark:border-slate-800 p-4 sm:flex-row sm:items-center sm:justify-between bg-slate-50/50 dark:bg-slate-850/50">
          <div className="relative flex-1 max-w-md">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 text-slate-400 dark:text-slate-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search by department name, floor location, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 py-2 pl-9 pr-4 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/40 transition-colors"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-500 dark:text-slate-400 mr-1">Floor:</span>
            <button
              type="button"
              onClick={() => setFloorFilter("all")}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer ${
                floorFilter === "all"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              All
            </button>
            {allLocations.slice(0, 4).map((loc) => (
              <button
                key={loc}
                type="button"
                onClick={() => setFloorFilter(loc)}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer ${
                  floorFilter.toLowerCase() === loc.toLowerCase()
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                {loc}
              </button>
            ))}
            <span className="text-xs text-slate-500 dark:text-slate-400 ml-2">
              Showing <strong className="text-slate-800 dark:text-slate-200">{filteredDepartments.length}</strong> of{" "}
              <strong className="text-slate-800 dark:text-slate-200">{departments.length}</strong>
            </span>
          </div>
        </div>
        {/* Error State */}
        {error && (
          <div className="p-6">
            <div
              role="alert"
              className="flex items-start justify-between rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/40 p-4 text-sm text-red-700 dark:text-red-300"
            >
              <div className="flex items-start gap-3">
                <svg
                  className="h-5 w-5 shrink-0 text-red-500 mt-0.5"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
                    clipRule="evenodd"
                  />
                </svg>
                <div>
                  <p className="font-semibold">Unable to load departments</p>
                  <p className="mt-0.5 text-xs text-red-600 dark:text-red-400">{error}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => fetchDepartments(true)}
                className="rounded-lg border border-red-300 dark:border-red-800 bg-white dark:bg-slate-800 px-3 py-1 text-xs font-semibold text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-slate-700 cursor-pointer"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="p-8 text-center">
            <div className="inline-flex items-center gap-3 text-sm font-medium text-slate-500 dark:text-slate-400">
              <svg
                className="h-5 w-5 animate-spin text-blue-600"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Loading hospital departments...
            </div>
          </div>
        )}

        {/* Data Table */}
        {!isLoading && !error && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-850/80 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <th className="py-3.5 px-4 sm:px-6">Department Name</th>
                  <th className="py-3.5 px-4">Location / Floor</th>
                  <th className="py-3.5 px-4">Contact Extension</th>
                  <th className="py-3.5 px-4">Date Registered</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 sm:px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-slate-700 dark:text-slate-300">
                {filteredDepartments.map((dept) => (
                  <tr
                    key={dept.id}
                    className="hover:bg-blue-50/30 dark:hover:bg-slate-800/50 transition-colors group"
                  >
                    {/* Department Name & Icon */}
                    <td className="py-3.5 px-4 sm:px-6">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/50 group-hover:bg-blue-600 group-hover:text-white dark:group-hover:bg-blue-600 dark:group-hover:text-white transition-all shadow-xs">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4.5 w-4.5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                            />
                          </svg>
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-white leading-tight">
                            {dept.name}
                          </p>
                          <p className="text-[11px] font-mono text-slate-400 dark:text-slate-500 leading-tight mt-0.5">
                            ID: {dept.id.slice(0, 8)}...
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Location */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                        </svg>
                        <span className="font-medium text-xs sm:text-sm">
                          {dept.location}
                        </span>
                      </div>
                    </td>

                    {/* Contact Number */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 font-mono text-xs sm:text-sm">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                          />
                        </svg>
                        <span>{dept.contact_number || "N/A"}</span>
                      </div>
                    </td>

                    {/* Created At */}
                    <td className="py-3.5 px-4 text-xs text-slate-500 dark:text-slate-400">
                      {formatDate(dept.created_at)}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400 animate-pulse" />
                        Active
                      </span>
                    </td>

                    {/* Action buttons */}
                    <td className="py-3.5 px-4 sm:px-6 text-right">
                      <div className="inline-flex items-center gap-1">
                        {/* View Details */}
                        <button
                          type="button"
                          onClick={() => handleOpenView(dept)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
                          title="View Details"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                            />
                          </svg>
                        </button>

                        {/* Edit Department */}
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(dept)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-blue-50 dark:hover:bg-blue-950/60 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
                          title="Edit Department"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                            />
                          </svg>
                        </button>

                        {/* Delete Department */}
                        <button
                          type="button"
                          onClick={() => handleOpenDelete(dept)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 dark:hover:bg-red-950/60 hover:text-red-600 dark:hover:text-red-400 transition-colors cursor-pointer"
                          title="Delete Department"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {filteredDepartments.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500 dark:text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400">
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
                              strokeWidth={1.5}
                              d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                            />
                          </svg>
                        </div>
                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                          No departments found
                        </p>
                        <p className="text-xs text-slate-400 dark:text-slate-500">
                          {searchQuery || floorFilter !== "all"
                            ? "Try adjusting your search criteria or floor filter."
                            : "Click 'Add Department' to create your first hospital department."}
                        </p>
                        {!searchQuery && floorFilter === "all" && (
                          <button
                            type="button"
                            onClick={handleOpenCreate}
                            className="mt-2 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 cursor-pointer"
                          >
                            + Add Department
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
      {/* 1. CREATE DEPARTMENT MODAL (POST /api/departments)        */}
      {/* ========================================================= */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div
            className="w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200 text-slate-900 dark:text-white"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/50">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">Add New Department</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Register a new medical unit or ward in the system</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                aria-label="Close"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {createError && (
              <div className="mb-4 rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/40 p-3 text-xs text-red-700 dark:text-red-400">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Department Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Cardiology, Neurology, Orthopedics"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/40"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Floor / Location <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. First Floor, Ground Floor, Wing B"
                  value={createForm.location}
                  onChange={(e) => setCreateForm({ ...createForm, location: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/40"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Contact Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 0421234567, +92 300 1234567"
                  value={createForm.contact_number}
                  onChange={(e) => setCreateForm({ ...createForm, contact_number: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/40 font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800 mt-6">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors cursor-pointer"
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
                      Creating...
                    </>
                  ) : (
                    "Create Department"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. VIEW DETAILS MODAL (GET /api/departments/{id})         */}
      {/* ========================================================= */}
      {viewDepartment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div
            className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200 text-slate-900 dark:text-white"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/50">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">{viewDepartment.name}</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Department Details</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewDepartment(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                aria-label="Close"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {isLoadingView ? (
              <div className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                <svg className="h-5 w-5 animate-spin text-blue-600 mx-auto mb-2" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Fetching latest details...
              </div>
            ) : (
              <div className="space-y-4 text-sm">
                <div className="rounded-lg bg-slate-50 dark:bg-slate-800/60 p-3.5 border border-slate-100 dark:border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Department ID</span>
                    <span className="font-mono text-xs text-slate-800 dark:text-slate-200 select-all font-medium bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                      {viewDepartment.id}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Location / Floor</span>
                    <span className="font-medium text-slate-900 dark:text-white">{viewDepartment.location}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Contact Number</span>
                    <span className="font-mono font-medium text-slate-900 dark:text-white">{viewDepartment.contact_number}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Date Registered</span>
                    <span className="text-xs text-slate-700 dark:text-slate-300">{formatDate(viewDepartment.created_at)}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Status</span>
                    <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400 animate-pulse" />
                      Active
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(viewDepartment)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 dark:border-blue-900/60 bg-blue-50 dark:bg-blue-950/50 px-3.5 py-2 text-xs font-semibold text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-colors cursor-pointer"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit Department
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewDepartment(null)}
                    className="rounded-lg bg-slate-900 dark:bg-slate-700 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 dark:hover:bg-slate-600 transition-colors cursor-pointer"
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
      {/* 3. EDIT DEPARTMENT MODAL (PUT /api/departments/{id})      */}
      {/* ========================================================= */}
      {editDepartment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div
            className="w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200 text-slate-900 dark:text-white"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/50">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">Edit Department</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Update medical unit details and contact information</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditDepartment(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                aria-label="Close"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {editError && (
              <div className="mb-4 rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/40 p-3 text-xs text-red-700 dark:text-red-400">
                {editError}
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Department Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-sm text-slate-900 dark:text-white focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/40"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Floor / Location <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editForm.location}
                  onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-sm text-slate-900 dark:text-white focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/40"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Contact Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editForm.contact_number}
                  onChange={(e) => setEditForm({ ...editForm, contact_number: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-sm text-slate-900 dark:text-white focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/40 font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800 mt-6">
                <button
                  type="button"
                  onClick={() => setEditDepartment(null)}
                  className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors cursor-pointer"
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
      {/* 4. DELETE CONFIRMATION MODAL (DELETE /api/departments/{id}) */}
      {/* ========================================================= */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div
            className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200 text-slate-900 dark:text-white"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Delete Department</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">This action cannot be undone</p>
              </div>
            </div>

            {deleteError && (
              <div className="mb-4 rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/40 p-3 text-xs text-red-700 dark:text-red-400">
                {deleteError}
              </div>
            )}

            <div className="rounded-lg bg-slate-50 dark:bg-slate-800/60 p-3.5 border border-slate-100 dark:border-slate-800 mb-6 text-sm text-slate-700 dark:text-slate-300">
              <p>
                Are you sure you want to delete <strong className="text-slate-900 dark:text-white font-semibold">{deleteTarget.name}</strong> located at <strong className="text-slate-900 dark:text-white">{deleteTarget.location}</strong>?
              </p>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 font-mono">
                Department ID: {deleteTarget.id}
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors cursor-pointer"
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
                  "Delete Department"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
