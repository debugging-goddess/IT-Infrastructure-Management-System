import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { auditApi } from "@/api";

export const AUDIT_KEYS = {
  all:  ["audit-logs"] as const,
  list: (params: Record<string, unknown>) => ["audit-logs", "list", params] as const,
};

export function useAuditLogs(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: AUDIT_KEYS.list(params ?? {}),
    queryFn: () => auditApi.list(params),
    placeholderData: keepPreviousData, // smooth pagination/filtering
  });
}
