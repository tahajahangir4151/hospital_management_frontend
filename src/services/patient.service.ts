import { apiClient } from "@/services/api-client";
import {
  Patient,
  PatientsResponse,
  SinglePatientResponse,
  CreatePatientDTO,
  UpdatePatientDTO,
  PatientActionResponse,
  PatientTreatment,
  PatientAdmission,
} from "@/types/patient";

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const PATIENTS_CACHE_KEY = "hms_patients_cache";
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes cache

let memoryCache: CacheEntry<Patient[]> | null = null;

function getStoredCache(): Patient[] | null {
  if (memoryCache && Date.now() - memoryCache.timestamp < CACHE_TTL_MS) {
    return memoryCache.data;
  }

  if (typeof window !== "undefined") {
    try {
      const raw = sessionStorage.getItem(PATIENTS_CACHE_KEY);
      if (raw) {
        const parsed: CacheEntry<Patient[]> = JSON.parse(raw);
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

function setStoredCache(data: Patient[]): void {
  const entry: CacheEntry<Patient[]> = {
    data,
    timestamp: Date.now(),
  };
  memoryCache = entry;

  if (typeof window !== "undefined") {
    try {
      sessionStorage.setItem(PATIENTS_CACHE_KEY, JSON.stringify(entry));
    } catch {
      // Ignore sessionStorage errors
    }
  }
}

export const patientService = {
  /**
   * Synchronously returns cached patients if available and within TTL.
   * Enables instant UI rendering with 0 network latency.
   */
  getCachedPatients(): Patient[] | null {
    return getStoredCache();
  },

  /**
   * Fetches all hospital patients: GET /api/patients
   * Uses cache unless forceRefresh is true or TTL expired.
   */
  async getPatients(forceRefresh = false): Promise<Patient[]> {
    if (!forceRefresh) {
      const cached = getStoredCache();
      if (cached !== null) {
        return cached;
      }
    }

    const response = await apiClient<PatientsResponse>("/api/patients", {
      method: "GET",
    });

    if (response && Array.isArray(response.data)) {
      setStoredCache(response.data);
      return response.data;
    }

    return [];
  },

  /**
   * Fetches a single patient by ID: GET /api/patients/{id}
   */
  async getPatientById(id: string): Promise<Patient> {
    const response = await apiClient<SinglePatientResponse>(`/api/patients/${id}`, {
      method: "GET",
    });

    if (response && response.data) {
      return response.data;
    }

    throw new Error(response.message || "Patient not found");
  },

  /**
   * Creates a new patient: POST /api/patients
   */
  async createPatient(dto: CreatePatientDTO): Promise<Patient> {
    const response = await apiClient<SinglePatientResponse>("/api/patients", {
      method: "POST",
      body: JSON.stringify({
        name: dto.name.trim(),
        date_of_birth: dto.date_of_birth.trim(),
        gender: dto.gender.trim(),
        address: dto.address.trim(),
        phone_number: dto.phone_number.trim(),
      }),
    });

    patientService.clearCache();

    if (response && response.data) {
      return response.data;
    }

    throw new Error(response.message || "Failed to create patient");
  },

  /**
   * Updates an existing patient: PUT /api/patients/{id}
   */
  async updatePatient(id: string, dto: UpdatePatientDTO): Promise<Patient> {
    const response = await apiClient<SinglePatientResponse | PatientActionResponse>(
      `/api/patients/${id}`,
      {
        method: "PUT",
        body: JSON.stringify({
          name: dto.name.trim(),
          date_of_birth: dto.date_of_birth.trim(),
          gender: dto.gender.trim(),
          address: dto.address.trim(),
          phone_number: dto.phone_number.trim(),
        }),
      }
    );

    patientService.clearCache();

    if (response && response.data) {
      return response.data;
    }

    if (response && response.success === false) {
      throw new Error(response.message || "Failed to update patient");
    }

    // Return reconstituted patient if data wasn't in response
    return {
      id,
      name: dto.name.trim(),
      date_of_birth: dto.date_of_birth.trim(),
      gender: dto.gender.trim(),
      address: dto.address.trim(),
      phone_number: dto.phone_number.trim(),
      created_at: new Date().toISOString(),
    };
  },

  /**
   * Deletes a patient by ID: DELETE /api/patients/{id}
   */
  async deletePatient(id: string): Promise<void> {
    const response = await apiClient<PatientActionResponse>(`/api/patients/${id}`, {
      method: "DELETE",
    });

    patientService.clearCache();

    if (response && response.success === false) {
      throw new Error(response.message || "Failed to delete patient");
    }
  },

  /**
   * Fetches treatments history of a patient: GET /api/patients/{id}/treatments
   */
  async getPatientTreatments(id: string): Promise<PatientTreatment[]> {
    try {
      const response = await apiClient<{ success: boolean; data: PatientTreatment[] }>(
        `/api/patients/${id}/treatments`,
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
   * Fetches admissions history of a patient: GET /api/patients/{id}/admissions
   */
  async getPatientAdmissions(id: string): Promise<PatientAdmission[]> {
    try {
      const response = await apiClient<{ success: boolean; data: PatientAdmission[] }>(
        `/api/patients/${id}/admissions`,
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
   * Explicitly clears the patient cache
   */
  clearCache(): void {
    memoryCache = null;
    if (typeof window !== "undefined") {
      try {
        sessionStorage.removeItem(PATIENTS_CACHE_KEY);
      } catch {
        // Ignore
      }
    }
  },
};
