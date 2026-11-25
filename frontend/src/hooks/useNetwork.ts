import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { vlansApi, subnetsApi, ipAddressesApi, serversApi, vmsApi } from "@/api";
import type { VLANFormData, SubnetFormData, IPAddressFormData } from "@/types";

// ===================================================================
// Query keys
// ===================================================================
export const NETWORK_KEYS = {
  vlans:   ["vlans"] as const,
  subnets: ["subnets"] as const,
  ips:     ["ips"] as const,
};

// ===================================================================
// VLANs
// ===================================================================
export function useVLANs(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: ["vlans", "list", params ?? {}],
    queryFn: () => vlansApi.list(params),
  });
}

export function useCreateVLAN() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: VLANFormData) => vlansApi.create(data as unknown as Record<string, unknown>),
    onSuccess: () => qc.invalidateQueries({ queryKey: NETWORK_KEYS.vlans }),
  });
}

export function useUpdateVLAN() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<VLANFormData> }) =>
      vlansApi.update(id, data as unknown as Record<string, unknown>),
    onSuccess: () => qc.invalidateQueries({ queryKey: NETWORK_KEYS.vlans }),
  });
}

export function useDeleteVLAN() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => vlansApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: NETWORK_KEYS.vlans });
      qc.invalidateQueries({ queryKey: NETWORK_KEYS.subnets });
    },
  });
}

// ===================================================================
// Subnets
// ===================================================================
export function useSubnets(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: ["subnets", "list", params ?? {}],
    queryFn: () => subnetsApi.list(params),
  });
}

export function useCreateSubnet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: SubnetFormData) => subnetsApi.create(data as unknown as Record<string, unknown>),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: NETWORK_KEYS.subnets });
      qc.invalidateQueries({ queryKey: NETWORK_KEYS.vlans });
    },
  });
}

export function useUpdateSubnet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<SubnetFormData> }) =>
      subnetsApi.update(id, data as unknown as Record<string, unknown>),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: NETWORK_KEYS.subnets });
      qc.invalidateQueries({ queryKey: NETWORK_KEYS.vlans });
    },
  });
}

export function useDeleteSubnet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => subnetsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: NETWORK_KEYS.subnets });
      qc.invalidateQueries({ queryKey: NETWORK_KEYS.vlans });
      qc.invalidateQueries({ queryKey: NETWORK_KEYS.ips });
    },
  });
}

// ===================================================================
// IP Addresses
// ===================================================================
export function useIPAddresses(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: ["ips", "list", params ?? {}],
    queryFn: () => ipAddressesApi.list(params),
  });
}

export function useCreateIP() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: IPAddressFormData) => ipAddressesApi.create(data as unknown as Record<string, unknown>),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: NETWORK_KEYS.ips });
      qc.invalidateQueries({ queryKey: NETWORK_KEYS.subnets });
      qc.invalidateQueries({ queryKey: ["servers"] });
      qc.invalidateQueries({ queryKey: ["vms"] });
    },
  });
}

export function useUpdateIP() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<IPAddressFormData> }) =>
      ipAddressesApi.update(id, data as unknown as Record<string, unknown>),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: NETWORK_KEYS.ips });
      qc.invalidateQueries({ queryKey: NETWORK_KEYS.subnets });
      qc.invalidateQueries({ queryKey: ["servers"] });
      qc.invalidateQueries({ queryKey: ["vms"] });
    },
  });
}

export function useDeleteIP() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => ipAddressesApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: NETWORK_KEYS.ips });
      qc.invalidateQueries({ queryKey: NETWORK_KEYS.subnets });
      qc.invalidateQueries({ queryKey: ["servers"] });
      qc.invalidateQueries({ queryKey: ["vms"] });
    },
  });
}

// ===================================================================
// Option hooks (for dropdowns)
// ===================================================================
export function useVLANOptions() {
  return useQuery({
    queryKey: ["vlans", "options"],
    queryFn: () => vlansApi.list({ page_size: 500 }),
    select: (data) =>
      data.results.map((v) => ({ value: v.id, label: `VLAN ${v.vid} — ${v.name}` })),
  });
}

export function useSubnetOptions() {
  return useQuery({
    queryKey: ["subnets", "options"],
    queryFn: () => subnetsApi.list({ page_size: 500 }),
    select: (data) =>
      data.results.map((s) => ({ value: s.id, label: s.cidr })),
  });
}

export function useServerOptionsForIP() {
  return useQuery({
    queryKey: ["servers", "options"],
    queryFn: () => serversApi.list({ page_size: 500 }),
    select: (data) =>
      data.results.map((s) => ({ value: s.id, label: `${s.name} (${s.hostname})` })),
  });
}

export function useVMOptionsForIP() {
  return useQuery({
    queryKey: ["vms", "options"],
    queryFn: () => vmsApi.list({ page_size: 500 }),
    select: (data) =>
      data.results.map((v) => ({ value: v.id, label: `${v.name} (${v.hostname})` })),
  });
}
