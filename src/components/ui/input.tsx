import React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  rightSlot?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, id, required, rightSlot, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);
    const errorId = inputId && error ? `${inputId}-error` : undefined;
    const helperId = inputId && helperText && !error ? `${inputId}-helper` : undefined;

    return (
      <div className="w-full space-y-1.5 text-left">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-slate-700 dark:text-slate-200"
          >
            {label}
            {required && <span className="ml-1 text-red-600 dark:text-red-400">*</span>}
          </label>
        )}

        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            required={required}
            aria-invalid={Boolean(error)}
            aria-describedby={errorId || helperId}
            className={cn(
              "w-full rounded-lg border bg-white dark:bg-slate-900/90 px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 transition-colors placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/40",
              error
                ? "border-red-500 dark:border-red-500 focus:border-red-600 dark:focus:border-red-500 focus:ring-red-100 dark:focus:ring-red-950/40"
                : "border-slate-200 dark:border-slate-750 hover:border-slate-300 dark:hover:border-slate-650 focus:border-blue-600 dark:focus:border-blue-500",
              rightSlot ? "pr-11" : "",
              className
            )}
            {...props}
          />
          {rightSlot && (
            <div className="absolute inset-y-0 right-0 flex items-center pr-3">
              {rightSlot}
            </div>
          )}
        </div>

        {error && (
          <p id={errorId} className="text-xs font-medium text-red-600 dark:text-red-400">
            {error}
          </p>
        )}

        {helperText && !error && (
          <p id={helperId} className="text-xs text-slate-500 dark:text-slate-400">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
