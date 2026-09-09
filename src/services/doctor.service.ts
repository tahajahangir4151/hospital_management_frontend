import { apiClient } from "@/services/api-client";
import {
  Doctor,
  DoctorsResponse,
  SingleDoctorResponse,
  CreateDoctorDTO,
  UpdateDoctorDTO,
  DoctorActionResponse,
} from "@/types/doctor";

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const DOCTORS_CACHE_KEY = "hms_doctors_cache";
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes cache

let memoryCache: CacheEntry<Doctor[]> | null = null;

function getStoredCache(): Doctor[] | null {
  if (memoryCache && Date.now() - memoryCache.timestamp < CACHE_TTL_MS) {
    return memoryCache.data;
  }

  if (typeof window !== "undefined") {
    try {
      const raw = sessionStorage.getItem(DOCTORS_CACHE_KEY);
      if (raw) {
        const parsed: CacheEntry<Doctor[]> = JSON.parse(raw);
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

function setStoredCache(data: Doctor[]): void {
  const entry: CacheEntry<Doctor[]> = {
    data,
    timestamp: Date.now(),
  };
  memoryCache = entry;

  if (typeof window !== "undefined") {
    try {
      sessionStorage.setItem(DOCTORS_CACHE_KEY, JSON.stringify(entry));
    } catch {
      // Ignore sessionStorage errors
    }
  }
}

export const doctorService = {
  /**
   * Synchronously returns cached doctors if available and within TTL.
   */
  getCachedDoctors(): Doctor[] | null {
    return getStoredCache();
  },

  /**
   * Fetches all hospital doctors from GET /api/doctors.
   * Uses cache unless forceRefresh is true or TTL expired.
   */
  async getDoctors(forceRefresh = false): Promise<Doctor[]> {
    if (!forceRefresh) {
      const cached = getStoredCache();
      if (cached !== null) {
        return cached;
      }
    }

    const response = await apiClient<DoctorsResponse>("/api/doctors", {
      method: "GET",
    });

    if (response && Array.isArray(response.data)) {
      setStoredCache(response.data);
      return response.data;
    }

    return [];
  },

  /**
   * Fetches a single doctor by ID: GET /api/doctors/{id}
   */
  async getDoctorById(id: string): Promise<Doctor> {
    const response = await apiClient<SingleDoctorResponse>(`/api/doctors/${id}`, {
      method: "GET",
    });

    if (response && response.data) {
      return response.data;
    }

    throw new Error(response.message || "Doctor not found");
  },

  /**
   * Creates a new doctor: POST /api/doctors
   */
  async createDoctor(dto: CreateDoctorDTO): Promise<Doctor> {
    const response = await apiClient<SingleDoctorResponse>("/api/doctors", {
      method: "POST",
      body: JSON.stringify({
        full_name: dto.full_name.trim(),
        specialization: dto.specialization.trim(),
        years_of_experience: Number(dto.years_of_experience),
        contact_number: dto.contact_number.trim(),
        department_id: dto.department_id.trim(),
      }),
    });

    doctorService.clearCache();

    if (response && response.data) {
      return response.data;
    }

    throw new Error(response.message || "Failed to create doctor");
  },

  /**
   * Updates an existing doctor: PUT /api/doctors/{id}
   */
  async updateDoctor(id: string, dto: UpdateDoctorDTO): Promise<void> {
    const response = await apiClient<DoctorActionResponse>(`/api/doctors/${id}`, {
      method: "PUT",
      body: JSON.stringify({
        full_name: dto.full_name.trim(),
        specialization: dto.specialization.trim(),
        years_of_experience: Number(dto.years_of_experience),
        contact_number: dto.contact_number.trim(),
        department_id: dto.department_id.trim(),
      }),
    });

    doctorService.clearCache();

    if (response && response.success === false) {
      throw new Error(response.message || "Failed to update doctor");
    }
  },

  /**
   * Deletes a doctor by ID: DELETE /api/doctors/{id}
   */
  async deleteDoctor(id: string): Promise<void> {
    const response = await apiClient<DoctorActionResponse>(`/api/doctors/${id}`, {
      method: "DELETE",
    });

    doctorService.clearCache();

    if (response && response.success === false) {
      throw new Error(response.message || "Failed to delete doctor");
    }
  },

  /**
   * Fetches treatments performed by a doctor: GET /api/doctors/{id}/treatments
   */
  async getDoctorTreatments(id: string): Promise<unknown[]> {
    try {
      const response = await apiClient<{ success: boolean; data: unknown[] }>(
        `/api/doctors/${id}/treatments`,
        { method: "GET" }
      );
      if (response && Array.isArray(response.data)) {
        return response.data;
      }
      return [];
    } catch {
      return [];
    }
  },

  /**
   * Explicitly clears the doctor cache
   */
  clearCache(): void {
    memoryCache = null;
    if (typeof window !== "undefined") {
      try {
        sessionStorage.removeItem(DOCTORS_CACHE_KEY);
      } catch {
        // Ignore
      }
    }
  },
};
