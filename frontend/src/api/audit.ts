import { apiClient } from "./client";
import type { AuditLog } from "@/types";
import type { PaginatedResponse } from "@/types";

export const auditApi = {
  list: (params?: Record<string, unknown>) =>
    apiClient
      .get<PaginatedResponse<AuditLog>>("/audit-logs/", { params })
      .then((r) => r.data),
  get: (id: number) =>
    apiClient.get<AuditLog>(`/audit-logs/${id}/`).then((r) => r.data),
};
