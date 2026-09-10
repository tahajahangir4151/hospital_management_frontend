import { apiClient } from "@/services/api-client";
import {
  Nurse,
  NursesResponse,
  SingleNurseResponse,
  CreateNurseDTO,
  UpdateNurseDTO,
  NurseActionResponse,
} from "@/types/nurse";

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const NURSES_CACHE_KEY = "hms_nurses_cache";
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes cache

let memoryCache: CacheEntry<Nurse[]> | null = null;

function getStoredCache(): Nurse[] | null {
  if (memoryCache && Date.now() - memoryCache.timestamp < CACHE_TTL_MS) {
    return memoryCache.data;
  }

  if (typeof window !== "undefined") {
    try {
      const raw = sessionStorage.getItem(NURSES_CACHE_KEY);
      if (raw) {
        const parsed: CacheEntry<Nurse[]> = JSON.parse(raw);
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

function setStoredCache(data: Nurse[]): void {
  const entry: CacheEntry<Nurse[]> = {
    data,
    timestamp: Date.now(),
  };
  memoryCache = entry;

  if (typeof window !== "undefined") {
    try {
      sessionStorage.setItem(NURSES_CACHE_KEY, JSON.stringify(entry));
    } catch {
      // Ignore sessionStorage errors
    }
  }
}

export const nurseService = {
  /**
   * Synchronously returns cached nurses if available and within TTL.
   */
  getCachedNurses(): Nurse[] | null {
    return getStoredCache();
  },

  /**
   * Fetches all hospital nurses from GET /api/nurses.
   * Uses cache unless forceRefresh is true or TTL expired.
   */
  async getNurses(forceRefresh = false): Promise<Nurse[]> {
    if (!forceRefresh) {
      const cached = getStoredCache();
      if (cached !== null) {
        return cached;
      }
    }

    const response = await apiClient<NursesResponse>("/api/nurses", {
      method: "GET",
    });

    if (response && Array.isArray(response.data)) {
      setStoredCache(response.data);
      return response.data;
    }

    return [];
  },

  /**
   * Fetches a single nurse by ID: GET /api/nurses/{id}
   */
  async getNurseById(id: string): Promise<Nurse> {
    const response = await apiClient<SingleNurseResponse>(`/api/nurses/${id}`, {
      method: "GET",
    });

    if (response && response.data) {
      return response.data;
    }

    throw new Error(response.message || "Nurse not found");
  },

  /**
   * Creates a new nurse: POST /api/nurses
   */
  async createNurse(dto: CreateNurseDTO): Promise<Nurse> {
    const response = await apiClient<SingleNurseResponse>("/api/nurses", {
      method: "POST",
      body: JSON.stringify({
        name: dto.name.trim(),
        shift_timing: dto.shift_timing.trim(),
        contact_number: dto.contact_number.trim(),
        department_id: dto.department_id.trim(),
      }),
    });

    nurseService.clearCache();

    if (response && response.data) {
      return response.data;
    }

    throw new Error(response.message || "Failed to create nurse");
  },

  /**
   * Updates an existing nurse: PUT /api/nurses/{id}
   */
  async updateNurse(id: string, dto: UpdateNurseDTO): Promise<void> {
    const response = await apiClient<NurseActionResponse>(`/api/nurses/${id}`, {
      method: "PUT",
      body: JSON.stringify({
        name: dto.name.trim(),
        shift_timing: dto.shift_timing.trim(),
        contact_number: dto.contact_number.trim(),
        department_id: dto.department_id.trim(),
      }),
    });

    nurseService.clearCache();

    if (response && response.success === false) {
      throw new Error(response.message || "Failed to update nurse");
    }
  },

  /**
   * Deletes a nurse by ID: DELETE /api/nurses/{id}
   */
  async deleteNurse(id: string): Promise<void> {
    const response = await apiClient<NurseActionResponse>(`/api/nurses/${id}`, {
      method: "DELETE",
    });

    nurseService.clearCache();

    if (response && response.success === false) {
      throw new Error(response.message || "Failed to delete nurse");
    }
  },

  /**
   * Clears nurse cache
   */
  clearCache(): void {
    memoryCache = null;
    if (typeof window !== "undefined") {
      try {
        sessionStorage.removeItem(NURSES_CACHE_KEY);
      } catch {
        // Ignore
      }
    }
  },

  /**
   * Assigns a nurse to a room: POST /api/nurse-room-assignments
   */
  async assignNurseToRoom(dto: { nurse_id: string; room_id: string }) {
    const { nurseRoomAssignmentService } = await import(
      "@/services/nurse-room-assignment.service"
    );
    return nurseRoomAssignmentService.assignNurseToRoom(dto);
  },

  /**
   * Gets all rooms assigned to a nurse: GET /api/nurses/{id}/rooms
   */
  async getNurseRooms(nurseId: string) {
    const { nurseRoomAssignmentService } = await import(
      "@/services/nurse-room-assignment.service"
    );
    return nurseRoomAssignmentService.getNurseRooms(nurseId);
  },
};

