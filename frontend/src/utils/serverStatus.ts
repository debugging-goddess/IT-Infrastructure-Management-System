import type { ServerStatus } from "@/types";

export interface StatusConfig {
  label: string;
  color: string;       // Ant Design Tag color
  badgeColor: string;  // dot color for the pulsing indicator
  description: string;
}

export const SERVER_STATUS_CONFIG: Record<ServerStatus, StatusConfig> = {
  active: {
    label: "Active",
    color: "success",
    badgeColor: "#52c41a",
    description: "Racked, powered on and running",
  },
  inactive: {
    label: "Inactive",
    color: "default",
    badgeColor: "#8c8c8c",
    description: "Racked but powered off or not running",
  },
  unracked: {
    label: "Unracked",
    color: "warning",
    badgeColor: "#fa8c16",
    description: "Previously racked, removed from the rack",
  },
  maintenance: {
    label: "Maintenance",
    color: "processing",
    badgeColor: "#1677ff",
    description: "Under scheduled maintenance",
  },
  decommissioned: {
    label: "Decommissioned",
    color: "error",
    badgeColor: "#ff4d4f",
    description: "End-of-life, no longer in service",
  },
};

export const ALL_SERVER_STATUSES = Object.entries(SERVER_STATUS_CONFIG).map(
  ([value, cfg]) => ({ value: value as ServerStatus, label: cfg.label })
);
