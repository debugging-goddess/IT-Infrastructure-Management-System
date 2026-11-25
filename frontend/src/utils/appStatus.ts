import type { AppStatus } from "@/types";

export interface AppStatusConfig {
  label: string;
  color: string;       // Ant Design Tag color
  badgeColor: string;  // dot color for the pulsing indicator
  description: string;
}

export const APP_STATUS_CONFIG: Record<AppStatus, AppStatusConfig> = {
  running: {
    label: "Running",
    color: "success",
    badgeColor: "#52c41a",
    description: "Application is up and serving traffic",
  },
  stopped: {
    label: "Stopped",
    color: "default",
    badgeColor: "#8c8c8c",
    description: "Application is deployed but not running",
  },
  degraded: {
    label: "Degraded",
    color: "warning",
    badgeColor: "#fa8c16",
    description: "Running with reduced performance or errors",
  },
  maintenance: {
    label: "Maintenance",
    color: "processing",
    badgeColor: "#1677ff",
    description: "Temporarily down for scheduled maintenance",
  },
  decommissioned: {
    label: "Decommissioned",
    color: "error",
    badgeColor: "#ff4d4f",
    description: "Retired, no longer in service",
  },
};

export const ALL_APP_STATUSES = Object.entries(APP_STATUS_CONFIG).map(
  ([value, cfg]) => ({ value: value as AppStatus, label: cfg.label })
);
