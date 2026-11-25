import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { vmsApi, serversApi, clustersApi } from "@/api";
import type { VMFormData } from "@/types";

export const VM_KEYS = {
  all:    ["vms"] as const,
  list:   (params: Record<string, unknown>) => ["vms", "list", params] as const,
  detail: (id: number) => ["vms", id] as const,
};

export function useVMs(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: VM_KEYS.list(params ?? {}),
    queryFn: () => vmsApi.list(params),
  });
}

export function useVM(id: number | null) {
  return useQuery({
    queryKey: VM_KEYS.detail(id!),
    queryFn: () => vmsApi.get(id!),
    enabled: id !== null,
  });
}

export function useCreateVM() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: VMFormData) => vmsApi.create(data as unknown as Record<string, unknown>),
    onSuccess: () => qc.invalidateQueries({ queryKey: VM_KEYS.all }),
  });
}

export function useUpdateVM() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<VMFormData> }) =>
      vmsApi.update(id, data as unknown as Record<string, unknown>),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: VM_KEYS.all });
      qc.invalidateQueries({ queryKey: VM_KEYS.detail(id) });
      // Also refresh servers list since VM counts change
      qc.invalidateQueries({ queryKey: ["servers"] });
    },
  });
}

export function useDeleteVM() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => vmsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: VM_KEYS.all });
      qc.invalidateQueries({ queryKey: ["servers"] });
    },
  });
}

/** Convenience hook — loads all servers for the host server dropdown */
export function useServerOptions() {
  return useQuery({
    queryKey: ["servers", "options"],
    queryFn: () => serversApi.list({ page_size: 500 }),
    select: (data) =>
      data.results.map((s) => ({ value: s.id, label: `${s.name} (${s.hostname})` })),
  });
}

/** Convenience hook — loads all clusters for the cluster dropdown */
export function useClusterOptions() {
  return useQuery({
    queryKey: ["clusters", "options"],
    queryFn: () => clustersApi.list({ page_size: 500 }),
    select: (data) =>
      data.results.map((c) => ({ value: c.id, label: c.name })),
  });
}
