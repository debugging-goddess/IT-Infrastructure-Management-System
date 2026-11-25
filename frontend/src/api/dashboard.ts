import { apiClient } from "./client";
import type { DashboardStats, Topology } from "@/types";

export const dashboardApi = {
  stats: () =>
    apiClient.get<DashboardStats>("/dashboard/stats/").then((r) => r.data),
  topology: () =>
    apiClient.get<Topology>("/dashboard/topology/").then((r) => r.data),
};
