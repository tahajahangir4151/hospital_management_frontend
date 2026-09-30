import type { Metadata } from "next";
import { AdminLoginForm } from "@/features/auth/components/admin-login-form";
import { APP_CONFIG } from "@/constants";

export const metadata: Metadata = {
  title: `Admin Login | ${APP_CONFIG.systemTitle}`,
  description: "Secure login portal for hospital administrators.",
};

export default function HomePage() {
  return (
    <div className="relative flex min-h-screen w-full flex-col justify-between bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors overflow-hidden">
      {/* Dynamic Background Glows */}
      <div className="pointer-events-none absolute -top-40 -left-40 h-96 w-96 rounded-full bg-blue-500/10 dark:bg-blue-600/15 blur-3xl" />
      <div className="pointer-events-none absolute top-1/2 -right-40 h-96 w-96 rounded-full bg-teal-500/10 dark:bg-teal-500/10 blur-3xl" />

      {/* Top Subtle Brand Bar */}
      <header className="relative z-10 w-full border-b border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex items-center gap-2.5">
            {/* Medical Shield Icon */}
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-500/25">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5"
                aria-hidden="true"
              >
                <path d="M12 2v20M2 12h20" />
              </svg>
            </div>
            <div>
              <span className="text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-tight">
                {APP_CONFIG.name}
              </span>
              <span className="hidden sm:inline-block ml-2 text-xs text-slate-500 dark:text-slate-400">
                • {APP_CONFIG.systemTitle}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 rounded-full border border-slate-200/80 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Admin Gateway Online</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Centered Login Section */}
      <main className="relative z-10 flex flex-1 items-center justify-center px-4 py-10 sm:px-6">
        <div className="w-full max-w-[430px]">
          {/* Card */}
          <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl p-6 sm:p-8 shadow-xl shadow-slate-200/50 dark:shadow-black/40">
            {/* Header / Branding */}
            <div className="mb-6 text-center">
              <div className="mx-auto mb-3.5 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 ring-1 ring-blue-100 dark:ring-blue-800/40 shadow-xs">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-7 w-7"
                  aria-hidden="true"
                >
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>

              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Welcome back
              </h1>

              <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
                Sign in with your administrative credentials to access the hospital management portal.
              </p>
            </div>

            {/* Login Form */}
            <AdminLoginForm />

            {/* Subtle Security Notice */}
            <div className="mt-6 border-t border-slate-100 dark:border-slate-800 pt-4 text-center">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Authorized personnel only. All administrative activities are monitored and logged.
              </p>
            </div>
          </div>

          {/* Help Support Text */}
          <p className="mt-4 text-center text-xs text-slate-500 dark:text-slate-400">
            Need access assistance? Contact IT Support at{" "}
            <a
              href={`mailto:${APP_CONFIG.supportEmail}`}
              className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
            >
              {APP_CONFIG.supportEmail}
            </a>
          </p>
        </div>
      </main>

      {/* Minimal Footer */}
      <footer className="relative z-10 w-full border-t border-slate-200/80 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xs py-3.5 text-center text-xs text-slate-500 dark:text-slate-400">
        © 2026 {APP_CONFIG.name}. All rights reserved.
      </footer>
    </div>
  );
}
