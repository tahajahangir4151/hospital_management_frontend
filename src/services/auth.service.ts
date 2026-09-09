import { apiClient } from "@/services/api-client";
import {
  AdminLoginCredentials,
  AdminLoginSuccessResponse,
  AuthUser,
} from "@/types/auth";

const TOKEN_STORAGE_KEY = "hms_admin_token";
const REFRESH_TOKEN_STORAGE_KEY = "hms_admin_refresh_token";
const USER_STORAGE_KEY = "hms_admin_user";

export const authService = {
  /**
   * Dispatches login request to POST /api/auth/login
   */
  async loginAdmin(credentials: AdminLoginCredentials): Promise<AdminLoginSuccessResponse> {
    const response = await apiClient<AdminLoginSuccessResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: credentials.email.trim(),
        password: credentials.password,
      }),
    });

    if (response.success && response.data) {
      this.saveSession(response.data);
    }

    return response;
  },

  /**
   * Persists authentication session in localStorage and cookie
   */
  saveSession(data: AdminLoginSuccessResponse["data"]): void {
    if (typeof window === "undefined") return;

    try {
      localStorage.setItem(TOKEN_STORAGE_KEY, data.session.access_token);
      localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, data.session.refresh_token);
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(data.user));

      // Also set cookie for server / middleware interoperability
      const maxAge = data.session.expires_at
        ? Math.max(0, data.session.expires_at - Math.floor(Date.now() / 1000))
        : 86400;

      document.cookie = `hms_token=${data.session.access_token}; path=/; max-age=${maxAge}; SameSite=Lax`;
    } catch (err) {
      console.error("Failed to store authentication session:", err);
    }
  },

  /**
   * Retrieves active access token
   */
  getStoredToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  },

  /**
   * Retrieves active authenticated admin user details
   */
  getStoredUser(): AuthUser | null {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem(USER_STORAGE_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as AuthUser;
    } catch {
      return null;
    }
  },

  /**
   * Clears all session tokens and cookies
   */
  clearSession(): void {
    if (typeof window === "undefined") return;
    try {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
      localStorage.removeItem(USER_STORAGE_KEY);
      document.cookie = "hms_token=; path=/; max-age=0; SameSite=Lax";
    } catch (err) {
      console.error("Failed to clear authentication session:", err);
    }
  },
};
