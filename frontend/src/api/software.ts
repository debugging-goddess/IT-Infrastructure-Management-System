import { apiClient } from "./client";
import type { Application, Service } from "@/types";
import type { PaginatedResponse } from "@/types";

export const applicationsApi = {
  list: (params?: Record<string, unknown>) =>
    apiClient.get<PaginatedResponse<Application>>("/applications/", { params }).then((r) => r.data),
  get: (id: number) => apiClient.get<Application>(`/applications/${id}/`).then((r) => r.data),
  create: (data: Record<string, unknown>) => apiClient.post<Application>("/applications/", data).then((r) => r.data),
  update: (id: number, data: Record<string, unknown>) => apiClient.patch<Application>(`/applications/${id}/`, data).then((r) => r.data),
  delete: (id: number) => apiClient.delete(`/applications/${id}/`),
};

export const servicesApi = {
  list: (params?: Record<string, unknown>) =>
    apiClient.get<PaginatedResponse<Service>>("/services/", { params }).then((r) => r.data),
  get: (id: number) => apiClient.get<Service>(`/services/${id}/`).then((r) => r.data),
  create: (data: Partial<Service>) => apiClient.post<Service>("/services/", data).then((r) => r.data),
  update: (id: number, data: Partial<Service>) => apiClient.patch<Service>(`/services/${id}/`, data).then((r) => r.data),
  delete: (id: number) => apiClient.delete(`/services/${id}/`),
};
