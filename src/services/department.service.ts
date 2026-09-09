import { apiClient } from "@/services/api-client";
import {
  Department,
  DepartmentsResponse,
  SingleDepartmentResponse,
  CreateDepartmentDTO,
  UpdateDepartmentDTO,
  DepartmentActionResponse,
} from "@/types/department";

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const DEPARTMENTS_CACHE_KEY = "hms_departments_cache";
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes cache

let memoryCache: CacheEntry<Department[]> | null = null;

function getStoredCache(): Department[] | null {
  // Check memory cache first
  if (memoryCache && Date.now() - memoryCache.timestamp < CACHE_TTL_MS) {
    return memoryCache.data;
  }

  // Fallback check sessionStorage
  if (typeof window !== "undefined") {
    try {
      const raw = sessionStorage.getItem(DEPARTMENTS_CACHE_KEY);
      if (raw) {
        const parsed: CacheEntry<Department[]> = JSON.parse(raw);
        if (Date.now() - parsed.timestamp < CACHE_TTL_MS) {
          memoryCache = parsed;
          return parsed.data;
        }
      }
    } catch {
      // Ignore sessionStorage parsing errors
    }
  }

  return null;
}

function setStoredCache(data: Department[]): void {
  const entry: CacheEntry<Department[]> = {
    data,
    timestamp: Date.now(),
  };
  memoryCache = entry;

  if (typeof window !== "undefined") {
    try {
      sessionStorage.setItem(DEPARTMENTS_CACHE_KEY, JSON.stringify(entry));
    } catch {
      // Ignore sessionStorage errors
    }
  }
}

export const departmentService = {
  /**
   * Synchronously returns cached departments if available and within TTL.
   * Enables instant UI rendering with 0 network delay.
   */
  getCachedDepartments(): Department[] | null {
    return getStoredCache();
  },

  /**
   * Fetches all hospital departments from GET /api/departments.
   * Reuses cache unless forceRefresh is true or TTL expired.
   */
  async getDepartments(forceRefresh = false): Promise<Department[]> {
    if (!forceRefresh) {
      const cached = getStoredCache();
      if (cached !== null) {
        return cached;
      }
    }

    const response = await apiClient<DepartmentsResponse>("/api/departments", {
      method: "GET",
    });

    if (response && Array.isArray(response.data)) {
      setStoredCache(response.data);
      return response.data;
    }

    return [];
  },

  /**
   * Fetches a single department by ID: GET /api/departments/{id}
   */
  async getDepartmentById(id: string): Promise<Department> {
    const response = await apiClient<SingleDepartmentResponse>(`/api/departments/${id}`, {
      method: "GET",
    });

    if (response && response.data) {
      return response.data;
    }

    throw new Error(response.message || "Department not found");
  },

  /**
   * Creates a new department: POST /api/departments
   */
  async createDepartment(dto: CreateDepartmentDTO): Promise<Department> {
    const response = await apiClient<SingleDepartmentResponse>("/api/departments", {
      method: "POST",
      body: JSON.stringify({
        name: dto.name.trim(),
        location: dto.location.trim(),
        contact_number: dto.contact_number.trim(),
      }),
    });

    // Invalidate cache
    departmentService.clearCache();

    if (response && response.data) {
      return response.data;
    }

    throw new Error(response.message || "Failed to create department");
  },

  /**
   * Updates an existing department: PUT /api/departments/{id}
   */
  async updateDepartment(id: string, dto: UpdateDepartmentDTO): Promise<void> {
    const response = await apiClient<DepartmentActionResponse>(`/api/departments/${id}`, {
      method: "PUT",
      body: JSON.stringify({
        name: dto.name.trim(),
        location: dto.location.trim(),
        contact_number: dto.contact_number.trim(),
      }),
    });

    // Invalidate cache
    departmentService.clearCache();

    if (response && response.success === false) {
      throw new Error(response.message || "Failed to update department");
    }
  },

  /**
   * Deletes a department by ID: DELETE /api/departments/{id}
   */
  async deleteDepartment(id: string): Promise<void> {
    const response = await apiClient<DepartmentActionResponse>(`/api/departments/${id}`, {
      method: "DELETE",
    });

    // Invalidate cache
    departmentService.clearCache();

    if (response && response.success === false) {
      throw new Error(response.message || "Failed to delete department");
    }
  },

  /**
   * Explicitly clears the department cache (e.g. after CRUD create/edit/delete or logout)
   */
  clearCache(): void {
    memoryCache = null;
    if (typeof window !== "undefined") {
      try {
        sessionStorage.removeItem(DEPARTMENTS_CACHE_KEY);
      } catch {
        // Ignore
      }
    }
  },
};
