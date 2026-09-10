import { apiClient } from "@/services/api-client";
import { roomService } from "@/services/room.service";
import {
  Admission,
  AdmissionsResponse,
  SingleAdmissionResponse,
  AdmitPatientDTO,
  AdmissionActionResponse,
} from "@/types/admission";

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const ADMISSIONS_CACHE_KEY = "hms_admissions_cache";
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes cache

let memoryCache: CacheEntry<Admission[]> | null = null;

function getStoredCache(): Admission[] | null {
  if (memoryCache && Date.now() - memoryCache.timestamp < CACHE_TTL_MS) {
    return memoryCache.data;
  }

  if (typeof window !== "undefined") {
    try {
      const raw = sessionStorage.getItem(ADMISSIONS_CACHE_KEY);
      if (raw) {
        const parsed: CacheEntry<Admission[]> = JSON.parse(raw);
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

function setStoredCache(data: Admission[]): void {
  const entry: CacheEntry<Admission[]> = {
    data,
    timestamp: Date.now(),
  };
  memoryCache = entry;

  if (typeof window !== "undefined") {
    try {
      sessionStorage.setItem(ADMISSIONS_CACHE_KEY, JSON.stringify(entry));
    } catch {
      // Ignore sessionStorage errors
    }
  }
}

export const admissionService = {
  /**
   * Synchronously returns cached admissions if available and within TTL.
   * Enables instant UI rendering with 0 network latency.
   */
  getCachedAdmissions(): Admission[] | null {
    return getStoredCache();
  },

  /**
   * Fetches all hospital admission records: GET /api/admissions
   * Uses cache unless forceRefresh is true or TTL expired.
   */
  async getAdmissions(forceRefresh = false): Promise<Admission[]> {
    if (!forceRefresh) {
      const cached = getStoredCache();
      if (cached !== null) {
        return cached;
      }
    }

    const response = await apiClient<AdmissionsResponse>("/api/admissions", {
      method: "GET",
    });

    if (response && Array.isArray(response.data)) {
      setStoredCache(response.data);
      return response.data;
    }

    return [];
  },

  /**
   * Admits a patient to a room: POST /api/admissions
   */
  async admitPatient(dto: AdmitPatientDTO): Promise<Admission> {
    const payload: Record<string, string> = {
      patient_id: dto.patient_id.trim(),
      room_id: dto.room_id.trim(),
    };

    if (dto.admission_date?.trim()) {
      payload.admission_date = dto.admission_date.trim();
    }

    const response = await apiClient<SingleAdmissionResponse>("/api/admissions", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    admissionService.clearCache();
    roomService.clearCache(); // Invalidate room occupancy cache

    if (response && response.data) {
      return response.data;
    }

    throw new Error(response.message || "Failed to admit patient");
  },

  /**
   * Discharges an active inpatient: PATCH /api/admissions/{id}/discharge
   */
  async dischargePatient(id: string): Promise<Admission> {
    const response = await apiClient<SingleAdmissionResponse | AdmissionActionResponse>(
      `/api/admissions/${id}/discharge`,
      {
        method: "PATCH",
      }
    );

    admissionService.clearCache();
    roomService.clearCache(); // Invalidate room occupancy cache

    if (response && "data" in response && response.data) {
      return response.data;
    }

    if (response && response.success === false) {
      throw new Error(response.message || "Failed to discharge patient");
    }

    return {
      id,
      patient_id: "",
      room_id: "",
      admission_date: new Date().toISOString(),
      discharge_date: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };
  },

  /**
   * Fetches admission history for a specific patient: GET /api/patients/{id}/admissions
   */
  async getAdmissionsByPatientId(patientId: string): Promise<Admission[]> {
    try {
      const response = await apiClient<AdmissionsResponse>(
        `/api/patients/${patientId}/admissions`,
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
   * Fetches admission history for a specific room: GET /api/rooms/{id}/admissions
   */
  async getAdmissionsByRoomId(roomId: string): Promise<Admission[]> {
    try {
      const response = await apiClient<AdmissionsResponse>(
        `/api/rooms/${roomId}/admissions`,
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
   * Explicitly clears the admissions cache
   */
  clearCache(): void {
    memoryCache = null;
    if (typeof window !== "undefined") {
      try {
        sessionStorage.removeItem(ADMISSIONS_CACHE_KEY);
      } catch {
        // Ignore
      }
    }
  },
};
