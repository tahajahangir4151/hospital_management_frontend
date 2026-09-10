"use client";

import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { billService } from "@/services/bill.service";
import { patientService } from "@/services/patient.service";
import { Bill, CreateBillDTO, UpdateBillDTO, EnrichedBill } from "@/types/bill";
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

const PAYMENT_STATUSES = [
  { value: "pending", label: "Pending" },
  { value: "paid", label: "Paid" },
  { value: "partially_paid", label: "Partially Paid" },
  { value: "overdue", label: "Overdue" },
] as const;

export default function BillingPage() {
  const cachedBills = billService.getCachedBills();
  const cachedPatients = patientService.getCachedPatients();

  const [bills, setBills] = useState<Bill[]>(() => cachedBills || []);
  const [patients, setPatients] = useState<Patient[]>(() => cachedPatients || []);

  const [isLoading, setIsLoading] = useState(
    () => cachedBills === null || cachedPatients === null
  );
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("newest");

  // Toast notifications
  const [toast, setToast] = useState<ToastData | null>(null);
  const toastSeq = useRef(0);
  const showToast = useCallback((message: string, type: "success" | "error" = "success") => {
    toastSeq.current += 1;
    const id = toastSeq.current;
    setToast({ id, type, message });
    setTimeout(() => {
      setToast((current) => (current?.id === id ? null : current));
    }, 4000);
  }, []);

  // Modals state
  // 1. Create Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateBillDTO>(() => ({
    patient_id: "",
    total_amount: 0,
    payment_status: "pending",
    date_issued: new Date().toISOString().split("T")[0],
  }));
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // 2. Edit Modal
  const [editBill, setEditBill] = useState<EnrichedBill | null>(null);
  const [editForm, setEditForm] = useState<UpdateBillDTO>({
    patient_id: "",
    total_amount: 0,
    payment_status: "pending",
    date_issued: "",
  });
  const [isUpdating, setIsUpdating] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // 3. Delete Modal
  const [deleteTarget, setDeleteTarget] = useState<EnrichedBill | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // 4. View Invoice Receipt Modal
  const [viewInvoice, setViewInvoice] = useState<EnrichedBill | null>(null);

  // Data Fetching
  const loadData = useCallback(async (forceRefresh = false) => {
    if (forceRefresh) {
      setIsRefreshing(true);
    } else if (bills.length === 0) {
      setIsLoading(true);
    }
    setError(null);

    try {
      const [billsData, patientsData] = await Promise.all([
        billService.getBills(forceRefresh),
        patientService.getPatients(forceRefresh),
      ]);
      setBills(billsData);
      setPatients(patientsData);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load billing records.";
      setError(msg);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [bills.length]);

  useEffect(() => {
    let active = true;
    if (!billService.getCachedBills() || !patientService.getCachedPatients()) {
      Promise.all([
        billService.getBills(false),
        patientService.getPatients(false),
      ])
        .then(([billsData, patientsData]) => {
          if (active) {
            setBills(billsData);
            setPatients(patientsData);
            setIsLoading(false);
          }
        })
        .catch((err: unknown) => {
          if (active) {
            const msg = err instanceof Error ? err.message : "Failed to load billing records.";
            setError(msg);
            setIsLoading(false);
          }
        });
    }

    return () => {
      active = false;
    };
  }, []);

  // Patient Map for relational join
  const patientMap = useMemo(() => {
    const map = new Map<string, Patient>();
    patients.forEach((p) => map.set(p.id, p));
    return map;
  }, [patients]);

  // Enriched Bills
  const enrichedBills: EnrichedBill[] = useMemo(() => {
    return bills.map((bill) => {
      const patient = patientMap.get(bill.patient_id);
      return {
        ...bill,
        patient_name: patient?.name || "Unknown Patient",
        patient_phone: patient?.phone_number || "—",
        patient_gender: patient?.gender || "—",
      };
    });
  }, [bills, patientMap]);

  // Filtered & Sorted Bills
  const filteredBills = useMemo(() => {
    const filtered = enrichedBills.filter((bill) => {
      const query = searchQuery.toLowerCase().trim();
      const patientName = bill.patient_name?.toLowerCase() || "";
      const patientPhone = bill.patient_phone?.toLowerCase() || "";
      const billId = bill.id.toLowerCase();
      const dateIssued = bill.date_issued.toLowerCase();

      const matchesSearch =
        !query ||
        patientName.includes(query) ||
        patientPhone.includes(query) ||
        billId.includes(query) ||
        dateIssued.includes(query);

      const matchesStatus =
        statusFilter === "all" ||
        bill.payment_status.toLowerCase() === statusFilter.toLowerCase();

      return matchesSearch && matchesStatus;
    });

    // Sorting
    return filtered.sort((a, b) => {
      if (sortBy === "highest") {
        return Number(b.total_amount) - Number(a.total_amount);
      }
      if (sortBy === "lowest") {
        return Number(a.total_amount) - Number(b.total_amount);
      }
      if (sortBy === "oldest") {
        return new Date(a.date_issued).getTime() - new Date(b.date_issued).getTime();
      }
      // default: newest
      return new Date(b.date_issued).getTime() - new Date(a.date_issued).getTime();
    });
  }, [enrichedBills, searchQuery, statusFilter, sortBy]);

  // Metrics Calculations
  const metrics = useMemo(() => {
    let totalRevenue = 0;
    let paidRevenue = 0;
    let pendingRevenue = 0;
    let paidCount = 0;
    let pendingCount = 0;
    let overdueCount = 0;

    bills.forEach((b) => {
      const amt = Number(b.total_amount) || 0;
      totalRevenue += amt;

      const st = b.payment_status?.toLowerCase();
      if (st === "paid") {
        paidRevenue += amt;
        paidCount += 1;
      } else if (st === "pending") {
        pendingRevenue += amt;
        pendingCount += 1;
      } else if (st === "overdue") {
        overdueCount += 1;
      }
    });

    return {
      totalRevenue,
      paidRevenue,
      pendingRevenue,
      paidCount,
      pendingCount,
      overdueCount,
    };
  }, [bills]);

  // -------------------------------------------------------------
  // Create Bill (POST /api/bills)
  // -------------------------------------------------------------
  const handleOpenCreate = () => {
    setCreateForm({
      patient_id: patients[0]?.id || "",
      total_amount: 1000,
      payment_status: "pending",
      date_issued: new Date().toISOString().split("T")[0],
    });
    setCreateError(null);
    setIsCreateOpen(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.patient_id.trim()) {
      setCreateError("Please select a patient.");
      return;
    }
    if (Number(createForm.total_amount) <= 0) {
      setCreateError("Total amount must be greater than 0.");
      return;
    }

    setIsCreating(true);
    setCreateError(null);

    try {
      const created = await billService.createBill(createForm);
      setBills((prev) => [created, ...prev]);
      setIsCreateOpen(false);
      const patient = patientMap.get(created.patient_id);
      showToast(
        `Invoice for ${patient?.name || "patient"} (PKR ${Number(created.total_amount).toLocaleString()}) created successfully!`,
        "success"
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create patient bill.";
      setCreateError(msg);
    } finally {
      setIsCreating(false);
    }
  };

  // -------------------------------------------------------------
  // Edit Bill (PUT /api/bills/{id})
  // -------------------------------------------------------------
  const handleOpenEdit = (bill: EnrichedBill) => {
    setEditBill(bill);
    setEditForm({
      patient_id: bill.patient_id,
      total_amount: Number(bill.total_amount),
      payment_status: bill.payment_status,
      date_issued: bill.date_issued ? bill.date_issued.split("T")[0] : "",
    });
    setEditError(null);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editBill) return;

    if (!editForm.patient_id.trim()) {
      setEditError("Please select a patient.");
      return;
    }
    if (Number(editForm.total_amount) <= 0) {
      setEditError("Total amount must be greater than 0.");
      return;
    }

    setIsUpdating(true);
    setEditError(null);

    try {
      const updated = await billService.updateBill(editBill.id, editForm);
      setBills((prev) =>
        prev.map((b) => (b.id === editBill.id ? { ...b, ...updated } : b))
      );
      setEditBill(null);
      showToast(`Bill updated successfully!`, "success");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update bill.";
      setEditError(msg);
    } finally {
      setIsUpdating(false);
    }
  };

  // -------------------------------------------------------------
  // Quick Mark as Paid
  // -------------------------------------------------------------
  const handleQuickMarkPaid = async (bill: EnrichedBill) => {
    try {
      await billService.updateBill(bill.id, {
        patient_id: bill.patient_id,
        total_amount: bill.total_amount,
        payment_status: "paid",
        date_issued: bill.date_issued,
      });

      setBills((prev) =>
        prev.map((b) => (b.id === bill.id ? { ...b, payment_status: "paid" } : b))
      );
      showToast(`Invoice marked as PAID.`, "success");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update payment status.";
      showToast(msg, "error");
    }
  };

  // -------------------------------------------------------------
  // Delete Bill (DELETE /api/bills/{id})
  // -------------------------------------------------------------
  const handleOpenDelete = (bill: EnrichedBill) => {
    setDeleteTarget(bill);
    setDeleteError(null);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;

    setIsDeleting(true);
    setDeleteError(null);

    try {
      await billService.deleteBill(deleteTarget.id);
      setBills((prev) => prev.filter((b) => b.id !== deleteTarget.id));
      showToast(`Invoice #${deleteTarget.id.slice(0, 8)} deleted.`, "success");
      setDeleteTarget(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete bill.";
      setDeleteError(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  // -------------------------------------------------------------
  // Status Badge Helper
  // -------------------------------------------------------------
  const renderStatusBadge = (status: string) => {
    const s = status?.toLowerCase() || "";
    if (s === "paid") {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Paid
        </span>
      );
    }
    if (s === "pending") {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 border border-amber-200">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
          Pending
        </span>
      );
    }
    if (s === "partially_paid" || s === "partial") {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-md bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 border border-blue-200">
          <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
          Partially Paid
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 border border-rose-200">
        <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
        {status}
      </span>
    );
  };

  // Currency Formatter (PKR)
  const formatCurrency = (val: number | string) => {
    const num = Number(val) || 0;
    return `PKR ${num.toLocaleString()}`;
  };

  // Date Formatter
  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  // Table Columns
  const columns: ColumnDef<EnrichedBill>[] = [
    {
      header: "Invoice Reference",
      render: (item: EnrichedBill) => (
        <div>
          <span className="font-mono text-xs font-semibold text-slate-900 block">
            INV-{item.id.slice(0, 8).toUpperCase()}
          </span>
          <span className="text-[11px] text-slate-400">
            Issued {formatDate(item.date_issued)}
          </span>
        </div>
      ),
    },
    {
      header: "Patient Name & Contact",
      render: (item: EnrichedBill) => {
        const initial = (item.patient_name || "P").charAt(0).toUpperCase();
        return (
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700 font-bold text-xs ring-2 ring-blue-50">
              {initial}
            </div>
            <div>
              <p className="font-semibold text-slate-900 leading-tight">
                {item.patient_name}
              </p>
              <p className="text-[11px] font-mono text-slate-500 leading-tight mt-0.5">
                {item.patient_phone} • {item.patient_gender}
              </p>
            </div>
          </div>
        );
      },
    },
    {
      header: "Total Amount",
      render: (item: EnrichedBill) => (
        <div>
          <span className="text-sm font-bold text-slate-900 block font-mono">
            {formatCurrency(item.total_amount)}
          </span>
          <span className="text-[11px] text-slate-400">Hospital Bill</span>
        </div>
      ),
    },
    {
      header: "Payment Status",
      render: (item: EnrichedBill) => renderStatusBadge(item.payment_status),
    },
    {
      header: "Actions",
      align: "right",
      render: (item: EnrichedBill) => (
        <div className="inline-flex items-center gap-1.5 justify-end">
          {/* Quick Mark Paid */}
          {item.payment_status.toLowerCase() !== "paid" && (
            <button
              type="button"
              onClick={() => handleQuickMarkPaid(item)}
              className="rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors cursor-pointer"
              title="Mark bill as Paid"
            >
              Mark Paid
            </button>
          )}

          {/* View Receipt */}
          <button
            type="button"
            onClick={() => setViewInvoice(item)}
            className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-500 hover:bg-slate-50 hover:text-blue-600 transition-colors cursor-pointer"
            title="View Invoice Receipt"
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
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </button>

          {/* Edit Bill */}
          <button
            type="button"
            onClick={() => handleOpenEdit(item)}
            className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-500 hover:bg-blue-50 hover:text-blue-600 transition-colors cursor-pointer"
            title="Edit Bill"
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

          {/* Delete Bill */}
          <button
            type="button"
            onClick={() => handleOpenDelete(item)}
            className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors cursor-pointer"
            title="Delete Bill"
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
      ),
    },
  ];

  return (
    <div className="space-y-6 relative">
      {/* Toast Notification */}
      <Toast toast={toast} onClose={() => setToast(null)} />

      {/* Page Header */}
      <PageHeader
        title="Patient Billing & Invoicing"
        subtitle="Generate patient invoices, monitor billing payment statuses, collect fees, and reconcile hospital receivables."
        badge={{
          text: `${bills.length} Invoices`,
          color: "blue",
        }}
        onRefresh={() => loadData(true)}
        isRefreshing={isRefreshing}
        primaryAction={{
          label: "Generate Bill",
          onClick: handleOpenCreate,
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
        <div
          role="alert"
          className="flex items-start justify-between rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          <div>
            <p className="font-semibold">Unable to load billing data</p>
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
        {/* Total Invoiced */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Total Billed Revenue
          </p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-slate-900 font-mono">
              {formatCurrency(metrics.totalRevenue)}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">{bills.length} total generated bills</p>
        </div>

        {/* Collected / Paid */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Collected Revenue
          </p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-emerald-600 font-mono">
              {formatCurrency(metrics.paidRevenue)}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">{metrics.paidCount} paid invoices</p>
        </div>

        {/* Pending Receivables */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Pending Receivables
          </p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-amber-600 font-mono">
              {formatCurrency(metrics.pendingRevenue)}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">{metrics.pendingCount} awaiting payment</p>
        </div>

        {/* Overdue / Actions */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Overdue Accounts
          </p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-rose-600">
              {metrics.overdueCount}
            </span>
            <span className="text-xs text-slate-500 font-medium">Invoices overdue</span>
          </div>
          <p className="mt-1 text-xs text-slate-500">Requires follow-up</p>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="space-y-4">
        {/* Filter Toolbar */}
        <FilterToolbar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Search by patient name, phone, invoice #, or date..."
        >
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-slate-200 bg-slate-50 py-2 px-3 text-xs sm:text-sm text-slate-700 focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
          >
            <option value="all">All Statuses</option>
            {PAYMENT_STATUSES.map((st) => (
              <option key={st.value} value={st.value}>
                {st.label}
              </option>
            ))}
          </select>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="rounded-lg border border-slate-200 bg-slate-50 py-2 px-3 text-xs sm:text-sm text-slate-700 focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="highest">Highest Amount</option>
            <option value="lowest">Lowest Amount</option>
          </select>
        </FilterToolbar>

        {/* Data Table */}
        <DataTable
          columns={columns}
          data={filteredBills}
          keyExtractor={(row) => row.id}
          isLoading={isLoading}
          emptyState={{
            title: "No billing invoices found",
            description:
              searchQuery || statusFilter !== "all"
                ? "Try adjusting your search criteria or status filter."
                : "Generate your first patient bill to start tracking hospital accounts receivable.",
            actionLabel: "+ Generate First Bill",
            onAction: handleOpenCreate,
          }}
          footer={{
            itemCount: filteredBills.length,
            totalCount: enrichedBills.length,
            entityLabel: "invoices",
          }}
        />
      </div>

      {/* ========================================================= */}
      {/* 1. CREATE BILL MODAL (POST /api/bills)                    */}
      {/* ========================================================= */}
      {isCreateOpen && (
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
                      d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Generate Patient Bill</h2>
                  <p className="text-xs text-slate-500">
                    Create a new invoice charge for hospital treatment and services
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
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

            {createError && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              {/* Patient Selection */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                  Select Patient <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={createForm.patient_id}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, patient_id: e.target.value })
                  }
                  className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
                >
                  <option value="" disabled>
                    -- Select Patient --
                  </option>
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (Phone: {p.phone_number})
                    </option>
                  ))}
                </select>
                {createForm.patient_id && (
                  <p className="mt-1 text-[11px] font-mono text-slate-400">
                    Patient ID: {createForm.patient_id}
                  </p>
                )}
              </div>

              {/* Amount & Status Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                    Total Amount (PKR) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    required
                    placeholder="e.g. 25000"
                    value={createForm.total_amount || ""}
                    onChange={(e) =>
                      setCreateForm({
                        ...createForm,
                        total_amount: Number(e.target.value),
                      })
                    }
                    className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                    Payment Status <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={createForm.payment_status}
                    onChange={(e) =>
                      setCreateForm({
                        ...createForm,
                        payment_status: e.target.value,
                      })
                    }
                    className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  >
                    {PAYMENT_STATUSES.map((st) => (
                      <option key={st.value} value={st.value}>
                        {st.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Date Issued */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                  Date Issued <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={createForm.date_issued}
                  onChange={(e) =>
                    setCreateForm({
                      ...createForm,
                      date_issued: e.target.value,
                    })
                  }
                  className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
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
                      Creating Invoice...
                    </>
                  ) : (
                    "Generate Invoice"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. EDIT BILL MODAL (PUT /api/bills/{id})                  */}
      {/* ========================================================= */}
      {editBill && (
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
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Edit Invoice</h2>
                  <p className="text-xs text-slate-500">
                    Update billing charges, issuance date, or payment status
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditBill(null)}
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

            {editError && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                {editError}
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="space-y-4">
              {/* Patient Selection */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                  Patient <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={editForm.patient_id}
                  onChange={(e) =>
                    setEditForm({ ...editForm, patient_id: e.target.value })
                  }
                  className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
                >
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (Phone: {p.phone_number})
                    </option>
                  ))}
                </select>
              </div>

              {/* Amount & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                    Total Amount (PKR) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    required
                    value={editForm.total_amount}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        total_amount: Number(e.target.value),
                      })
                    }
                    className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                    Payment Status <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={editForm.payment_status}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        payment_status: e.target.value,
                      })
                    }
                    className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  >
                    {PAYMENT_STATUSES.map((st) => (
                      <option key={st.value} value={st.value}>
                        {st.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Date Issued */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                  Date Issued <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={editForm.date_issued}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      date_issued: e.target.value,
                    })
                  }
                  className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 mt-6">
                <button
                  type="button"
                  onClick={() => setEditBill(null)}
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
      {/* 3. VIEW INVOICE RECEIPT MODAL                             */}
      {/* ========================================================= */}
      {viewInvoice && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-7 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white font-bold text-sm shadow-xs">
                  HMS
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Hospital Billing Statement</h2>
                  <p className="text-xs text-slate-500">Official Patient Fee Invoice</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewInvoice(null)}
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

            {/* Invoice Content */}
            <div className="py-6 space-y-6 text-sm">
              {/* Top Meta Details */}
              <div className="grid grid-cols-2 gap-4 rounded-xl bg-slate-50 p-4 border border-slate-100">
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                    Invoice Number
                  </span>
                  <span className="font-mono text-sm font-bold text-slate-900">
                    INV-{viewInvoice.id.slice(0, 8).toUpperCase()}
                  </span>
                  <span className="text-[11px] text-slate-500 block mt-0.5">
                    Date: {formatDate(viewInvoice.date_issued)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                    Status
                  </span>
                  <div>{renderStatusBadge(viewInvoice.payment_status)}</div>
                </div>
              </div>

              {/* Billed To Patient Details */}
              <div className="rounded-xl border border-slate-200/80 p-4">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                  Billed To
                </span>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">
                      {viewInvoice.patient_name}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Phone: {viewInvoice.patient_phone} • Gender: {viewInvoice.patient_gender}
                    </p>
                  </div>
                  <div className="text-right font-mono text-xs text-slate-400">
                    ID: {viewInvoice.patient_id.slice(0, 8)}...
                  </div>
                </div>
              </div>

              {/* Itemized Table */}
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-4">Description</th>
                      <th className="py-2.5 px-4 text-center">Department</th>
                      <th className="py-2.5 px-4 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    <tr>
                      <td className="py-3 px-4 font-medium text-slate-900">
                        Hospital Care, Diagnostics & Clinical Treatment
                      </td>
                      <td className="py-3 px-4 text-center text-slate-500">
                        General Ward
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-semibold text-slate-900">
                        {formatCurrency(viewInvoice.total_amount)}
                      </td>
                    </tr>
                  </tbody>
                  <tfoot className="bg-slate-50/80 font-semibold text-slate-900 border-t border-slate-200">
                    <tr>
                      <td colSpan={2} className="py-3 px-4 text-right text-xs uppercase tracking-wider text-slate-500">
                        Total Amount Due:
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-base text-blue-600">
                        {formatCurrency(viewInvoice.total_amount)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
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
                    d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                  />
                </svg>
                <span>Print Invoice</span>
              </button>

              <div className="flex items-center gap-2">
                {viewInvoice.payment_status.toLowerCase() !== "paid" && (
                  <button
                    type="button"
                    onClick={() => {
                      handleQuickMarkPaid(viewInvoice);
                      setViewInvoice((prev) =>
                        prev ? { ...prev, payment_status: "paid" } : null
                      );
                    }}
                    className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 transition-colors cursor-pointer"
                  >
                    Mark as Paid
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setViewInvoice(null)}
                  className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 4. CONFIRM DELETE MODAL (DELETE /api/bills/{id})          */}
      {/* ========================================================= */}
      <ConfirmDeleteModal
        isOpen={!!deleteTarget}
        title="Delete Patient Bill?"
        subtitle="This will permanently delete the invoice from the hospital ledger."
        description={
          deleteTarget ? (
            <div className="space-y-2">
              <p>
                Are you sure you want to delete invoice{" "}
                <strong className="text-slate-900 font-semibold font-mono">
                  INV-{deleteTarget.id.slice(0, 8).toUpperCase()}
                </strong>{" "}
                for patient{" "}
                <strong className="text-slate-900 font-semibold">
                  {deleteTarget.patient_name}
                </strong>{" "}
                amounting to{" "}
                <strong className="text-slate-900 font-semibold">
                  {formatCurrency(deleteTarget.total_amount)}
                </strong>
                ?
              </p>
              <p className="text-xs text-slate-400 font-mono">
                Bill ID: {deleteTarget.id}
              </p>
            </div>
          ) : null
        }
        confirmLabel="Delete Invoice"
        cancelLabel="Cancel"
        isDeleting={isDeleting}
        errorMessage={deleteError}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
