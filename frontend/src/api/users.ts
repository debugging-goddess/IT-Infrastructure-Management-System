import { apiClient } from "./client";
import type {
  User, UserCreateData, UserUpdateData,
  SetUserAssetsPayload, SetUserAssetsResult,
} from "@/types";
import type { PaginatedResponse } from "@/types";

export const usersApi = {
  list: (params?: Record<string, unknown>) =>
    apiClient.get<PaginatedResponse<User>>("/users/", { params }).then((r) => r.data),
  get: (id: number) => apiClient.get<User>(`/users/${id}/`).then((r) => r.data),
  me: () => apiClient.get<User>("/users/me/").then((r) => r.data),
  create: (data: UserCreateData) =>
    apiClient.post<User>("/users/", data).then((r) => r.data),
  update: (id: number, data: UserUpdateData) =>
    apiClient.patch<User>(`/users/${id}/`, data).then((r) => r.data),
  delete: (id: number) => apiClient.delete(`/users/${id}/`),
  setAssets: (id: number, data: SetUserAssetsPayload) =>
    apiClient.put<SetUserAssetsResult>(`/users/${id}/assets/`, data).then((r) => r.data),
};
