"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authService } from "@/services/auth.service";
import { AdminLoginCredentials, LoginFormErrors } from "@/types/auth";

export function AdminLoginForm() {
  const [formData, setFormData] = useState<AdminLoginCredentials>({
    email: "",
    password: "",
  });

  const [rememberMe, setRememberMe] = useState(false);
  const [errors, setErrors] = useState<LoginFormErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const executeLogin = useCallback(async (creds: AdminLoginCredentials) => {
    setIsLoading(true);
    setErrors({});
    setSuccessMessage(null);

    try {
      const response = await authService.loginAdmin(creds);

      if (response.success && response.data) {
        const adminName = response.data.user.full_name || response.data.user.email;
        setSuccessMessage(`Login successful! Welcome, ${adminName}. Redirecting...`);
        setErrors({});

        // Use direct navigation to guarantee clean session initialization
        window.location.href = "/dashboard";
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "Unable to sign in. Please verify your connection to the server.";

      setErrors({
        general: message,
      });
      setIsLoading(false);
    }
  }, []);

  // Clean any query parameters left in the URL bar from previous attempts
  useEffect(() => {
    if (typeof window !== "undefined" && window.location.search) {
      const params = new URLSearchParams(window.location.search);
      const emailParam = params.get("email");
      const passwordParam = params.get("password");

      // Strip query parameters from URL history immediately
      window.history.replaceState({}, document.title, window.location.pathname);

      if (emailParam || passwordParam) {
        const creds: AdminLoginCredentials = {
          email: emailParam || "",
          password: passwordParam || "",
        };
        setFormData(creds);

        if (creds.email && creds.password) {
          executeLogin(creds);
        }
      }
    }
  }, [executeLogin]);

  const validateForm = (): boolean => {
    const newErrors: LoginFormErrors = {};

    if (!formData.email.trim()) {
      newErrors.email = "Email address is required.";
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email.trim())) {
        newErrors.email = "Please enter a valid administrative email address.";
      }
    }

    if (!formData.password) {
      newErrors.password = "Password is required.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (field: keyof AdminLoginCredentials, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    if (errors[field as keyof LoginFormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined, general: undefined }));
    }
  };

  const handleLogin = async () => {
    if (isLoading) return;

    if (!validateForm()) {
      return;
    }

    await executeLogin(formData);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleLogin();
    }
  };

  return (
    <div onKeyDown={handleKeyDown} className="space-y-4 text-left">
      {/* Backend Error Alert */}
      {errors.general && (
        <div
          role="alert"
          aria-live="polite"
          className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3.5 text-sm text-red-600"
        >
          <svg
            className="h-5 w-5 shrink-0 text-red-600 mt-0.5"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
              clipRule="evenodd"
            />
          </svg>
          <span className="font-medium">{errors.general}</span>
        </div>
      )}

      {/* Backend Success Alert */}
      {successMessage && (
        <div
          role="status"
          className="flex items-start gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50 p-3.5 text-sm text-emerald-700"
        >
          <svg
            className="h-5 w-5 shrink-0 text-emerald-600 mt-0.5"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
              clipRule="evenodd"
            />
          </svg>
          <span className="font-medium">{successMessage}</span>
        </div>
      )}

      {/* Email Input */}
      <Input
        id="admin-email"
        type="email"
        label="Admin Email"
        placeholder="admin@gmail.com"
        autoComplete="email"
        required
        disabled={isLoading}
        value={formData.email}
        onChange={(e) => handleChange("email", e.target.value)}
        error={errors.email}
      />

      {/* Password Input */}
      <Input
        id="admin-password"
        type={showPassword ? "text" : "password"}
        label="Password"
        placeholder="••••••••"
        autoComplete="current-password"
        required
        disabled={isLoading}
        value={formData.password}
        onChange={(e) => handleChange("password", e.target.value)}
        error={errors.password}
        rightSlot={
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="flex h-9 w-9 items-center justify-center rounded-md text-slate-500 hover:text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? (
              // Eye-off icon
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.8}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18"
                />
              </svg>
            ) : (
              // Eye icon
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.8}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
              </svg>
            )}
          </button>
        }
      />

      {/* Remember Me Option */}
      <div className="flex items-center justify-between pt-1">
        <label
          htmlFor="remember-device"
          className="flex items-center gap-2 cursor-pointer select-none"
        >
          <input
            id="remember-device"
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            disabled={isLoading}
            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600 cursor-pointer"
          />
          <span className="text-sm text-slate-600">Remember this device</span>
        </label>
      </div>

      {/* Submit Button */}
      <div className="pt-2">
        <Button
          type="button"
          onClick={handleLogin}
          variant="primary"
          size="lg"
          isLoading={isLoading}
          disabled={isLoading}
          className="w-full text-base font-semibold"
        >
          Sign In
        </Button>
      </div>
    </div>
  );
}
