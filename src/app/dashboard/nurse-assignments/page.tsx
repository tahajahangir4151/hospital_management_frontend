"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { nurseService } from "@/services/nurse.service";
import { roomService } from "@/services/room.service";
import { departmentService } from "@/services/department.service";
import { nurseRoomAssignmentService } from "@/services/nurse-room-assignment.service";
import { Nurse } from "@/types/nurse";
import { Room } from "@/types/room";
import { Department } from "@/types/department";
import {
  PageHeader,
  FilterToolbar,
  DataTable,
  ColumnDef,
  Toast,
  ToastData,
} from "@/components/common";

interface NurseWithRooms {
  nurse: Nurse;
  rooms: Room[];
  isLoadingRooms: boolean;
}

const SHIFT_OPTIONS = ["Morning", "Evening", "Night"];

export default function NurseAssignmentsPage() {
  const cachedNurses = nurseService.getCachedNurses();
  const cachedRooms = roomService.getCachedRooms();
  const cachedDepartments = departmentService.getCachedDepartments();

  const [nurses, setNurses] = useState<Nurse[]>(() => cachedNurses || []);
  const [rooms, setRooms] = useState<Room[]>(() => cachedRooms || []);
  const [departments, setDepartments] = useState<Department[]>(() => cachedDepartments || []);
  const [nurseRoomsMap, setNurseRoomsMap] = useState<Record<string, Room[]>>({});
  const [loadingRoomsMap, setLoadingRoomsMap] = useState<Record<string, boolean>>({});

  const [isLoading, setIsLoading] = useState(
    () => cachedNurses === null || cachedRooms === null || cachedDepartments === null
  );
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [shiftFilter, setShiftFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "assigned" | "unassigned">("all");

  // Toast
  const [toast, setToast] = useState<ToastData | null>(null);
  const showToast = (message: string, type: "success" | "error" = "success") => {
    const id = Date.now();
    setToast({ id, type, message });
    setTimeout(() => {
      setToast((current) => (current?.id === id ? null : current));
    }, 4000);
  };

  // Assignment Modal
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedNurseId, setSelectedNurseId] = useState("");
  const [selectedRoomId, setSelectedRoomId] = useState("");
  const [isAssigning, setIsAssigning] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);

  // View Details Modal
  const [viewingNurse, setViewingNurse] = useState<Nurse | null>(null);
  const [viewingRooms, setViewingRooms] = useState<Room[]>([]);
  const [isLoadingViewRooms, setIsLoadingViewRooms] = useState(false);

  // Load Rooms for a Nurse
  const fetchRoomsForNurse = useCallback(async (nurseId: string) => {
    setLoadingRoomsMap((prev) => ({ ...prev, [nurseId]: true }));
    try {
      const assignedRooms = await nurseRoomAssignmentService.getNurseRooms(nurseId);
      setNurseRoomsMap((prev) => ({ ...prev, [nurseId]: assignedRooms }));
      return assignedRooms;
    } catch {
      setNurseRoomsMap((prev) => ({ ...prev, [nurseId]: [] }));
      return [];
    } finally {
      setLoadingRoomsMap((prev) => ({ ...prev, [nurseId]: false }));
    }
  }, []);

  // Initial Data Fetch
  const loadData = useCallback(async (forceRefresh = false) => {
    if (forceRefresh) {
      setIsRefreshing(true);
    } else if (nurses.length === 0) {
      setIsLoading(true);
    }
    setError(null);

    try {
      const [nursesData, roomsData, departmentsData] = await Promise.all([
        nurseService.getNurses(forceRefresh),
        roomService.getRooms(forceRefresh),
        departmentService.getDepartments(forceRefresh),
      ]);

      setNurses(nursesData);
      setRooms(roomsData);
      setDepartments(departmentsData);

      // Fetch assignments for all nurses
      const map: Record<string, Room[]> = {};
      await Promise.all(
        nursesData.map(async (nurse) => {
          try {
            const r = await nurseRoomAssignmentService.getNurseRooms(nurse.id);
            map[nurse.id] = r;
          } catch {
            map[nurse.id] = [];
          }
        })
      );
      setNurseRoomsMap(map);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load assignments data.";
      setError(msg);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [nurses.length]);

  useEffect(() => {
    let active = true;
    if (
      !nurseService.getCachedNurses() ||
      !roomService.getCachedRooms() ||
      !departmentService.getCachedDepartments()
    ) {
      Promise.all([
        nurseService.getNurses(false),
        roomService.getRooms(false),
        departmentService.getDepartments(false),
      ])
        .then(async ([nursesData, roomsData, departmentsData]) => {
          if (!active) return;
          setNurses(nursesData);
          setRooms(roomsData);
          setDepartments(departmentsData);
          setIsLoading(false);

          // Fetch assignments
          const map: Record<string, Room[]> = {};
          await Promise.all(
            nursesData.map(async (nurse) => {
              try {
                const r = await nurseRoomAssignmentService.getNurseRooms(nurse.id);
                map[nurse.id] = r;
              } catch {
                map[nurse.id] = [];
              }
            })
          );
          if (active) {
            setNurseRoomsMap(map);
          }
        })
        .catch((err: unknown) => {
          if (!active) return;
          const msg = err instanceof Error ? err.message : "Failed to load assignments data.";
          setError(msg);
          setIsLoading(false);
        });
    } else {
      const nursesList = nurseService.getCachedNurses() || [];
      Promise.all(
        nursesList.map(async (nurse) => {
          try {
            const r = await nurseRoomAssignmentService.getNurseRooms(nurse.id);
            return { id: nurse.id, rooms: r };
          } catch {
            return { id: nurse.id, rooms: [] };
          }
        })
      ).then((results) => {
        if (!active) return;
        const map: Record<string, Room[]> = {};
        results.forEach((item) => {
          map[item.id] = item.rooms;
        });
        setNurseRoomsMap(map);
      });
    }

    return () => {
      active = false;
    };
  }, []);

  // Department Map
  const departmentMap = useMemo(() => {
    const map = new Map<string, Department>();
    departments.forEach((dept) => map.set(dept.id, dept));
    return map;
  }, [departments]);

  // Combined Nurse & Rooms List
  const combinedData: NurseWithRooms[] = useMemo(() => {
    return nurses.map((nurse) => ({
      nurse,
      rooms: nurseRoomsMap[nurse.id] || [],
      isLoadingRooms: !!loadingRoomsMap[nurse.id],
    }));
  }, [nurses, nurseRoomsMap, loadingRoomsMap]);

  // Filtered List
  const filteredData = useMemo(() => {
    return combinedData.filter(({ nurse, rooms: assignedRooms }) => {
      const query = searchQuery.toLowerCase().trim();
      const deptName = departmentMap.get(nurse.department_id)?.name?.toLowerCase() || "";
      const roomNumbers = assignedRooms.map((r) => r.room_number.toLowerCase()).join(" ");

      const matchesSearch =
        !query ||
        nurse.name.toLowerCase().includes(query) ||
        nurse.contact_number.toLowerCase().includes(query) ||
        nurse.shift_timing.toLowerCase().includes(query) ||
        deptName.includes(query) ||
        roomNumbers.includes(query);

      const matchesShift =
        shiftFilter === "all" ||
        nurse.shift_timing.toLowerCase() === shiftFilter.toLowerCase();

      const matchesDepartment =
        departmentFilter === "all" || nurse.department_id === departmentFilter;

      let matchesStatus = true;
      if (statusFilter === "assigned") {
        matchesStatus = assignedRooms.length > 0;
      } else if (statusFilter === "unassigned") {
        matchesStatus = assignedRooms.length === 0;
      }

      return matchesSearch && matchesShift && matchesDepartment && matchesStatus;
    });
  }, [combinedData, searchQuery, shiftFilter, departmentFilter, statusFilter, departmentMap]);

  // Metrics
  const totalAssignedNurses = useMemo(() => {
    return Object.values(nurseRoomsMap).filter((r) => r.length > 0).length;
  }, [nurseRoomsMap]);

  const totalAssignmentsCount = useMemo(() => {
    return Object.values(nurseRoomsMap).reduce((acc, curr) => acc + curr.length, 0);
  }, [nurseRoomsMap]);

  // Handle Open Assign Modal
  const handleOpenAssignModal = (nurseId?: string) => {
    setSelectedNurseId(nurseId || (nurses[0]?.id ?? ""));
    setSelectedRoomId(rooms[0]?.id ?? "");
    setAssignError(null);
    setIsAssignModalOpen(true);
  };

  // Submit Room Assignment
  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedNurseId || !selectedRoomId) {
      setAssignError("Nurse and room are required.");
      return;
    }

    setIsAssigning(true);
    setAssignError(null);

    try {
      await nurseRoomAssignmentService.assignNurseToRoom({
        nurse_id: selectedNurseId,
        room_id: selectedRoomId,
      });

      // Refetch rooms for this nurse to ensure state consistency
      await fetchRoomsForNurse(selectedNurseId);

      const nurseObj = nurses.find((n) => n.id === selectedNurseId);
      const roomObj = rooms.find((r) => r.id === selectedRoomId);
      showToast(
        `Nurse ${nurseObj?.name || "staff"} successfully assigned to Room ${
          roomObj?.room_number || ""
        }!`,
        "success"
      );

      setIsAssignModalOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to assign nurse to room.";
      setAssignError(msg);
    } finally {
      setIsAssigning(false);
    }
  };

  // Open View Details Modal
  const handleOpenViewDetails = async (nurse: Nurse) => {
    setViewingNurse(nurse);
    setIsLoadingViewRooms(true);
    setViewingRooms(nurseRoomsMap[nurse.id] || []);

    try {
      const freshRooms = await nurseRoomAssignmentService.getNurseRooms(nurse.id);
      setViewingRooms(freshRooms);
      setNurseRoomsMap((prev) => ({ ...prev, [nurse.id]: freshRooms }));
    } catch {
      // Keep existing
    } finally {
      setIsLoadingViewRooms(false);
    }
  };

  // Badge Helpers
  const renderShiftBadge = (shift: string) => {
    const s = shift?.toLowerCase() || "";
    if (s === "morning") {
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700 border border-amber-200">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
          Morning
        </span>
      );
    }
    if (s === "evening") {
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700 border border-indigo-200">
          <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
          Evening
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

  const renderRoomBadge = (room: Room) => {
    return (
      <span
        key={room.id}
        className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 border border-blue-200"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-3 w-3 text-blue-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3"
          />
        </svg>
        <span>Room {room.room_number}</span>
        <span className="text-[10px] text-blue-500">({room.type})</span>
      </span>
    );
  };

  // Table Columns
  const columns: ColumnDef<NurseWithRooms>[] = [
    {
      header: "Nurse Profile",
      render: (item: NurseWithRooms) => {
        const initial = (item.nurse.name || "N").charAt(0).toUpperCase();
        return (
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal-100 text-teal-700 font-bold text-xs ring-2 ring-teal-50">
              {initial}
            </div>
            <div>
              <p className="font-semibold text-slate-900 leading-tight">{item.nurse.name}</p>
              <p className="text-[11px] font-mono text-slate-400 leading-tight mt-0.5">
                ID: {item.nurse.id.slice(0, 8)}...
              </p>
            </div>
          </div>
        );
      },
    },
    {
      header: "Shift Timing",
      render: (item: NurseWithRooms) => renderShiftBadge(item.nurse.shift_timing),
    },
    {
      header: "Department",
      render: (item: NurseWithRooms) => {
        const dept = departmentMap.get(item.nurse.department_id);
        return dept ? (
          <div>
            <p className="font-medium text-xs sm:text-sm text-slate-800 leading-tight">
              {dept.name}
            </p>
            <p className="text-[11px] text-slate-400 leading-tight">{dept.location}</p>
          </div>
        ) : (
          <span className="text-xs text-slate-400 font-mono">
            {item.nurse.department_id ? `Dept: ${item.nurse.department_id.slice(0, 8)}...` : "Unassigned"}
          </span>
        );
      },
    },
    {
      header: "Assigned Rooms",
      render: (item: NurseWithRooms) => {
        if (item.isLoadingRooms) {
          return (
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <svg className="h-3 w-3 animate-spin text-blue-600" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span>Checking rooms...</span>
            </div>
          );
        }

        if (item.rooms.length === 0) {
          return (
            <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
              No rooms assigned
            </span>
          );
        }

        return (
          <div className="flex flex-wrap items-center gap-1.5 max-w-sm">
            {item.rooms.map(renderRoomBadge)}
          </div>
        );
      },
    },
    {
      header: "Contact",
      render: (item: NurseWithRooms) => (
        <span className="font-mono text-xs text-slate-600">{item.nurse.contact_number}</span>
      ),
    },
    {
      header: "Actions",
      align: "right",
      render: (item: NurseWithRooms) => (
        <div className="inline-flex items-center gap-1.5 justify-end">
          <button
            type="button"
            onClick={() => handleOpenViewDetails(item.nurse)}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition-colors cursor-pointer"
            title="View Nurse's Room Details"
          >
            View ({item.rooms.length})
          </button>
          <button
            type="button"
            onClick={() => handleOpenAssignModal(item.nurse.id)}
            className="inline-flex items-center gap-1 rounded-lg bg-blue-50 border border-blue-200 px-2.5 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition-colors cursor-pointer"
            title="Assign a Room to this Nurse"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <span>Assign</span>
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 relative">
      {/* Toast Notification */}
      <Toast toast={toast} onClose={() => setToast(null)} />

      {/* Page Header */}
      <PageHeader
        title="Nurse Room Assignments"
        subtitle="Assign registered nurses to hospital rooms, monitor ward duty coverage, and view room care delegations."
        badge={{
          text: `${totalAssignmentsCount} Active Links`,
          color: "blue",
        }}
        onRefresh={() => loadData(true)}
        isRefreshing={isRefreshing}
        primaryAction={{
          label: "Assign Room",
          onClick: () => handleOpenAssignModal(),
          icon: (
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
          ),
        }}
      />

      {/* Error Alert */}
      {error && (
        <div role="alert" className="flex items-start justify-between rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <div>
            <p className="font-semibold">Unable to load assignment data</p>
            <p className="mt-0.5 text-xs text-red-600">{error}</p>
          </div>
          <button
            type="button"
            onClick={() => loadData(true)}
            className="rounded-md border border-red-300 bg-white px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-50 cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Total Nurses
          </p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-slate-900">
              {nurses.length}
            </span>
            <span className="text-xs text-slate-500 font-medium">Active roster</span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Nurses Assigned
          </p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-emerald-600">
              {totalAssignedNurses}
            </span>
            <span className="text-xs text-slate-500 font-medium">With active rooms</span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Active Delegations
          </p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-blue-600">
              {totalAssignmentsCount}
            </span>
            <span className="text-xs text-slate-500 font-medium">Total room links</span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Hospital Rooms
          </p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-indigo-600">
              {rooms.length}
            </span>
            <span className="text-xs text-slate-500 font-medium">Configured wards</span>
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="space-y-4">
        {/* Filter Toolbar */}
        <FilterToolbar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Search by nurse name, shift, room #, or department..."
        >
          {/* Shift Filter */}
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

          {/* Department Filter */}
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

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "all" | "assigned" | "unassigned")}
            className="rounded-lg border border-slate-200 bg-slate-50 py-2 px-3 text-xs sm:text-sm text-slate-700 focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
          >
            <option value="all">All Statuses</option>
            <option value="assigned">Assigned to Rooms</option>
            <option value="unassigned">Unassigned (No Rooms)</option>
          </select>
        </FilterToolbar>

        {/* Data Table */}
        <DataTable
          columns={columns}
          data={filteredData}
          keyExtractor={(row) => row.nurse.id}
          isLoading={isLoading}
          emptyState={{
            title: "No nurse assignments found",
            description:
              searchQuery || shiftFilter !== "all" || departmentFilter !== "all" || statusFilter !== "all"
                ? "Try adjusting your search query or filters."
                : "Assign a nurse to a room to begin tracking ward duty assignments.",
            actionLabel: "+ Assign First Room",
            onAction: () => handleOpenAssignModal(),
          }}
          footer={{
            itemCount: filteredData.length,
            totalCount: combinedData.length,
            entityLabel: "nurses",
          }}
        />
      </div>

      {/* ========================================================= */}
      {/* ASSIGN NURSE TO ROOM MODAL (POST /api/nurse-room-assignments) */}
      {/* ========================================================= */}
      {isAssignModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
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
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Assign Nurse to Room</h2>
                  <p className="text-xs text-slate-500">
                    Delegates a hospital room to the selected nurse staff
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAssignModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {assignError && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                {assignError}
              </div>
            )}

            <form onSubmit={handleAssignSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                  Select Nurse <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={selectedNurseId}
                  onChange={(e) => setSelectedNurseId(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
                >
                  <option value="" disabled>
                    -- Select Nurse Staff --
                  </option>
                  {nurses.map((nurse) => (
                    <option key={nurse.id} value={nurse.id}>
                      {nurse.name} — {nurse.shift_timing} Shift (
                      {departmentMap.get(nurse.department_id)?.name || "Dept"})
                    </option>
                  ))}
                </select>
                {selectedNurseId && (
                  <p className="mt-1 text-[11px] font-mono text-slate-400">
                    Nurse ID: {selectedNurseId}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                  Select Hospital Room <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={selectedRoomId}
                  onChange={(e) => setSelectedRoomId(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
                >
                  <option value="" disabled>
                    -- Select Room --
                  </option>
                  {rooms.map((room) => (
                    <option key={room.id} value={room.id}>
                      Room {room.room_number} ({room.type}) — ${room.daily_charge}/day
                    </option>
                  ))}
                </select>
                {selectedRoomId && (
                  <p className="mt-1 text-[11px] font-mono text-slate-400">
                    Room ID: {selectedRoomId}
                  </p>
                )}
              </div>

              {/* Informative Preview Card */}
              {selectedNurseId && selectedRoomId && (
                <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3.5 text-xs text-blue-900 space-y-1">
                  <p className="font-semibold text-blue-950">Assignment Summary:</p>
                  <div className="grid grid-cols-2 gap-2 pt-1 text-slate-700">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase">Staff Member</span>
                      <span className="font-medium text-slate-900">
                        {nurses.find((n) => n.id === selectedNurseId)?.name}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase">Assigned Room</span>
                      <span className="font-medium text-slate-900">
                        Room {rooms.find((r) => r.id === selectedRoomId)?.room_number} (
                        {rooms.find((r) => r.id === selectedRoomId)?.type})
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 mt-6">
                <button
                  type="button"
                  onClick={() => setIsAssignModalOpen(false)}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAssigning || !selectedNurseId || !selectedRoomId}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {isAssigning ? (
                    <>
                      <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Assigning Room...
                    </>
                  ) : (
                    "Confirm Assignment"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* VIEW NURSE ROOMS MODAL (GET /api/nurses/{id}/rooms)        */}
      {/* ========================================================= */}
      {viewingNurse && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-100 text-teal-700 font-bold text-sm">
                  {(viewingNurse.name || "N").charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">{viewingNurse.name}</h2>
                  <p className="text-xs text-slate-500">
                    {viewingNurse.shift_timing} Shift • {departmentMap.get(viewingNurse.department_id)?.name || "Department"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingNurse(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Nurse Quick Meta */}
            <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-100 mb-4 text-xs grid grid-cols-2 gap-3">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Nurse ID</span>
                <span className="font-mono text-slate-800 select-all">{viewingNurse.id}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Contact Phone</span>
                <span className="font-mono text-slate-800">{viewingNurse.contact_number}</span>
              </div>
            </div>

            {/* Assigned Rooms List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Assigned Rooms ({viewingRooms.length})
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    const id = viewingNurse.id;
                    setViewingNurse(null);
                    handleOpenAssignModal(id);
                  }}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
                >
                  + Assign Another Room
                </button>
              </div>

              {isLoadingViewRooms ? (
                <div className="py-8 text-center text-sm text-slate-500">
                  <svg className="h-5 w-5 animate-spin text-blue-600 mx-auto mb-2" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Fetching rooms from server...
                </div>
              ) : viewingRooms.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center">
                  <p className="text-sm font-semibold text-slate-700">No rooms assigned</p>
                  <p className="text-xs text-slate-400 mt-1">
                    This nurse has not been assigned to any hospital rooms yet.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 overflow-hidden max-h-60 overflow-y-auto">
                  {viewingRooms.map((room) => (
                    <div key={room.id} className="p-3.5 bg-white flex items-center justify-between hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-700 font-bold text-xs">
                          {room.room_number}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-900">
                            Room {room.room_number}
                          </p>
                          <p className="text-xs text-slate-500">
                            {room.type} Ward • Daily Charge: ${room.daily_charge}
                          </p>
                        </div>
                      </div>
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        Active
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 mt-6">
              <button
                type="button"
                onClick={() => setViewingNurse(null)}
                className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors cursor-pointer"
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
