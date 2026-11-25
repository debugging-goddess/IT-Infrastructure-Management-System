import type { IPStatus } from "@/types";

export interface IPStatusConfig {
  label: string;
  color: string;
  badgeColor: string;
  description: string;
}

export const IP_STATUS_CONFIG: Record<IPStatus, IPStatusConfig> = {
  active: {
    label: "Active",
    color: "success",
    badgeColor: "#52c41a",
    description: "In use and reachable",
  },
  reserved: {
    label: "Reserved",
    color: "processing",
    badgeColor: "#1677ff",
    description: "Set aside for future use",
  },
  deprecated: {
    label: "Deprecated",
    color: "warning",
    badgeColor: "#fa8c16",
    description: "Being phased out",
  },
  dhcp: {
    label: "DHCP",
    color: "cyan",
    badgeColor: "#13c2c2",
    description: "Dynamically assigned via DHCP",
  },
};

export const ALL_IP_STATUSES = Object.entries(IP_STATUS_CONFIG).map(
  ([value, cfg]) => ({ value: value as IPStatus, label: cfg.label })
);
