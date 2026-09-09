"use client";

import React, { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { authService } from "@/services/auth.service";
import { AuthUser } from "@/types/auth";

interface TopbarProps {
  onOpenMobile: () => void;
  title?: string;
}

export function Topbar({ onOpenMobile, title }: TopbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    const currentUser = authService.getStoredUser();
    setUser(currentUser);
  }, []);

  const handleLogout = () => {
    authService.clearSession();
    router.push("/");
  };

  const getPageTitle = () => {
    if (title) return title;
    if (pathname.includes("/departments")) return "Departments";
    if (pathname.includes("/doctors")) return "Doctors";
    if (pathname.includes("/patients")) return "Patients";
    if (pathname.includes("/nurses")) return "Nurses";
    if (pathname.includes("/rooms")) return "Rooms";
    if (pathname.includes("/admissions")) return "Admissions";
    if (pathname.includes("/treatments")) return "Treatments";
    if (pathname.includes("/nurse-assignments")) return "Nurse Assignments";
    if (pathname.includes("/billing")) return "Billing";
    return "Dashboard";
  };

  const adminName = user?.full_name || user?.email?.split("@")[0] || "Hospital Admin";
  const initial = adminName.charAt(0).toUpperCase();

  return (
    <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6 lg:px-8">
      {/* Left: Hamburger (mobile) + Page Title */}
      <div className="flex items-center gap-3 sm:gap-4">
        <button
          type="button"
          onClick={onOpenMobile}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600 lg:hidden cursor-pointer"
          aria-label="Open mobile navigation"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <div>
          <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900">
            {getPageTitle()}
          </h1>
        </div>
      </div>

      {/* Middle: Compact Search UI */}
      <div className="hidden md:flex flex-1 max-w-md mx-6">
        <div className="relative w-full">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 text-slate-400"
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
            placeholder="Search records, patients, doctors..."
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-9 pr-4 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 transition-colors"
          />
        </div>
      </div>

      {/* Right: Admin Profile Area & Logout */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-3 text-right">
          <div className="hidden sm:block">
            <p className="text-sm font-semibold text-slate-900 capitalize leading-tight">
              {adminName}
            </p>
            <p className="text-xs text-slate-500 font-medium leading-tight">
              Administrator
            </p>
          </div>

          <div
            className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-blue-700 font-bold text-sm ring-2 ring-blue-50 shrink-0"
            title={adminName}
          >
            {initial}
          </div>
        </div>

        <div className="h-6 w-px bg-slate-200 hidden sm:block" />

        <button
          type="button"
          onClick={handleLogout}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors cursor-pointer"
          title="Sign out of administration"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.8}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
            />
          </svg>
          <span className="hidden sm:inline">Sign Out</span>
        </button>
      </div>
    </header>
  );
}
