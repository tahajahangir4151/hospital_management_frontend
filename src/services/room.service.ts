import { apiClient } from "@/services/api-client";
import {
  Room,
  RoomsResponse,
  SingleRoomResponse,
  CreateRoomDTO,
  UpdateRoomDTO,
  RoomActionResponse,
  RoomOccupant,
  RoomAdmission,
} from "@/types/room";

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const ROOMS_CACHE_KEY = "hms_rooms_cache";
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes cache

let memoryCache: CacheEntry<Room[]> | null = null;

function getStoredCache(): Room[] | null {
  if (memoryCache && Date.now() - memoryCache.timestamp < CACHE_TTL_MS) {
    return memoryCache.data;
  }

  if (typeof window !== "undefined") {
    try {
      const raw = sessionStorage.getItem(ROOMS_CACHE_KEY);
      if (raw) {
        const parsed: CacheEntry<Room[]> = JSON.parse(raw);
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

function setStoredCache(data: Room[]): void {
  const entry: CacheEntry<Room[]> = {
    data,
    timestamp: Date.now(),
  };
  memoryCache = entry;

  if (typeof window !== "undefined") {
    try {
      sessionStorage.setItem(ROOMS_CACHE_KEY, JSON.stringify(entry));
    } catch {
      // Ignore sessionStorage errors
    }
  }
}

export const roomService = {
  /**
   * Synchronously returns cached rooms if available and within TTL.
   * Enables instant UI rendering with 0 network latency.
   */
  getCachedRooms(): Room[] | null {
    return getStoredCache();
  },

  /**
   * Fetches all hospital rooms: GET /api/rooms
   * Uses cache unless forceRefresh is true or TTL expired.
   */
  async getRooms(forceRefresh = false): Promise<Room[]> {
    if (!forceRefresh) {
      const cached = getStoredCache();
      if (cached !== null) {
        return cached;
      }
    }

    const response = await apiClient<RoomsResponse>("/api/rooms", {
      method: "GET",
    });

    if (response && Array.isArray(response.data)) {
      setStoredCache(response.data);
      return response.data;
    }

    return [];
  },

  /**
   * Fetches a single room by ID: GET /api/rooms/{id}
   */
  async getRoomById(id: string): Promise<Room> {
    const response = await apiClient<SingleRoomResponse>(`/api/rooms/${id}`, {
      method: "GET",
    });

    if (response && response.data) {
      return response.data;
    }

    throw new Error(response.message || "Room not found");
  },

  /**
   * Creates a new room: POST /api/rooms
   */
  async createRoom(dto: CreateRoomDTO): Promise<Room> {
    const response = await apiClient<SingleRoomResponse>("/api/rooms", {
      method: "POST",
      body: JSON.stringify({
        room_number: dto.room_number.trim(),
        type: dto.type.trim(),
        daily_charge: Number(dto.daily_charge),
      }),
    });

    roomService.clearCache();

    if (response && response.data) {
      return response.data;
    }

    throw new Error(response.message || "Failed to create room");
  },

  /**
   * Updates an existing room: PUT /api/rooms/{id}
   */
  async updateRoom(id: string, dto: UpdateRoomDTO): Promise<Room> {
    const response = await apiClient<SingleRoomResponse | RoomActionResponse>(
      `/api/rooms/${id}`,
      {
        method: "PUT",
        body: JSON.stringify({
          room_number: dto.room_number.trim(),
          type: dto.type.trim(),
          daily_charge: Number(dto.daily_charge),
        }),
      }
    );

    roomService.clearCache();

    if (response && response.data) {
      return response.data;
    }

    if (response && response.success === false) {
      throw new Error(response.message || "Failed to update room");
    }

    // Return reconstituted room if data wasn't returned directly
    return {
      id,
      room_number: dto.room_number.trim(),
      type: dto.type.trim(),
      daily_charge: Number(dto.daily_charge),
      created_at: new Date().toISOString(),
    };
  },

  /**
   * Deletes a room by ID: DELETE /api/rooms/{id}
   */
  async deleteRoom(id: string): Promise<void> {
    const response = await apiClient<RoomActionResponse>(`/api/rooms/${id}`, {
      method: "DELETE",
    });

    roomService.clearCache();

    if (response && response.success === false) {
      throw new Error(response.message || "Failed to delete room");
    }
  },

  /**
   * Fetches current occupants of a room: GET /api/rooms/{id}/occupants
   */
  async getRoomOccupants(id: string): Promise<RoomOccupant[]> {
    try {
      const response = await apiClient<{ success: boolean; data: RoomOccupant[] }>(
        `/api/rooms/${id}/occupants`,
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
   * Fetches admission history of a room: GET /api/rooms/{id}/admissions
   */
  async getRoomAdmissions(id: string): Promise<RoomAdmission[]> {
    try {
      const response = await apiClient<{ success: boolean; data: RoomAdmission[] }>(
        `/api/rooms/${id}/admissions`,
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
   * Explicitly clears the room cache
   */
  clearCache(): void {
    memoryCache = null;
    if (typeof window !== "undefined") {
      try {
        sessionStorage.removeItem(ROOMS_CACHE_KEY);
      } catch {
        // Ignore
      }
    }
  },
};
