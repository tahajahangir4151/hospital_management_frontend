"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authService } from "@/services/auth.service";
import { AuthUser } from "@/types/auth";
import { APP_CONFIG } from "@/constants";

export function DashboardHeader() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    const currentUser = authService.getStoredUser();
    setUser(currentUser);
  }, []);

  const handleLogout = () => {
    authService.clearSession();
    router.push("/");
  };

  const displayName = user?.full_name || user?.email?.split("@")[0] || "Admin";

  return (
    <header className="sticky top-0 z-30 w-full border-b border-slate-200 bg-white shadow-xs">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        {/* Left Side: Hospital Branding */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-6 w-6"
              aria-hidden="true"
            >
              <path d="M12 2v20M2 12h20" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold tracking-tight text-slate-900">
                {APP_CONFIG.name}
              </span>
              <span className="hidden rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 sm:inline-block border border-blue-200">
                Admin
              </span>
            </div>
            <p className="text-xs text-slate-500">
              {APP_CONFIG.systemTitle}
            </p>
          </div>
        </div>

        {/* Right Side: Welcome Name, Profile Icon, and Logout Button */}
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Welcome Name */}
          <div className="text-right">
            <p className="text-xs text-slate-500">Welcome,</p>
            <p className="text-sm font-semibold text-slate-900 capitalize">
              {displayName}
            </p>
          </div>

          {/* Profile Icon */}
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-blue-700 font-bold text-sm ring-2 ring-blue-50 shadow-xs">
            {displayName.charAt(0).toUpperCase()}
          </div>

          {/* Logout Button */}
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs sm:text-sm font-medium text-slate-700 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 cursor-pointer"
            aria-label="Logout"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
}
