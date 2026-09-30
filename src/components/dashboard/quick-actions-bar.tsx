"use client";

import React from "react";
import Link from "next/link";

export function QuickActionsBar() {
  const actions = [
    {
      label: "New Admission",
      href: "/dashboard/admissions",
      description: "Admit inpatient & assign ward",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
        </svg>
      ),
      badgeColor: "bg-indigo-500",
      accent: "hover:border-indigo-300 hover:bg-indigo-50/50 text-indigo-600",
    },
    {
      label: "Add Patient",
      href: "/dashboard/patients",
      description: "Register new medical record",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
      ),
      badgeColor: "bg-blue-500",
      accent: "hover:border-blue-300 hover:bg-blue-50/50 text-blue-600",
    },
    {
      label: "Room Allocation",
      href: "/dashboard/rooms",
      description: "Manage beds & ICU units",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
      badgeColor: "bg-emerald-500",
      accent: "hover:border-emerald-300 hover:bg-emerald-50/50 text-emerald-600",
    },
    {
      label: "Start Treatment",
      href: "/dashboard/treatments",
      description: "Log diagnosis & medication",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-3-3v6m-9 5h18a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
      badgeColor: "bg-amber-500",
      accent: "hover:border-amber-300 hover:bg-amber-50/50 text-amber-600",
    },
    {
      label: "Create Invoice",
      href: "/dashboard/billing",
      description: "Generate patient bill",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l4-2 4 2 4-2 4 2z" />
        </svg>
      ),
      badgeColor: "bg-teal-500",
      accent: "hover:border-teal-300 hover:bg-teal-50/50 text-teal-600",
    },
  ];

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 text-white shadow-xl relative overflow-hidden">
      {/* Background Ambient Glow */}
      <div className="absolute top-0 right-0 -mt-10 -mr-10 h-48 w-48 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/3 -mb-10 h-40 w-40 rounded-full bg-teal-500/15 blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-300">
              Clinical Command Center
            </span>
          </div>
          <h3 className="text-xl font-extrabold tracking-tight text-white">
            Quick Action Dispatch
          </h3>
          <p className="text-xs text-slate-300 max-w-lg mt-0.5">
            Rapid patient triage, bed assignments, clinical protocols, and instant billing generation.
          </p>
        </div>

        {/* Quick Buttons Grid */}
        <div className="flex flex-wrap items-center gap-2.5">
          {actions.map((act) => (
            <Link
              key={act.label}
              href={act.href}
              className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/10 backdrop-blur-md px-3.5 py-2.5 text-xs font-semibold text-white transition-all duration-200 hover:bg-white/20 hover:scale-102 hover:shadow-lg active:scale-98"
            >
              <div className="text-indigo-300">{act.icon}</div>
              <span>{act.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
