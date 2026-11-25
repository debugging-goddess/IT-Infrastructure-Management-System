import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { applicationsApi, serversApi, vmsApi } from "@/api";
import type { ApplicationFormData } from "@/types";

export const APP_KEYS = {
  all:    ["applications"] as const,
  list:   (params: Record<string, unknown>) => ["applications", "list", params] as const,
  detail: (id: number) => ["applications", id] as const,
};

export function useApplications(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: APP_KEYS.list(params ?? {}),
    queryFn: () => applicationsApi.list(params),
  });
}

export function useApplication(id: number | null) {
  return useQuery({
    queryKey: APP_KEYS.detail(id!),
    queryFn: () => applicationsApi.get(id!),
    enabled: id !== null,
  });
}

export function useCreateApplication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ApplicationFormData) =>
      applicationsApi.create(data as unknown as Record<string, unknown>),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: APP_KEYS.all });
      // VM/server counts change when apps are added
      qc.invalidateQueries({ queryKey: ["vms"] });
      qc.invalidateQueries({ queryKey: ["servers"] });
    },
  });
}

export function useUpdateApplication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<ApplicationFormData> }) =>
      applicationsApi.update(id, data as unknown as Record<string, unknown>),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: APP_KEYS.all });
      qc.invalidateQueries({ queryKey: APP_KEYS.detail(id) });
      qc.invalidateQueries({ queryKey: ["vms"] });
      qc.invalidateQueries({ queryKey: ["servers"] });
    },
  });
}

export function useDeleteApplication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => applicationsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: APP_KEYS.all });
      qc.invalidateQueries({ queryKey: ["vms"] });
      qc.invalidateQueries({ queryKey: ["servers"] });
    },
  });
}

/** Options for the VM deployment-target dropdown */
export function useVMOptions() {
  return useQuery({
    queryKey: ["vms", "options"],
    queryFn: () => vmsApi.list({ page_size: 500 }),
    select: (data) =>
      data.results.map((v) => ({ value: v.id, label: `${v.name} (${v.hostname})` })),
  });
}

/** Options for the Server deployment-target dropdown */
export function useServerOptionsForApps() {
  return useQuery({
    queryKey: ["servers", "options"],
    queryFn: () => serversApi.list({ page_size: 500 }),
    select: (data) =>
      data.results.map((s) => ({ value: s.id, label: `${s.name} (${s.hostname})` })),
  });
}

/** Options for the dependencies multi-select — all apps except the one being edited */
export function useApplicationOptions(excludeId?: number) {
  return useQuery({
    queryKey: ["applications", "options"],
    queryFn: () => applicationsApi.list({ page_size: 500 }),
    select: (data) =>
      data.results
        .filter((a) => a.id !== excludeId)
        .map((a) => ({
          value: a.id,
          label: a.version ? `${a.name} ${a.version}` : a.name,
        })),
  });
}
