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
  const [showNotifications, setShowNotifications] = useState(false);
  const [currentTime, setCurrentTime] = useState("");

  useEffect(() => {
    const currentUser = authService.getStoredUser();
    setUser(currentUser);

    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
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
    if (pathname.includes("/rooms")) return "Rooms & Wards";
    if (pathname.includes("/admissions")) return "Admissions";
    if (pathname.includes("/treatments")) return "Treatments";
    if (pathname.includes("/nurse-assignments")) return "Nurse Assignments";
    if (pathname.includes("/billing")) return "Billing & Invoices";
    return "Dashboard";
  };

  const adminName = user?.full_name || user?.email?.split("@")[0] || "Hospital Admin";
  const initial = adminName.charAt(0).toUpperCase();

  const mockAlerts = [
    { id: 1, title: "ICU Bed #102 occupied", time: "2m ago", type: "warning" },
    { id: 2, title: "Emergency Triage intake", time: "14m ago", type: "critical" },
    { id: 3, title: "Dr. Robert completed surgery", time: "38m ago", type: "success" },
  ];

  return (
    <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between border-b border-slate-200/80 bg-white/85 px-4 sm:px-6 lg:px-8 backdrop-blur-md transition-all">
      {/* Left: Mobile Nav Button + Dynamic Page Title */}
      <div className="flex items-center gap-3 sm:gap-4">
        <button
          type="button"
          onClick={onOpenMobile}
          className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-600 lg:hidden cursor-pointer"
          aria-label="Open mobile navigation"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <div className="flex items-center gap-2.5">
          <h1 className="text-lg sm:text-xl font-extrabold tracking-tight text-slate-900">
            {getPageTitle()}
          </h1>
          <span className="hidden md:inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700 border border-indigo-100">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse" />
            Live Sync
          </span>
        </div>
      </div>

      {/* Middle: Sleek Search Bar with Keyboard Shortcut */}
      <div className="hidden md:flex flex-1 max-w-md mx-6">
        <div className="relative w-full">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search patients, medical records, doctors..."
            className="w-full rounded-xl border border-slate-200/90 bg-slate-50/70 py-1.5 pl-9 pr-12 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all shadow-2xs"
          />
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5">
            <kbd className="hidden sm:inline-block rounded border border-slate-200 bg-white px-1.5 text-[10px] font-semibold text-slate-400 shadow-2xs">
              ⌘K
            </kbd>
          </div>
        </div>
      </div>

      {/* Right Controls: Live Clock, Notifications, Profile Pill & Sign Out */}
      <div className="flex items-center gap-3">
        {/* Live Clock */}
        {currentTime && (
          <div className="hidden xl:flex items-center gap-1.5 rounded-xl border border-slate-200/80 bg-slate-50/60 px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-2xs">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse-emerald" />
            <span>{currentTime}</span>
          </div>
        )}

        {/* Interactive Notifications Bell */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200/80 bg-white text-slate-600 hover:bg-slate-50 hover:text-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all cursor-pointer shadow-2xs"
            aria-label="View alerts"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.9}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white shadow-xs">
              3
            </span>
          </button>

          {/* Notifications Dropdown Modal */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl z-50 animate-fade-in">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
                <span className="text-xs font-bold text-slate-900">Hospital Alerts</span>
                <span className="text-[10px] font-semibold text-indigo-600 hover:underline cursor-pointer">
                  Mark all read
                </span>
              </div>
              <div className="space-y-1.5">
                {mockAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="flex items-start gap-2.5 p-2 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <span
                      className={`mt-1 h-2 w-2 rounded-full shrink-0 ${
                        alert.type === "critical"
                          ? "bg-rose-500 animate-ping"
                          : alert.type === "warning"
                          ? "bg-amber-500"
                          : "bg-emerald-500"
                      }`}
                    />
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-slate-800 leading-tight">
                        {alert.title}
                      </p>
                      <span className="text-[10px] text-slate-400">{alert.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Admin Profile Pill */}
        <div className="flex items-center gap-2.5 pl-1">
          <div className="hidden sm:block text-right">
            <p className="text-xs font-bold text-slate-900 capitalize leading-tight">
              {adminName}
            </p>
            <p className="text-[10px] text-emerald-600 font-semibold leading-tight flex items-center justify-end gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Online
            </p>
          </div>

          <div
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-600 text-white font-extrabold text-xs shadow-md shadow-indigo-600/20 ring-2 ring-indigo-100 shrink-0"
            title={adminName}
          >
            {initial}
          </div>
        </div>

        <div className="h-6 w-px bg-slate-200 hidden sm:block" />

        {/* Sign Out Button */}
        <button
          type="button"
          onClick={handleLogout}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200/80 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-all cursor-pointer shadow-2xs"
          title="Sign out of administration"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span className="hidden sm:inline">Sign Out</span>
        </button>
      </div>
    </header>
  );
}
