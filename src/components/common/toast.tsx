"use client";

import React from "react";

export interface ToastData {
  id: number;
  type: "success" | "error";
  message: string;
}

export type ToastNotification = ToastData;

export interface ToastProps {
  toast: ToastData | null;
  onClose: () => void;
}

export function Toast({ toast, onClose }: ToastProps) {
  if (!toast) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed top-5 right-5 z-50 flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium shadow-xl transition-all duration-300 animate-in fade-in slide-in-from-top-2 ${
        toast.type === "success"
          ? "bg-emerald-600 text-white shadow-emerald-500/20"
          : "bg-red-600 text-white shadow-red-500/20"
      }`}
    >
      {toast.type === "success" ? (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5 shrink-0"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
            clipRule="evenodd"
          />
        </svg>
      ) : (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5 shrink-0"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
            clipRule="evenodd"
          />
        </svg>
      )}
      <span>{toast.message}</span>
      <button
        type="button"
        onClick={onClose}
        className="ml-2 text-white/80 hover:text-white cursor-pointer"
        aria-label="Close notification"
      >
        &times;
      </button>
    </div>
  );
}
