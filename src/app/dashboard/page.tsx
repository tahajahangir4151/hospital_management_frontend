"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardHeader } from "@/components/common/dashboard-header";
import { authService } from "@/services/auth.service";
import { AuthUser } from "@/types/auth";
import { APP_CONFIG } from "@/constants";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const token = authService.getStoredToken();
    const currentUser = authService.getStoredUser();

    if (!token) {
      router.replace("/");
      return;
    }

    setUser(currentUser);
    setIsChecking(false);
  }, [router]);

  if (isChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex items-center gap-3 text-sm font-medium text-slate-600">
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
          Loading Admin Portal...
        </div>
      </div>
    );
  }

  const adminName = user?.full_name || user?.email?.split("@")[0] || "Administrator";

  return (
    <div className="flex min-h-screen w-full flex-col bg-slate-50 text-slate-900">
      {/* Top Header */}
      <DashboardHeader />

      {/* Main Dashboard Content */}
      <main className="flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl space-y-6">
          {/* Welcome Banner */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 border border-emerald-200 mb-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                  Authenticated Session
                </span>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                  Welcome, {adminName}
                </h1>
                <p className="mt-1 text-sm text-slate-500">
                  Hospital Management System • Administrative Console
                </p>
              </div>

              <div className="text-xs text-slate-400 sm:text-right">
                <p>Role: <span className="font-semibold text-slate-700 capitalize">{user?.role || "admin"}</span></p>
                <p>Email: <span className="font-mono text-slate-600">{user?.email}</span></p>
              </div>
            </div>
          </div>

          {/* Quick Status Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  System Status
                </p>
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              </div>
              <p className="mt-2 text-xl font-bold text-slate-900">Online & Operational</p>
              <p className="mt-1 text-xs text-slate-500">Connected to Backend API</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Admin Access
                </p>
                <span className="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                  Active
                </span>
              </div>
              <p className="mt-2 text-xl font-bold text-slate-900">Full Administration</p>
              <p className="mt-1 text-xs text-slate-500">Hospital management privileges verified</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Portal Version
                </p>
                <span className="text-xs font-mono text-slate-400">v{APP_CONFIG.version}</span>
              </div>
              <p className="mt-2 text-xl font-bold text-slate-900">{APP_CONFIG.name}</p>
              <p className="mt-1 text-xs text-slate-500">Production Release</p>
            </div>
          </div>
        </div>
      </main>

      {/* Minimal Footer */}
      <footer className="border-t border-slate-200 bg-white py-3 text-center text-xs text-slate-500">
        © 2026 {APP_CONFIG.name}. Authorized Hospital Administration.
      </footer>
    </div>
  );
}
