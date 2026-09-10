"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { nurseService } from "@/services/nurse.service";
import { departmentService } from "@/services/department.service";
import { dashboardService } from "@/services/dashboard.service";
import { Nurse, CreateNurseDTO, UpdateNurseDTO } from "@/types/nurse";
import { Room } from "@/types/room";
import { Department } from "@/types/department";

interface ToastNotification {
  id: number;
  type: "success" | "error";
  message: string;
}

const SHIFT_OPTIONS = ["Morning", "Evening", "Night"];

export default function NursesPage() {
  const cachedNurses = nurseService.getCachedNurses();
  const cachedDepartments = departmentService.getCachedDepartments();

  const [nurses, setNurses] = useState<Nurse[]>(() => cachedNurses || []);
  const [departments, setDepartments] = useState<Department[]>(() => cachedDepartments || []);
  const [isLoading, setIsLoading] = useState(() => cachedNurses === null);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [shiftFilter, setShiftFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Toast notifications
  const [toast, setToast] = useState<ToastNotification | null>(null);
  const toastSeq = React.useRef(0);
  const showToast = React.useCallback((message: string, type: "success" | "error" = "success") => {
    toastSeq.current += 1;
    const id = toastSeq.current;
    setToast({ id, type, message });
    setTimeout(() => {
      setToast((current) => (current?.id === id ? null : current));
    }, 4000);
  }, []);

  // -------------------------------------------------------------
  // Modals state
  // -------------------------------------------------------------
  // Create Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateNurseDTO>({
    name: "",
    shift_timing: "Morning",
    contact_number: "",
    department_id: "",
  });
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // View Details Modal
  const [viewNurse, setViewNurse] = useState<Nurse | null>(null);
  const [viewAssignedRooms, setViewAssignedRooms] = useState<Room[]>([]);
  const [isLoadingView, setIsLoadingView] = useState(false);

  // Edit Modal
  const [editNurse, setEditNurse] = useState<Nurse | null>(null);
  const [editForm, setEditForm] = useState<UpdateNurseDTO>({
    name: "",
    shift_timing: "Morning",
    contact_number: "",
    department_id: "",
  });
  const [isUpdating, setIsUpdating] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Delete Modal
  const [deleteTarget, setDeleteTarget] = useState<Nurse | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // -------------------------------------------------------------
  // Data Fetching
  // -------------------------------------------------------------
  const loadData = async (forceRefresh = false) => {
    if (forceRefresh) {
      setIsRefreshing(true);
    } else if (nurses.length === 0) {
      setIsLoading(true);
    }
    setError(null);

    try {
      const [nursesData, departmentsData] = await Promise.all([
        nurseService.getNurses(forceRefresh),
        departmentService.getDepartments(forceRefresh),
      ]);
      setNurses(nursesData);
      setDepartments(departmentsData);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load nurses data.";
      setError(msg);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    let active = true;
    if (!nurseService.getCachedNurses() || !departmentService.getCachedDepartments()) {
      Promise.all([
        nurseService.getNurses(false),
        departmentService.getDepartments(false),
      ])
        .then(([nursesData, departmentsData]) => {
          if (active) {
            setNurses(nursesData);
            setDepartments(departmentsData);
            setIsLoading(false);
          }
        })
        .catch((err: unknown) => {
          if (active) {
            const msg = err instanceof Error ? err.message : "Failed to load nurses data.";
            setError(msg);
            setIsLoading(false);
          }
        });
    }
    return () => {
      active = false;
    };
  }, []);

  // Department ID to Name lookup map
  const departmentMap = useMemo(() => {
    const map = new Map<string, Department>();
    departments.forEach((dept) => map.set(dept.id, dept));
    return map;
  }, [departments]);

  // Filtered nurses list
  const filteredNurses = useMemo(() => {
    return nurses.filter((nurse) => {
      const query = searchQuery.toLowerCase().trim();
      const dept = departmentMap.get(nurse.department_id);
      const deptName = dept ? dept.name.toLowerCase() : "";

      const matchesSearch =
        !query ||
        nurse.name.toLowerCase().includes(query) ||
        nurse.shift_timing.toLowerCase().includes(query) ||
        nurse.contact_number.toLowerCase().includes(query) ||
        deptName.includes(query);

      const matchesShift =
        shiftFilter === "all" || nurse.shift_timing.toLowerCase() === shiftFilter.toLowerCase();

      const matchesDepartment =
        departmentFilter === "all" || nurse.department_id === departmentFilter;

      return matchesSearch && matchesShift && matchesDepartment;
    });
  }, [nurses, searchQuery, shiftFilter, departmentFilter, departmentMap]);

  // Metrics
  const morningCount = useMemo(() => {
    return nurses.filter((n) => n.shift_timing?.toLowerCase() === "morning").length;
  }, [nurses]);

  const otherShiftsCount = useMemo(() => {
    return nurses.filter((n) => n.shift_timing?.toLowerCase() !== "morning").length;
  }, [nurses]);

  // -------------------------------------------------------------
  // Create Nurse (POST /api/nurses)
  // -------------------------------------------------------------
  const handleOpenCreate = () => {
    setCreateForm({
      name: "",
      shift_timing: "Morning",
      contact_number: "",
      department_id: departments[0]?.id || "",
    });
    setCreateError(null);
    setIsCreateOpen(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.name.trim() || !createForm.contact_number.trim() || !createForm.department_id) {
      setCreateError("Name, contact number, and department assignment are required.");
      return;
    }

    setIsCreating(true);
    setCreateError(null);

    try {
      const created = await nurseService.createNurse(createForm);
      setNurses((prev) => [created, ...prev]);
      dashboardService.clearCache(); // Sync dashboard metric count
      setIsCreateOpen(false);
      showToast(`Nurse "${created.name}" registered successfully!`, "success");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to register nurse.";
      setCreateError(msg);
    } finally {
      setIsCreating(false);
    }
  };

  // -------------------------------------------------------------
  // View Nurse (GET /api/nurses/{id} & GET /api/nurses/{id}/rooms)
  // -------------------------------------------------------------
  const handleOpenView = async (nurse: Nurse) => {
    setViewNurse(nurse);
    setViewAssignedRooms([]);
    setIsLoadingView(true);

    try {
      const [freshData, roomsData] = await Promise.all([
        nurseService.getNurseById(nurse.id),
        nurseService.getNurseRooms(nurse.id),
      ]);
      setViewNurse(freshData);
      setViewAssignedRooms(roomsData);
    } catch {
      // Fallback to local row data
    } finally {
      setIsLoadingView(false);
    }
  };

  const handleUnassignRoomFromNurse = async (nurseId: string, room: Room) => {
    try {
      await nurseService.removeNurseFromRoom(nurseId, room.id);
      setViewAssignedRooms((prev) => prev.filter((r) => r.id !== room.id));
      showToast(`Nurse removed from Room ${room.room_number}.`, "success");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to unassign room.";
      showToast(msg, "error");
    }
  };

  // -------------------------------------------------------------
  // Edit Nurse (PUT /api/nurses/{id})
  // -------------------------------------------------------------
  const handleOpenEdit = (nurse: Nurse) => {
    setEditNurse(nurse);
    setEditForm({
      name: nurse.name,
      shift_timing: nurse.shift_timing,
      contact_number: nurse.contact_number,
      department_id: nurse.department_id,
    });
    setEditError(null);
    setViewNurse(null);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editNurse) return;

    if (!editForm.name.trim() || !editForm.contact_number.trim() || !editForm.department_id) {
      setEditError("All fields are required.");
      return;
    }

    setIsUpdating(true);
    setEditError(null);

    try {
      await nurseService.updateNurse(editNurse.id, editForm);
      setNurses((prev) =>
        prev.map((n) =>
          n.id === editNurse.id
            ? {
                ...n,
                name: editForm.name.trim(),
                shift_timing: editForm.shift_timing.trim(),
                contact_number: editForm.contact_number.trim(),
                department_id: editForm.department_id,
              }
            : n
        )
      );
      dashboardService.clearCache();
      setEditNurse(null);
      showToast(`Nurse "${editForm.name}" updated successfully!`, "success");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update nurse.";
      setEditError(msg);
    } finally {
      setIsUpdating(false);
    }
  };

  // -------------------------------------------------------------
  // Delete Nurse (DELETE /api/nurses/{id})
  // -------------------------------------------------------------
  const handleOpenDelete = (nurse: Nurse) => {
    setDeleteTarget(nurse);
    setDeleteError(null);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;

    setIsDeleting(true);
    setDeleteError(null);

    try {
      await nurseService.deleteNurse(deleteTarget.id);
      setNurses((prev) => prev.filter((n) => n.id !== deleteTarget.id));
      dashboardService.clearCache();
      showToast(`Nurse "${deleteTarget.name}" removed from registry.`, "success");
      setDeleteTarget(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete nurse.";
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

  const renderShiftBadge = (shift: string) => {
    const s = shift?.toLowerCase() || "";
    if (s === "morning") {
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700 border border-amber-200">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
          Morning Shift
        </span>
      );
    }
    if (s === "evening") {
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700 border border-indigo-200">
          <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
          Evening Shift
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-purple-50 px-2 py-0.5 text-xs font-semibold text-purple-700 border border-purple-200">
        <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />
        {shift}
      </span>
    );
  };

  return (
    <div className="space-y-6 relative">
      {/* Floating Toast Notification */}
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
                Nursing Care Staff
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              Nurses Directory
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Manage hospital nursing personnel, ward duty shifts, contact directories, and departmental assignments.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => loadData(true)}
              disabled={isRefreshing || isLoading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs sm:text-sm font-medium text-slate-700 hover:bg-slate-50 active:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50"
              title="Force reload nurses from API"
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

            <Link
              href="/dashboard/nurse-assignments"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs sm:text-sm font-medium text-slate-700 hover:bg-slate-50 active:bg-slate-100 transition-colors cursor-pointer"
              title="Manage nurse room assignments"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 text-blue-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <span>Room Assignments</span>
            </Link>

            <button
              type="button"
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs sm:text-sm font-semibold text-white shadow-xs hover:bg-blue-700 active:bg-blue-800 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
              title="Register new nurse"
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
              <span>Add Nurse</span>
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Total Nurses
          </p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-slate-900">
              {nurses.length}
            </span>
            <span className="text-xs text-slate-500 font-medium">Active nursing staff</span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Morning Duty
          </p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-amber-600">
              {morningCount}
            </span>
            <span className="text-xs text-slate-500 font-medium">Day shift nurses</span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Evening & Night Shifts
          </p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-indigo-600">
              {otherShiftsCount}
            </span>
            <span className="text-xs text-slate-500 font-medium">Rotational staff</span>
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        {/* Search & Filter Bar */}
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center flex-1 max-w-2xl">
            {/* Search Input */}
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
                placeholder="Search by nurse name, shift, contact, or department..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-4 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 transition-colors"
              />
            </div>

            {/* Filter by Shift */}
            <select
              value={shiftFilter}
              onChange={(e) => setShiftFilter(e.target.value)}
              className="rounded-lg border border-slate-200 bg-slate-50 py-2 px-3 text-xs sm:text-sm text-slate-700 focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
            >
              <option value="all">All Shifts</option>
              {SHIFT_OPTIONS.map((shift) => (
                <option key={shift} value={shift}>
                  {shift} Shift
                </option>
              ))}
            </select>

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
              Showing <strong className="text-slate-800">{filteredNurses.length}</strong> of{" "}
              <strong className="text-slate-800">{nurses.length}</strong> nurses
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
                  <p className="font-semibold">Unable to load nurses</p>
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
              Loading nursing staff...
            </div>
          </div>
        )}

        {/* Nurses Table */}
        {!isLoading && !error && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4 sm:px-6">Nurse Name</th>
                  <th className="py-3 px-4">Shift Timing</th>
                  <th className="py-3 px-4">Department Assignment</th>
                  <th className="py-3 px-4">Contact Phone</th>
                  <th className="py-3 px-4">Date Registered</th>
                  <th className="py-3 px-4 sm:px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredNurses.map((nurse) => {
                  const dept = departmentMap.get(nurse.department_id);
                  const initial = (nurse.name || "N").charAt(0).toUpperCase();

                  return (
                    <tr key={nurse.id} className="hover:bg-slate-50/80 transition-colors group">
                      {/* Name & Avatar */}
                      <td className="py-3.5 px-4 sm:px-6">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal-100 text-teal-700 font-bold text-xs ring-2 ring-teal-50">
                            {initial}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900 leading-tight">
                              {nurse.name}
                            </p>
                            <p className="text-[11px] font-mono text-slate-400 leading-tight mt-0.5">
                              ID: {nurse.id.slice(0, 8)}...
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Shift Timing */}
                      <td className="py-3.5 px-4">
                        {renderShiftBadge(nurse.shift_timing)}
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
                            {nurse.department_id ? `Dept: ${nurse.department_id.slice(0, 8)}...` : "Unassigned"}
                          </span>
                        )}
                      </td>

                      {/* Contact Number */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 text-slate-600 font-mono text-xs sm:text-sm">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                          <span>{nurse.contact_number}</span>
                        </div>
                      </td>

                      {/* Date Registered */}
                      <td className="py-3.5 px-4 text-xs text-slate-500">
                        {formatDate(nurse.created_at)}
                      </td>

                      {/* Action Buttons */}
                      <td className="py-3.5 px-4 sm:px-6 text-right">
                        <div className="inline-flex items-center gap-1">
                          {/* View Details */}
                          <button
                            type="button"
                            onClick={() => handleOpenView(nurse)}
                            className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
                            title="View Nurse Profile"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>

                          {/* Edit Nurse */}
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(nurse)}
                            className="rounded-md p-1.5 text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition-colors cursor-pointer"
                            title="Edit Nurse"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>

                          {/* Delete Nurse */}
                          <button
                            type="button"
                            onClick={() => handleOpenDelete(nurse)}
                            className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors cursor-pointer"
                            title="Delete Nurse"
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

                {filteredNurses.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                        <p className="text-sm font-semibold text-slate-700">
                          No nurses found
                        </p>
                        <p className="text-xs text-slate-400">
                          {searchQuery || shiftFilter !== "all" || departmentFilter !== "all"
                            ? "Try adjusting your filters or search keywords."
                            : "Click 'Add Nurse' to register your first nursing staff member."}
                        </p>
                        {!searchQuery && shiftFilter === "all" && departmentFilter === "all" && (
                          <button
                            type="button"
                            onClick={handleOpenCreate}
                            className="mt-2 text-xs font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
                          >
                            + Add Nurse
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
      {/* 1. CREATE NURSE MODAL (POST /api/nurses)                  */}
      {/* ========================================================= */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200" role="dialog" aria-modal="true">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-50 text-teal-600 border border-teal-100">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Add New Nurse</h2>
                  <p className="text-xs text-slate-500">Register nursing staff and assign shift & ward department</p>
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
                  Nurse Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ayesha Khan, Sarah Johnson"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                    Shift Timing <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={createForm.shift_timing}
                    onChange={(e) => setCreateForm({ ...createForm, shift_timing: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  >
                    {SHIFT_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt} Shift
                      </option>
                    ))}
                  </select>
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
                </div>
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
                    "Register Nurse"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. VIEW NURSE MODAL (GET /api/nurses/{id})                */}
      {/* ========================================================= */}
      {viewNurse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200" role="dialog" aria-modal="true">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-100 text-teal-700 font-bold text-sm">
                  {(viewNurse.name || "N").charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">{viewNurse.name}</h2>
                  <p className="text-xs text-slate-500">Nursing Staff Profile</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewNurse(null)}
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
                    <span className="text-xs font-semibold text-slate-500 uppercase">Nurse ID</span>
                    <span className="font-mono text-xs text-slate-800 select-all font-medium bg-white px-2 py-0.5 rounded border border-slate-200">
                      {viewNurse.id}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500 uppercase">Shift Timing</span>
                    <div>{renderShiftBadge(viewNurse.shift_timing)}</div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500 uppercase">Department</span>
                    <span className="font-medium text-slate-900">
                      {departmentMap.get(viewNurse.department_id)?.name || "Unassigned"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500 uppercase">Phone</span>
                    <span className="font-mono font-medium text-slate-900">{viewNurse.contact_number}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500 uppercase">Date Registered</span>
                    <span className="text-xs text-slate-700">{formatDate(viewNurse.created_at)}</span>
                  </div>

                  {/* Assigned Rooms from GET /api/nurses/{id}/rooms */}
                  <div className="pt-2.5 border-t border-slate-200/70">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-semibold text-slate-500 uppercase">
                        Assigned Rooms ({viewAssignedRooms.length})
                      </span>
                      <Link
                        href="/dashboard/nurse-assignments"
                        className="text-[11px] font-semibold text-blue-600 hover:text-blue-700"
                      >
                        Manage &rarr;
                      </Link>
                    </div>
                    {viewAssignedRooms.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">No rooms assigned to this nurse.</p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {viewAssignedRooms.map((room) => (
                          <span
                            key={room.id}
                            className="inline-flex items-center gap-1.5 rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 border border-blue-200 group"
                          >
                            <span>Room {room.room_number}</span>
                            <span className="text-[10px] text-blue-500 font-normal">({room.type})</span>
                            <button
                              type="button"
                              onClick={() => handleUnassignRoomFromNurse(viewNurse.id, room)}
                              className="ml-0.5 rounded text-blue-400 hover:text-red-600 hover:bg-blue-100 p-0.5 transition-colors cursor-pointer"
                              title={`Remove from Room ${room.room_number}`}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(viewNurse)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3.5 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition-colors cursor-pointer"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit Nurse
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewNurse(null)}
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
      {/* 3. EDIT NURSE MODAL (PUT /api/nurses/{id})                */}
      {/* ========================================================= */}
      {editNurse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200" role="dialog" aria-modal="true">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-50 text-teal-600 border border-teal-100">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Edit Nurse Details</h2>
                  <p className="text-xs text-slate-500">Update shift assignments and departmental placement</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditNurse(null)}
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
                  Nurse Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                    Shift Timing <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={editForm.shift_timing}
                    onChange={(e) => setEditForm({ ...editForm, shift_timing: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  >
                    {SHIFT_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt} Shift
                      </option>
                    ))}
                  </select>
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
                  onClick={() => setEditNurse(null)}
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
      {/* 4. DELETE CONFIRMATION MODAL (DELETE /api/nurses/{id})    */}
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
                <h2 className="text-lg font-bold text-slate-900">Delete Nurse</h2>
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
                Are you sure you want to remove <strong className="text-slate-900 font-semibold">{deleteTarget.name}</strong> from the hospital nursing registry?
              </p>
              <p className="mt-2 text-xs text-slate-500 font-mono">
                Nurse ID: {deleteTarget.id}
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
                  "Delete Nurse"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
