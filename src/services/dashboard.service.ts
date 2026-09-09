import { apiClient } from "@/services/api-client";
import { departmentService } from "@/services/department.service";
import { doctorService } from "@/services/doctor.service";
import { nurseService } from "@/services/nurse.service";

export interface DashboardMetrics {
  totalDepartments: number;
  totalDoctors: number;
  totalPatients: number;
  totalRooms: number;
  activeAdmissions: number;
  totalNurses: number;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const METRICS_CACHE_KEY = "hms_dashboard_metrics_cache";
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes cache

let memoryMetricsCache: CacheEntry<DashboardMetrics> | null = null;

function getStoredMetrics(): DashboardMetrics | null {
  if (memoryMetricsCache && Date.now() - memoryMetricsCache.timestamp < CACHE_TTL_MS) {
    return memoryMetricsCache.data;
  }

  if (typeof window !== "undefined") {
    try {
      const raw = sessionStorage.getItem(METRICS_CACHE_KEY);
      if (raw) {
        const parsed: CacheEntry<DashboardMetrics> = JSON.parse(raw);
        if (Date.now() - parsed.timestamp < CACHE_TTL_MS) {
          memoryMetricsCache = parsed;
          return parsed.data;
        }
      }
    } catch {
      // Ignore sessionStorage parsing errors
    }
  }

  return null;
}

function setStoredMetrics(data: DashboardMetrics): void {
  const entry: CacheEntry<DashboardMetrics> = {
    data,
    timestamp: Date.now(),
  };
  memoryMetricsCache = entry;

  if (typeof window !== "undefined") {
    try {
      sessionStorage.setItem(METRICS_CACHE_KEY, JSON.stringify(entry));
    } catch {
      // Ignore sessionStorage errors
    }
  }
}

export const dashboardService = {
  /**
   * Synchronously returns cached dashboard metrics if available.
   */
  getCachedMetrics(): DashboardMetrics | null {
    return getStoredMetrics();
  },

  /**
   * Fetches real counts across modules for the admin dashboard.
   * Reuses cache unless forceRefresh is true or TTL expired.
   */
  async getMetrics(forceRefresh = false): Promise<DashboardMetrics> {
    if (!forceRefresh) {
      const cached = getStoredMetrics();
      if (cached !== null) {
        return cached;
      }
    }

    const results = await Promise.allSettled([
      departmentService.getDepartments(forceRefresh),
      doctorService.getDoctors(forceRefresh),
      apiClient<{ success: boolean; data: unknown[] }>("/api/patients"),
      apiClient<{ success: boolean; data: unknown[] }>("/api/rooms"),
      apiClient<{ success: boolean; data: unknown[] }>("/api/admissions"),
      nurseService.getNurses(forceRefresh),
    ]);

    const getCount = (
      result: PromiseSettledResult<unknown>,
      fallback = 0
    ): number => {
      if (result.status === "fulfilled") {
        const val = result.value;
        if (Array.isArray(val)) return val.length;
        if (
          val &&
          typeof val === "object" &&
          "data" in val &&
          Array.isArray((val as { data: unknown[] }).data)
        ) {
          return (val as { data: unknown[] }).data.length;
        }
      }
      return fallback;
    };

    const metrics: DashboardMetrics = {
      totalDepartments: getCount(results[0], 0),
      totalDoctors: getCount(results[1], 0),
      totalPatients: getCount(results[2], 0),
      totalRooms: getCount(results[3], 0),
      activeAdmissions: getCount(results[4], 0),
      totalNurses: getCount(results[5], 0),
    };

    setStoredMetrics(metrics);
    return metrics;
  },

  /**
   * Clears dashboard metrics cache
   */
  clearCache(): void {
    memoryMetricsCache = null;
    if (typeof window !== "undefined") {
      try {
        sessionStorage.removeItem(METRICS_CACHE_KEY);
      } catch {
        // Ignore
      }
    }
  },
};
