import { useQuery } from "@tanstack/react-query";
import { dashboardApi } from "@/api";

export function useDashboardStats() {
  return useQuery({
    queryKey: ["dashboard", "stats"],
    queryFn: () => dashboardApi.stats(),
    refetchInterval: 30_000, // keep the dashboard reasonably live
  });
}

export function useTopology() {
  return useQuery({
    queryKey: ["dashboard", "topology"],
    queryFn: () => dashboardApi.topology(),
  });
}
