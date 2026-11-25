import { apiClient } from "./client";
import type { AuthTokens, LoginCredentials } from "@/types";

export const authApi = {
  login: (credentials: LoginCredentials) =>
    apiClient.post<AuthTokens>("/auth/token/", credentials).then((r) => r.data),

  refresh: (refresh: string) =>
    apiClient.post<{ access: string }>("/auth/token/refresh/", { refresh }).then((r) => r.data),
};
