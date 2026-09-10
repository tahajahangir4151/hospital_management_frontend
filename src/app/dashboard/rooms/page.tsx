"use client";

import React, { useEffect, useState, useMemo } from "react";
import { roomService } from "@/services/room.service";
import { dashboardService } from "@/services/dashboard.service";
import {
  Room,
  CreateRoomDTO,
  UpdateRoomDTO,
  RoomOccupant,
  RoomAdmission,
} from "@/types/room";
import {
  PageHeader,
  FilterToolbar,
  DataTable,
  ColumnDef,
  ConfirmDeleteModal,
  Toast,
  ToastNotification,
} from "@/components/common";

const ROOM_TYPES = [
  "General",
  "Semi-Private",
  "Private",
  "ICU",
  "Isolation",
  "Emergency",
] as const;

export default function RoomsPage() {
  const cachedRooms = roomService.getCachedRooms();

  const [rooms, setRooms] = useState<Room[]>(() => cachedRooms || []);
  const [isLoading, setIsLoading] = useState(() => cachedRooms === null);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("number-asc");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<"table" | "grid">("grid");

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
  const [createForm, setCreateForm] = useState<CreateRoomDTO>({
    room_number: "",
    type: "Private",
    daily_charge: 6000,
  });
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // View Details Modal
  const [viewRoom, setViewRoom] = useState<Room | null>(null);
  const [viewOccupants, setViewOccupants] = useState<RoomOccupant[]>([]);
  const [viewAdmissions, setViewAdmissions] = useState<RoomAdmission[]>([]);
  const [isLoadingViewHistory, setIsLoadingViewHistory] = useState(false);
  const [activeTab, setActiveTab] = useState<"details" | "occupants" | "admissions">("details");

  // Edit Modal
  const [editRoom, setEditRoom] = useState<Room | null>(null);
  const [editForm, setEditForm] = useState<UpdateRoomDTO>({
    room_number: "",
    type: "Private",
    daily_charge: 6000,
  });
  const [isUpdating, setIsUpdating] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Delete Modal
  const [deleteTarget, setDeleteTarget] = useState<Room | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // -------------------------------------------------------------
  // Data Fetching
  // -------------------------------------------------------------
  const loadRooms = async (forceRefresh = false) => {
    if (forceRefresh) {
      setIsRefreshing(true);
    } else if (rooms.length === 0) {
      setIsLoading(true);
    }
    setError(null);

    try {
      const data = await roomService.getRooms(forceRefresh);
      setRooms(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load rooms.";
      setError(msg);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    let active = true;
    if (!roomService.getCachedRooms()) {
      roomService
        .getRooms(false)
        .then((data) => {
          if (active) {
            setRooms(data);
            setIsLoading(false);
          }
        })
        .catch((err: unknown) => {
          if (active) {
            const msg = err instanceof Error ? err.message : "Failed to load rooms.";
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
  // Helper Formatters
  // -------------------------------------------------------------
  const formatCurrency = (amount?: number | null): string => {
    if (amount === undefined || amount === null || isNaN(amount)) return "PKR 0";
    return `PKR ${Number(amount).toLocaleString()}`;
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

  const getTypeBadgeStyle = (type: string) => {
    const t = type?.toLowerCase() || "";
    if (t.includes("icu")) {
      return {
        badge: "bg-rose-50 text-rose-700 border-rose-200/70",
        dot: "bg-rose-500",
        cardBorder: "hover:border-rose-300",
        cardIconBg: "bg-rose-50 text-rose-600",
      };
    }
    if (t.includes("private")) {
      return {
        badge: "bg-indigo-50 text-indigo-700 border-indigo-200/70",
        dot: "bg-indigo-500",
        cardBorder: "hover:border-indigo-300",
        cardIconBg: "bg-indigo-50 text-indigo-600",
      };
    }
    if (t.includes("semi")) {
      return {
        badge: "bg-sky-50 text-sky-700 border-sky-200/70",
        dot: "bg-sky-500",
        cardBorder: "hover:border-sky-300",
        cardIconBg: "bg-sky-50 text-sky-600",
      };
    }
    if (t.includes("isolation") || t.includes("emergency")) {
      return {
        badge: "bg-amber-50 text-amber-700 border-amber-200/70",
        dot: "bg-amber-500",
        cardBorder: "hover:border-amber-300",
        cardIconBg: "bg-amber-50 text-amber-600",
      };
    }
    return {
      badge: "bg-teal-50 text-teal-700 border-teal-200/70",
      dot: "bg-teal-500",
      cardBorder: "hover:border-teal-300",
      cardIconBg: "bg-teal-50 text-teal-600",
    };
  };

  // -------------------------------------------------------------
  // Summary Metrics
  // -------------------------------------------------------------
  const metrics = useMemo(() => {
    const total = rooms.length;
    const icuCount = rooms.filter((r) => r.type?.toLowerCase().includes("icu")).length;
    const privateCount = rooms.filter(
      (r) =>
        r.type?.toLowerCase() === "private" ||
        r.type?.toLowerCase().includes("semi-private")
    ).length;

    const totalRevenuePotential = rooms.reduce((acc, r) => acc + (Number(r.daily_charge) || 0), 0);
    const avgDailyRate = total > 0 ? Math.round(totalRevenuePotential / total) : 0;

    return {
      total,
      icuCount,
      privateCount,
      avgDailyRate,
    };
  }, [rooms]);

  // -------------------------------------------------------------
  // Filtered & Sorted Rooms
  // -------------------------------------------------------------
  const filteredRooms = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return rooms
      .filter((room) => {
        // Type filter
        if (typeFilter !== "all") {
          if (room.type?.toLowerCase() !== typeFilter.toLowerCase()) {
            return false;
          }
        }

        // Search query
        if (!query) return true;
        const numberMatch = room.room_number?.toLowerCase().includes(query);
        const typeMatch = room.type?.toLowerCase().includes(query);
        const idMatch = room.id?.toLowerCase().includes(query);
        return numberMatch || typeMatch || idMatch;
      })
      .sort((a, b) => {
        if (sortBy === "number-asc") {
          return (a.room_number || "").localeCompare(b.room_number || "", undefined, {
            numeric: true,
          });
        }
        if (sortBy === "number-desc") {
          return (b.room_number || "").localeCompare(a.room_number || "", undefined, {
            numeric: true,
          });
        }
        if (sortBy === "price-desc") {
          return (Number(b.daily_charge) || 0) - (Number(a.daily_charge) || 0);
        }
        if (sortBy === "price-asc") {
          return (Number(a.daily_charge) || 0) - (Number(b.daily_charge) || 0);
        }
        if (sortBy === "newest") {
          return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
        }
        return 0;
      });
  }, [rooms, searchQuery, typeFilter, sortBy]);

  // -------------------------------------------------------------
  // Create Room Handler (POST /api/rooms)
  // -------------------------------------------------------------
  const handleOpenCreate = () => {
    setCreateForm({
      room_number: "",
      type: "Private",
      daily_charge: 6000,
    });
    setCreateError(null);
    setIsCreateOpen(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.room_number.trim() || !createForm.type.trim() || createForm.daily_charge === undefined) {
      setCreateError("All fields are required.");
      return;
    }

    if (Number(createForm.daily_charge) < 0) {
      setCreateError("Daily charge cannot be negative.");
      return;
    }

    setIsCreating(true);
    setCreateError(null);

    try {
      const created = await roomService.createRoom(createForm);
      setRooms((prev) => [created, ...prev]);
      dashboardService.clearCache(); // Sync dashboard metric counts
      setIsCreateOpen(false);
      showToast(`Room #${created.room_number} created successfully!`, "success");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create room.";
      setCreateError(msg);
    } finally {
      setIsCreating(false);
    }
  };

  // -------------------------------------------------------------
  // View Details Modal (GET /api/rooms/{id})
  // -------------------------------------------------------------
  const handleOpenView = async (room: Room) => {
    setViewRoom(room);
    setActiveTab("details");
    setIsLoadingViewHistory(true);

    try {
      const [freshRoom, occupants, admissions] = await Promise.allSettled([
        roomService.getRoomById(room.id),
        roomService.getRoomOccupants(room.id),
        roomService.getRoomAdmissions(room.id),
      ]);

      if (freshRoom.status === "fulfilled") {
        setViewRoom(freshRoom.value);
      }
      if (occupants.status === "fulfilled") {
        setViewOccupants(occupants.value);
      } else {
        setViewOccupants([]);
      }
      if (admissions.status === "fulfilled") {
        setViewAdmissions(admissions.value);
      } else {
        setViewAdmissions([]);
      }
    } catch {
      // Keep existing room info
    } finally {
      setIsLoadingViewHistory(false);
    }
  };

  // -------------------------------------------------------------
  // Edit Room Handler (PUT /api/rooms/{id})
  // -------------------------------------------------------------
  const handleOpenEdit = (room: Room) => {
    setEditRoom(room);
    setEditForm({
      room_number: room.room_number,
      type: room.type,
      daily_charge: room.daily_charge,
    });
    setEditError(null);
    setViewRoom(null);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editRoom) return;

    if (!editForm.room_number.trim() || !editForm.type.trim() || editForm.daily_charge === undefined) {
      setEditError("All fields are required.");
      return;
    }

    if (Number(editForm.daily_charge) < 0) {
      setEditError("Daily charge cannot be negative.");
      return;
    }

    setIsUpdating(true);
    setEditError(null);

    try {
      const updated = await roomService.updateRoom(editRoom.id, editForm);
      setRooms((prev) =>
        prev.map((item) => (item.id === editRoom.id ? updated : item))
      );
      setEditRoom(null);
      showToast(`Room #${updated.room_number} updated successfully!`, "success");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update room.";
      setEditError(msg);
    } finally {
      setIsUpdating(false);
    }
  };

  // -------------------------------------------------------------
  // Delete Room Handler (DELETE /api/rooms/{id})
  // -------------------------------------------------------------
  const handleOpenDelete = (room: Room) => {
    setDeleteTarget(room);
    setDeleteError(null);
    setViewRoom(null);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;

    setIsDeleting(true);
    setDeleteError(null);

    try {
      await roomService.deleteRoom(deleteTarget.id);
      setRooms((prev) => prev.filter((item) => item.id !== deleteTarget.id));
      dashboardService.clearCache(); // Sync dashboard metrics
      const roomNum = deleteTarget.room_number;
      setDeleteTarget(null);
      showToast(`Room #${roomNum} deleted successfully!`, "success");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete room.";
      setDeleteError(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  // Table Column Definitions
  const columns = useMemo<ColumnDef<Room>[]>(
    () => [
      {
        header: "Room Number & ID",
        render: (room) => {
          const styles = getTypeBadgeStyle(room.type);
          return (
            <div className="flex items-center gap-3">
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-bold text-sm ${styles.cardIconBg}`}
              >
                #{room.room_number}
              </div>
              <div>
                <button
                  type="button"
                  onClick={() => handleOpenView(room)}
                  className="font-semibold text-slate-900 hover:text-blue-600 transition-colors text-left cursor-pointer"
                >
                  Room {room.room_number}
                </button>
                <p className="font-mono text-[11px] text-slate-400">
                  UUID: {room.id.slice(0, 8)}...
                </p>
              </div>
            </div>
          );
        },
      },
      {
        header: "Category / Type",
        render: (room) => {
          const styles = getTypeBadgeStyle(room.type);
          return (
            <span
              className={`inline-flex items-center gap-1 rounded-md px-2.5 py-0.5 text-xs font-semibold border ${styles.badge}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${styles.dot}`} />
              {room.type}
            </span>
          );
        },
      },
      {
        header: "Daily Tariff",
        render: (room) => (
          <div>
            <span className="font-semibold text-slate-900">
              {formatCurrency(room.daily_charge)}
            </span>
            <span className="text-xs text-slate-400 ml-1">/ day</span>
          </div>
        ),
      },
      {
        header: "Configured Date",
        render: (room) => (
          <span className="text-xs text-slate-500">{formatDate(room.created_at)}</span>
        ),
      },
      {
        header: "Actions",
        align: "right",
        render: (room) => (
          <div className="flex items-center justify-end gap-1">
            <button
              type="button"
              onClick={() => handleOpenView(room)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
              title="View room details"
              aria-label={`View Room ${room.room_number}`}
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
              onClick={() => handleOpenEdit(room)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition-colors cursor-pointer"
              title="Edit Room"
              aria-label={`Edit Room ${room.room_number}`}
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
              onClick={() => handleOpenDelete(room)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors cursor-pointer"
              title="Delete Room"
              aria-label={`Delete Room ${room.room_number}`}
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
        title="Rooms & Ward Management"
        subtitle="Configure hospital rooms, ward accommodations, ICU units, and daily tariff rates."
        badge={{
          text: `${rooms.length} ${rooms.length === 1 ? "Room" : "Rooms"}`,
          color: "blue",
        }}
        primaryAction={{
          id: "create-room-btn",
          label: "Add New Room",
          onClick: handleOpenCreate,
        }}
        onRefresh={() => loadRooms(true)}
        isRefreshing={isRefreshing}
      />

      {/* Metric Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Rooms */}
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
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Total Rooms
            </p>
            <p className="mt-0.5 text-2xl font-bold tracking-tight text-slate-900">
              {metrics.total}
            </p>
          </div>
        </div>

        {/* ICU / Critical Care */}
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
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
              />
            </svg>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
              ICU & Critical Care
            </p>
            <div className="mt-0.5 flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight text-slate-900">
                {metrics.icuCount}
              </span>
              {metrics.total > 0 && (
                <span className="text-xs font-semibold text-rose-600">
                  {Math.round((metrics.icuCount / metrics.total) * 100)}%
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Private & Semi-Private */}
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
                d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
              />
            </svg>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Private Suites
            </p>
            <p className="mt-0.5 text-2xl font-bold tracking-tight text-slate-900">
              {metrics.privateCount}
            </p>
          </div>
        </div>

        {/* Average Daily Charge */}
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
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Avg. Daily Rate
            </p>
            <p className="mt-0.5 text-2xl font-bold tracking-tight text-slate-900">
              {formatCurrency(metrics.avgDailyRate)}
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
              <p className="font-semibold">Unable to fetch room records</p>
              <p className="mt-0.5 text-red-700">{error}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => loadRooms(true)}
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
        searchPlaceholder="Search by room number (e.g. 101, 204), room type, or ID..."
        filters={[
          {
            id: "room-type-filter",
            label: "Type",
            value: typeFilter,
            onChange: setTypeFilter,
            options: [
              { value: "all", label: "All Room Types" },
              ...ROOM_TYPES.map((t) => ({ value: t, label: t })),
            ],
          },
        ]}
        sortBy={sortBy}
        onSortChange={setSortBy}
        sortOptions={[
          { value: "number-asc", label: "Room Number (Low to High)" },
          { value: "number-desc", label: "Room Number (High to Low)" },
          { value: "price-desc", label: "Daily Charge (Highest First)" },
          { value: "price-asc", label: "Daily Charge (Lowest First)" },
          { value: "newest", label: "Recently Created" },
        ]}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      {/* Main Content Area */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200/80 bg-white py-20 shadow-xs">
          <div className="h-10 w-10 animate-spin rounded-full border-3 border-blue-600 border-t-transparent" />
          <p className="mt-4 text-sm font-medium text-slate-600">Loading hospital rooms...</p>
        </div>
      ) : filteredRooms.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200/80 bg-white py-16 px-4 text-center shadow-xs">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-8 w-8"
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
          <h3 className="mt-4 text-base font-bold text-slate-900">
            {searchQuery || typeFilter !== "all" ? "No matching rooms found" : "No rooms configured yet"}
          </h3>
          <p className="mt-1 max-w-sm text-sm text-slate-500">
            {searchQuery || typeFilter !== "all"
              ? "Try adjusting your search criteria or resetting the room type filter."
              : "Get started by adding the first room to the hospital ward management system."}
          </p>
          {searchQuery || typeFilter !== "all" ? (
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setTypeFilter("all");
              }}
              className="mt-4 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Reset Search Filters
            </button>
          ) : (
            <button
              type="button"
              onClick={handleOpenCreate}
              className="mt-4 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors"
            >
              Add First Room Now
            </button>
          )}
        </div>
      ) : viewMode === "grid" ? (
        /* ============================================================= */
        /* Grid Cards View */
        /* ============================================================= */
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredRooms.map((room) => {
            const styles = getTypeBadgeStyle(room.type);

            return (
              <div
                key={room.id}
                className={`relative flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all duration-200 hover:shadow-md ${styles.cardBorder}`}
              >
                {/* Top Row: Room Number & Type Badge */}
                <div>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl font-bold text-base select-none ${styles.cardIconBg}`}
                      >
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
                            strokeWidth={1.75}
                            d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                          />
                        </svg>
                      </div>
                      <div>
                        <button
                          type="button"
                          onClick={() => handleOpenView(room)}
                          className="text-lg font-bold text-slate-900 hover:text-blue-600 transition-colors text-left"
                        >
                          Room #{room.room_number}
                        </button>
                        <p className="font-mono text-[11px] text-slate-400">
                          ID: {room.id.slice(0, 8)}...
                        </p>
                      </div>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold border ${styles.badge}`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${styles.dot}`} />
                      {room.type}
                    </span>
                  </div>

                  {/* Daily Charge */}
                  <div className="mt-4 rounded-xl bg-slate-50/80 p-3 border border-slate-100">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      Daily Accommodation Charge
                    </p>
                    <div className="mt-1 flex items-baseline justify-between">
                      <span className="text-lg font-bold text-slate-900">
                        {formatCurrency(room.daily_charge)}
                      </span>
                      <span className="text-xs text-slate-500 font-medium">per day</span>
                    </div>
                  </div>
                </div>

                {/* Bottom Row: Creation Date & Quick Actions */}
                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500">
                  <span>Created {formatDate(room.created_at)}</span>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleOpenView(room)}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                      title="View details & occupants"
                      aria-label={`View Room ${room.room_number}`}
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
                      onClick={() => handleOpenEdit(room)}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                      title="Edit Room"
                      aria-label={`Edit Room ${room.room_number}`}
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
                      onClick={() => handleOpenDelete(room)}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                      title="Delete Room"
                      aria-label={`Delete Room ${room.room_number}`}
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
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ============================================================= */
        <DataTable<Room>
          data={filteredRooms}
          columns={columns}
          keyExtractor={(r) => r.id}
          footer={{
            itemCount: filteredRooms.length,
            totalCount: rooms.length,
            entityLabel: "rooms",
            note: "Tariffs subject to hospital admission policy",
          }}
        />
      )}

      {/* ============================================================= */}
      {/* Create Room Modal (POST /api/rooms) */}
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
                <h3 className="text-lg font-bold text-slate-900">Add New Hospital Room</h3>
                <p className="text-xs text-slate-500">
                  Register a new room, assign its category, and specify daily tariff.
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
              {/* Room Number */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Room Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 101, 204, ICU-01"
                  value={createForm.room_number}
                  onChange={(e) => setCreateForm({ ...createForm, room_number: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>

              {/* Room Type */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Room Type / Category <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={createForm.type}
                  onChange={(e) => setCreateForm({ ...createForm, type: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                >
                  {ROOM_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              {/* Daily Charge */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Daily Charge (PKR) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                    PKR
                  </span>
                  <input
                    type="number"
                    required
                    min={0}
                    step={100}
                    placeholder="e.g. 6000"
                    value={createForm.daily_charge}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, daily_charge: Number(e.target.value) })
                    }
                    className="w-full rounded-xl border border-slate-200 py-2 pl-14 pr-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <p className="mt-1 text-[11px] text-slate-400">
                  Standard overnight rate billed to the admitted patient.
                </p>
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
                  id="submit-create-room"
                  type="submit"
                  disabled={isCreating}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-xs hover:bg-blue-700 disabled:opacity-60 transition-colors cursor-pointer"
                >
                  {isCreating ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      <span>Saving Room...</span>
                    </>
                  ) : (
                    <span>Add Room</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* View Room Details Modal (GET /api/rooms/{id}) */}
      {/* ============================================================= */}
      {viewRoom && (
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
                    getTypeBadgeStyle(viewRoom.type).cardIconBg
                  }`}
                >
                  #{viewRoom.room_number}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">
                    Room #{viewRoom.room_number}
                  </h3>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-mono text-slate-600">
                      UUID: {viewRoom.id}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold border ${
                        getTypeBadgeStyle(viewRoom.type).badge
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          getTypeBadgeStyle(viewRoom.type).dot
                        }`}
                      />
                      {viewRoom.type}
                    </span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewRoom(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                &times;
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-slate-200 mt-4">
              <button
                type="button"
                onClick={() => setActiveTab("details")}
                className={`border-b-2 py-2.5 px-4 text-xs font-semibold uppercase tracking-wider transition-colors ${
                  activeTab === "details"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                Room Details
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("occupants")}
                className={`border-b-2 py-2.5 px-4 text-xs font-semibold uppercase tracking-wider transition-colors ${
                  activeTab === "occupants"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                Active Occupants ({viewOccupants.length})
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
                Admission History ({viewAdmissions.length})
              </button>
            </div>

            {/* Tab Contents */}
            <div className="py-4">
              {activeTab === "details" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5">
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Room Type / Category
                      </p>
                      <p className="mt-1 text-base font-bold text-slate-900">
                        {viewRoom.type}
                      </p>
                    </div>

                    <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5">
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Daily Charge
                      </p>
                      <p className="mt-1 text-base font-bold text-emerald-600">
                        {formatCurrency(viewRoom.daily_charge)}{" "}
                        <span className="text-xs text-slate-500 font-normal">/ day</span>
                      </p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Configuration Date
                    </p>
                    <p className="mt-1 text-sm font-medium text-slate-800">
                      {formatDate(viewRoom.created_at)}
                    </p>
                  </div>
                </div>
              )}

              {activeTab === "occupants" && (
                <div className="space-y-3">
                  {isLoadingViewHistory ? (
                    <div className="py-8 text-center text-sm text-slate-500">
                      Loading room occupants...
                    </div>
                  ) : viewOccupants.length === 0 ? (
                    <div className="py-8 text-center text-sm text-slate-400">
                      No patient currently occupying this room.
                    </div>
                  ) : (
                    <div className="max-h-60 overflow-y-auto space-y-2">
                      {viewOccupants.map((occ, idx) => (
                        <div
                          key={occ.id || idx}
                          className="rounded-xl border border-slate-100 bg-slate-50/60 p-3 text-xs"
                        >
                          <div className="flex justify-between items-center">
                            <span className="font-semibold text-slate-900">
                              Patient #{occ.patient_id?.slice(0, 8) || occ.patient_name || "Admitted"}
                            </span>
                            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                              {occ.status || "Admitted"}
                            </span>
                          </div>
                          {occ.admission_date && (
                            <p className="text-slate-500 mt-1">
                              Occupying since: {formatDate(occ.admission_date)}
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
                      Loading admission records...
                    </div>
                  ) : viewAdmissions.length === 0 ? (
                    <div className="py-8 text-center text-sm text-slate-400">
                      No historical admission records for this room yet.
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
                              {adm.status || "Completed"}
                            </span>
                          </div>
                          <p className="text-slate-500 mt-1">
                            Period: {formatDate(adm.admission_date)}
                            {adm.discharge_date && ` - ${formatDate(adm.discharge_date)}`}
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
                onClick={() => handleOpenDelete(viewRoom)}
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
                <span>Delete Room</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenEdit(viewRoom)}
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
                  <span>Edit Room</span>
                </button>

                <button
                  type="button"
                  onClick={() => setViewRoom(null)}
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
      {/* Edit Room Modal (PUT /api/rooms/{id}) */}
      {/* ============================================================= */}
      {editRoom && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
        >
          <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl transition-all">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Edit Room Details</h3>
                <p className="text-xs text-slate-500">
                  Update category and daily charge for Room #{editRoom.room_number}.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditRoom(null)}
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
                  Room Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editForm.room_number}
                  onChange={(e) => setEditForm({ ...editForm, room_number: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Room Type / Category <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={editForm.type}
                  onChange={(e) => setEditForm({ ...editForm, type: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                >
                  {ROOM_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Daily Charge (PKR) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                    PKR
                  </span>
                  <input
                    type="number"
                    required
                    min={0}
                    step={100}
                    value={editForm.daily_charge}
                    onChange={(e) =>
                      setEditForm({ ...editForm, daily_charge: Number(e.target.value) })
                    }
                    className="w-full rounded-xl border border-slate-200 py-2 pl-14 pr-3.5 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditRoom(null)}
                  disabled={isUpdating}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  id="submit-edit-room"
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
      {/* Delete Room Modal */}
      <ConfirmDeleteModal
        isOpen={!!deleteTarget}
        title="Delete Room?"
        subtitle="This action cannot be undone."
        description={
          deleteTarget ? (
            <p>
              Are you sure you want to delete{" "}
              <strong className="font-semibold text-slate-900">
                Room #{deleteTarget.room_number}
              </strong>{" "}
              ({deleteTarget.type})? This will remove the room from the hospital registry.
            </p>
          ) : null
        }
        confirmLabel="Delete Room"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
        isDeleting={isDeleting}
        errorMessage={deleteError}
      />
    </div>
  );
}
