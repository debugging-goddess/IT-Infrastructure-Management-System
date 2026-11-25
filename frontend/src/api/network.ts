import { apiClient } from "./client";
import type { VLAN, Subnet, IPAddress } from "@/types";
import type { PaginatedResponse } from "@/types";

export const vlansApi = {
  list: (params?: Record<string, unknown>) =>
    apiClient.get<PaginatedResponse<VLAN>>("/vlans/", { params }).then((r) => r.data),
  get: (id: number) => apiClient.get<VLAN>(`/vlans/${id}/`).then((r) => r.data),
  create: (data: Record<string, unknown>) => apiClient.post<VLAN>("/vlans/", data).then((r) => r.data),
  update: (id: number, data: Record<string, unknown>) => apiClient.patch<VLAN>(`/vlans/${id}/`, data).then((r) => r.data),
  delete: (id: number) => apiClient.delete(`/vlans/${id}/`),
};

export const subnetsApi = {
  list: (params?: Record<string, unknown>) =>
    apiClient.get<PaginatedResponse<Subnet>>("/subnets/", { params }).then((r) => r.data),
  get: (id: number) => apiClient.get<Subnet>(`/subnets/${id}/`).then((r) => r.data),
  create: (data: Record<string, unknown>) => apiClient.post<Subnet>("/subnets/", data).then((r) => r.data),
  update: (id: number, data: Record<string, unknown>) => apiClient.patch<Subnet>(`/subnets/${id}/`, data).then((r) => r.data),
  delete: (id: number) => apiClient.delete(`/subnets/${id}/`),
};

export const ipAddressesApi = {
  list: (params?: Record<string, unknown>) =>
    apiClient.get<PaginatedResponse<IPAddress>>("/ip-addresses/", { params }).then((r) => r.data),
  get: (id: number) => apiClient.get<IPAddress>(`/ip-addresses/${id}/`).then((r) => r.data),
  create: (data: Record<string, unknown>) => apiClient.post<IPAddress>("/ip-addresses/", data).then((r) => r.data),
  update: (id: number, data: Record<string, unknown>) => apiClient.patch<IPAddress>(`/ip-addresses/${id}/`, data).then((r) => r.data),
  delete: (id: number) => apiClient.delete(`/ip-addresses/${id}/`),
};
