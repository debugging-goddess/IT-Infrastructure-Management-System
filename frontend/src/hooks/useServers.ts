import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { serversApi } from "@/api";
import type { ServerFormData } from "@/types";

export const SERVER_KEYS = {
  all:    ["servers"] as const,
  list:   (params: Record<string, unknown>) => ["servers", "list", params] as const,
  detail: (id: number) => ["servers", id] as const,
};

export function useServers(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: SERVER_KEYS.list(params ?? {}),
    queryFn: () => serversApi.list(params),
  });
}

export function useServer(id: number | null) {
  return useQuery({
    queryKey: SERVER_KEYS.detail(id!),
    queryFn: () => serversApi.get(id!),
    enabled: id !== null,
  });
}

export function useCreateServer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ServerFormData) =>
      serversApi.create(data as unknown as Record<string, unknown>),
    onSuccess: () => qc.invalidateQueries({ queryKey: SERVER_KEYS.all }),
  });
}

export function useUpdateServer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<ServerFormData> }) =>
      serversApi.update(id, data as unknown as Record<string, unknown>),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: SERVER_KEYS.all });
      qc.invalidateQueries({ queryKey: SERVER_KEYS.detail(id) });
    },
  });
}

export function useDeleteServer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => serversApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: SERVER_KEYS.all }),
  });
}
