import { apiClient } from "./client";
import type { Server, Cluster, VirtualMachine } from "@/types";
import type { PaginatedResponse } from "@/types";

// ---------------------------------------------------------------------------
// Helper — converts a plain object into FormData so file fields are included.
// Non-File fields are appended as strings; File fields appended as blobs.
// Fields with undefined / null values are skipped unless explicitly set null.
// ---------------------------------------------------------------------------
function toFormData(data: Record<string, unknown>): FormData {
  const fd = new FormData();
  Object.entries(data).forEach(([key, value]) => {
    if (value === undefined) return;
    if (value === null) {
      // Send empty string so Django clears the field
      fd.append(key, "");
    } else if (value instanceof File) {
      fd.append(key, value);
    } else {
      fd.append(key, String(value));
    }
  });
  return fd;
}

// ---------------------------------------------------------------------------
// Servers
// ---------------------------------------------------------------------------
export const serversApi = {
  list: (params?: Record<string, unknown>) =>
    apiClient
      .get<PaginatedResponse<Server>>("/servers/", { params })
      .then((r) => r.data),

  get: (id: number) =>
    apiClient.get<Server>(`/servers/${id}/`).then((r) => r.data),

  create: (data: Record<string, unknown>) =>
    apiClient
      .post<Server>("/servers/", toFormData(data), {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((r) => r.data),

  update: (id: number, data: Record<string, unknown>) =>
    apiClient
      .patch<Server>(`/servers/${id}/`, toFormData(data), {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((r) => r.data),

  delete: (id: number) => apiClient.delete(`/servers/${id}/`),
};

// ---------------------------------------------------------------------------
// Clusters
// ---------------------------------------------------------------------------
export const clustersApi = {
  list: (params?: Record<string, unknown>) =>
    apiClient
      .get<PaginatedResponse<Cluster>>("/clusters/", { params })
      .then((r) => r.data),

  get: (id: number) =>
    apiClient.get<Cluster>(`/clusters/${id}/`).then((r) => r.data),

  create: (data: Partial<Cluster>) =>
    apiClient.post<Cluster>("/clusters/", data).then((r) => r.data),

  update: (id: number, data: Partial<Cluster>) =>
    apiClient.patch<Cluster>(`/clusters/${id}/`, data).then((r) => r.data),

  delete: (id: number) => apiClient.delete(`/clusters/${id}/`),
};

// ---------------------------------------------------------------------------
// Virtual Machines
// ---------------------------------------------------------------------------
export const vmsApi = {
  list: (params?: Record<string, unknown>) =>
    apiClient
      .get<PaginatedResponse<VirtualMachine>>("/virtual-machines/", { params })
      .then((r) => r.data),

  get: (id: number) =>
    apiClient
      .get<VirtualMachine>(`/virtual-machines/${id}/`)
      .then((r) => r.data),

  create: (data: Record<string, unknown>) =>
    apiClient
      .post<VirtualMachine>("/virtual-machines/", data)
      .then((r) => r.data),

  update: (id: number, data: Record<string, unknown>) =>
    apiClient
      .patch<VirtualMachine>(`/virtual-machines/${id}/`, data)
      .then((r) => r.data),

  delete: (id: number) => apiClient.delete(`/virtual-machines/${id}/`),
};
