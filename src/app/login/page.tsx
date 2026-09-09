import type { Metadata } from "next";
import { AdminLoginForm } from "@/features/auth/components/admin-login-form";
import { APP_CONFIG } from "@/constants";

export const metadata: Metadata = {
  title: `Admin Login | ${APP_CONFIG.systemTitle}`,
  description: "Secure login portal for hospital administrators.",
};

export default function LoginPage() {
  return (
    <div className="flex min-h-screen w-full flex-col justify-between bg-slate-50 text-slate-900">
      {/* Top Subtle Brand Bar */}
      <header className="w-full border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex items-center gap-2.5">
            {/* Medical Shield Icon */}
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm">
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
              <span className="text-sm sm:text-base font-semibold text-slate-900 tracking-tight">
                {APP_CONFIG.name}
              </span>
              <span className="hidden sm:inline-block ml-2 text-xs text-slate-500">
                • {APP_CONFIG.systemTitle}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
            <span className="h-2 w-2 rounded-full bg-emerald-600" />
            <span className="hidden sm:inline">Admin System</span> Online
          </div>
        </div>
      </header>

      {/* Main Centered Login Section */}
      <main className="flex flex-1 items-center justify-center px-4 py-8 sm:px-6">
        <div className="w-full max-w-[420px]">
          {/* Card */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
            {/* Header / Branding */}
            <div className="mb-6 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 ring-1 ring-blue-100">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-6 w-6"
                  aria-hidden="true"
                >
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>

              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Welcome back
              </h1>

              <p className="mt-1 text-sm text-slate-600">
                Sign in with your administrative credentials to access the hospital management portal.
              </p>
            </div>

            {/* Login Form */}
            <AdminLoginForm />

            {/* Subtle Security Notice */}
            <div className="mt-6 border-t border-slate-200 pt-4 text-center">
              <p className="text-xs text-slate-500">
                Authorized personnel only. All administrative activities are monitored and logged.
              </p>
            </div>
          </div>

          {/* Help Support Text */}
          <p className="mt-4 text-center text-xs text-slate-500">
            Need access assistance? Contact IT Support at{" "}
            <a
              href={`mailto:${APP_CONFIG.supportEmail}`}
              className="text-blue-600 hover:text-blue-700 underline"
            >
              {APP_CONFIG.supportEmail}
            </a>
          </p>
        </div>
      </main>

      {/* Minimal Footer */}
      <footer className="w-full border-t border-slate-200 bg-white py-3 text-center text-xs text-slate-500">
        © 2026 {APP_CONFIG.name}. All rights reserved.
      </footer>
    </div>
  );
}
