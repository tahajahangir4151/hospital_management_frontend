import { apiClient } from "@/services/api-client";
import {
  Treatment,
  TreatmentsResponse,
  SingleTreatmentResponse,
  CreateTreatmentDTO,
  UpdateTreatmentDTO,
  TreatmentActionResponse,
} from "@/types/treatment";

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const TREATMENTS_CACHE_KEY = "hms_treatments_cache";
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes cache

let memoryCache: CacheEntry<Treatment[]> | null = null;

function getStoredCache(): Treatment[] | null {
  if (memoryCache && Date.now() - memoryCache.timestamp < CACHE_TTL_MS) {
    return memoryCache.data;
  }

  if (typeof window !== "undefined") {
    try {
      const raw = sessionStorage.getItem(TREATMENTS_CACHE_KEY);
      if (raw) {
        const parsed: CacheEntry<Treatment[]> = JSON.parse(raw);
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

function setStoredCache(data: Treatment[]): void {
  const entry: CacheEntry<Treatment[]> = {
    data,
    timestamp: Date.now(),
  };
  memoryCache = entry;

  if (typeof window !== "undefined") {
    try {
      sessionStorage.setItem(TREATMENTS_CACHE_KEY, JSON.stringify(entry));
    } catch {
      // Ignore sessionStorage errors
    }
  }
}

export const treatmentService = {
  /**
   * Synchronously returns cached treatments if available and within TTL.
   */
  getCachedTreatments(): Treatment[] | null {
    return getStoredCache();
  },

  /**
   * Fetches all hospital treatments: GET /api/treatments
   * Uses cache unless forceRefresh is true or TTL expired.
   */
  async getTreatments(forceRefresh = false): Promise<Treatment[]> {
    if (!forceRefresh) {
      const cached = getStoredCache();
      if (cached !== null) {
        return cached;
      }
    }

    const response = await apiClient<TreatmentsResponse>("/api/treatments", {
      method: "GET",
    });

    if (response && Array.isArray(response.data)) {
      setStoredCache(response.data);
      return response.data;
    }

    return [];
  },

  /**
   * Fetches a single treatment by ID: GET /api/treatments/{id}
   */
  async getTreatmentById(id: string): Promise<Treatment> {
    const response = await apiClient<SingleTreatmentResponse>(`/api/treatments/${id}`, {
      method: "GET",
    });

    if (response && response.data) {
      return response.data;
    }

    throw new Error(response.message || "Treatment not found");
  },

  /**
   * Creates a new treatment: POST /api/treatments
   */
  async createTreatment(dto: CreateTreatmentDTO): Promise<Treatment> {
    const response = await apiClient<SingleTreatmentResponse>("/api/treatments", {
      method: "POST",
      body: JSON.stringify({
        doctor_id: dto.doctor_id.trim(),
        patient_id: dto.patient_id.trim(),
        treatment_date: dto.treatment_date.trim(),
        diagnosis: dto.diagnosis.trim(),
        medication: dto.medication?.trim() || "",
      }),
    });

    treatmentService.clearCache();

    if (response && response.data) {
      return response.data;
    }

    throw new Error(response.message || "Failed to create treatment");
  },

  /**
   * Updates an existing treatment: PUT /api/treatments/{id}
   */
  async updateTreatment(id: string, dto: UpdateTreatmentDTO): Promise<Treatment> {
    const response = await apiClient<SingleTreatmentResponse | TreatmentActionResponse>(
      `/api/treatments/${id}`,
      {
        method: "PUT",
        body: JSON.stringify({
          doctor_id: dto.doctor_id.trim(),
          patient_id: dto.patient_id.trim(),
          treatment_date: dto.treatment_date.trim(),
          diagnosis: dto.diagnosis.trim(),
          medication: dto.medication?.trim() || "",
        }),
      }
    );

    treatmentService.clearCache();

    if (response && response.data) {
      return response.data;
    }

    if (response && response.success === false) {
      throw new Error(response.message || "Failed to update treatment");
    }

    return {
      id,
      doctor_id: dto.doctor_id.trim(),
      patient_id: dto.patient_id.trim(),
      treatment_date: dto.treatment_date.trim(),
      diagnosis: dto.diagnosis.trim(),
      medication: dto.medication?.trim() || null,
      created_at: new Date().toISOString(),
    };
  },

  /**
   * Deletes a treatment by ID: DELETE /api/treatments/{id}
   */
  async deleteTreatment(id: string): Promise<void> {
    const response = await apiClient<TreatmentActionResponse>(`/api/treatments/${id}`, {
      method: "DELETE",
    });

    treatmentService.clearCache();

    if (response && response.success === false) {
      throw new Error(response.message || "Failed to delete treatment");
    }
  },

  /**
   * Explicitly clears the treatments cache
   */
  clearCache(): void {
    memoryCache = null;
    if (typeof window !== "undefined") {
      try {
        sessionStorage.removeItem(TREATMENTS_CACHE_KEY);
      } catch {
        // Ignore
      }
    }
  },
};
