import { apiClient } from "@/services/api-client";
import {
  Bill,
  BillsResponse,
  SingleBillResponse,
  CreateBillDTO,
  UpdateBillDTO,
  BillActionResponse,
} from "@/types/bill";

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const BILLS_CACHE_KEY = "hms_bills_cache";
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes cache

let memoryCache: CacheEntry<Bill[]> | null = null;

function getStoredCache(): Bill[] | null {
  if (memoryCache && Date.now() - memoryCache.timestamp < CACHE_TTL_MS) {
    return memoryCache.data;
  }

  if (typeof window !== "undefined") {
    try {
      const raw = sessionStorage.getItem(BILLS_CACHE_KEY);
      if (raw) {
        const parsed: CacheEntry<Bill[]> = JSON.parse(raw);
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

function setStoredCache(data: Bill[]): void {
  const entry: CacheEntry<Bill[]> = {
    data,
    timestamp: Date.now(),
  };
  memoryCache = entry;

  if (typeof window !== "undefined") {
    try {
      sessionStorage.setItem(BILLS_CACHE_KEY, JSON.stringify(entry));
    } catch {
      // Ignore sessionStorage errors
    }
  }
}

export const billService = {
  /**
   * Synchronously returns cached bills if available and within TTL.
   */
  getCachedBills(): Bill[] | null {
    return getStoredCache();
  },

  /**
   * Fetches all hospital bills: GET /api/bills
   * Uses cache unless forceRefresh is true or TTL expired.
   */
  async getBills(forceRefresh = false): Promise<Bill[]> {
    if (!forceRefresh) {
      const cached = getStoredCache();
      if (cached !== null) {
        return cached;
      }
    }

    const response = await apiClient<BillsResponse>("/api/bills", {
      method: "GET",
    });

    if (response && Array.isArray(response.data)) {
      setStoredCache(response.data);
      return response.data;
    }

    return [];
  },

  /**
   * Fetches a single bill by ID: GET /api/bills/{id}
   */
  async getBillById(id: string): Promise<Bill> {
    const response = await apiClient<SingleBillResponse>(`/api/bills/${id}`, {
      method: "GET",
    });

    if (response && response.data) {
      return response.data;
    }

    throw new Error(response.message || "Bill not found");
  },

  /**
   * Creates a new patient bill: POST /api/bills
   */
  async createBill(dto: CreateBillDTO): Promise<Bill> {
    const response = await apiClient<SingleBillResponse>("/api/bills", {
      method: "POST",
      body: JSON.stringify({
        patient_id: dto.patient_id.trim(),
        total_amount: Number(dto.total_amount),
        payment_status: dto.payment_status.trim().toLowerCase(),
        date_issued: dto.date_issued.trim(),
      }),
    });

    billService.clearCache();

    if (response && response.data) {
      return response.data;
    }

    throw new Error(response.message || "Failed to create patient bill");
  },

  /**
   * Updates an existing bill: PUT /api/bills/{id}
   */
  async updateBill(id: string, dto: UpdateBillDTO): Promise<Bill> {
    const response = await apiClient<SingleBillResponse | BillActionResponse>(
      `/api/bills/${id}`,
      {
        method: "PUT",
        body: JSON.stringify({
          patient_id: dto.patient_id.trim(),
          total_amount: Number(dto.total_amount),
          payment_status: dto.payment_status.trim().toLowerCase(),
          date_issued: dto.date_issued.trim(),
        }),
      }
    );

    billService.clearCache();

    if (response && response.data) {
      return response.data;
    }

    if (response && response.success === false) {
      throw new Error(response.message || "Failed to update bill");
    }

    return {
      id,
      patient_id: dto.patient_id.trim(),
      total_amount: Number(dto.total_amount),
      payment_status: dto.payment_status.trim().toLowerCase(),
      date_issued: dto.date_issued.trim(),
      created_at: new Date().toISOString(),
    };
  },

  /**
   * Deletes a bill by ID: DELETE /api/bills/{id}
   */
  async deleteBill(id: string): Promise<void> {
    const response = await apiClient<BillActionResponse>(`/api/bills/${id}`, {
      method: "DELETE",
    });

    billService.clearCache();

    if (response && response.success === false) {
      throw new Error(response.message || "Failed to delete bill");
    }
  },

  /**
   * Clears bill cache
   */
  clearCache(): void {
    memoryCache = null;
    if (typeof window !== "undefined") {
      try {
        sessionStorage.removeItem(BILLS_CACHE_KEY);
      } catch {
        // Ignore
      }
    }
  },
};
