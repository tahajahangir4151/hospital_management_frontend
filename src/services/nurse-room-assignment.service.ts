import { apiClient } from "@/services/api-client";
import { Room } from "@/types/room";
import {
  NurseRoomAssignment,
  AssignNurseToRoomDTO,
  NurseRoomAssignmentResponse,
  NurseRoomsResponse,
} from "@/types/nurse-room-assignment";

export const nurseRoomAssignmentService = {
  /**
   * Assigns a nurse to a room: POST /api/nurse-room-assignments
   * Request body: { nurse_id: string, room_id: string }
   */
  async assignNurseToRoom(dto: AssignNurseToRoomDTO): Promise<NurseRoomAssignment> {
    const response = await apiClient<NurseRoomAssignmentResponse>(
      "/api/nurse-room-assignments",
      {
        method: "POST",
        body: JSON.stringify({
          nurse_id: dto.nurse_id.trim(),
          room_id: dto.room_id.trim(),
        }),
      }
    );

    if (response && response.data) {
      return response.data;
    }

    throw new Error(response.message || "Failed to assign nurse to room");
  },

  /**
   * Fetches all rooms assigned to a nurse: GET /api/nurses/{id}/rooms
   */
  async getNurseRooms(nurseId: string): Promise<Room[]> {
    if (!nurseId) return [];

    try {
      const response = await apiClient<NurseRoomsResponse>(
        `/api/nurses/${nurseId}/rooms`,
        {
          method: "GET",
        }
      );

      if (response && Array.isArray(response.data)) {
        return response.data;
      }

      return [];
    } catch (error) {
      // Return empty array if nurse has no assigned rooms or not found
      console.warn(`Could not fetch rooms for nurse ${nurseId}:`, error);
      return [];
    }
  },
};
