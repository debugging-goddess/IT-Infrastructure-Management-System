import type { AuditAction } from "@/types";

export interface AuditActionConfig {
  label: string;
  color: string;   // Ant Design Tag color
}

export const AUDIT_ACTION_CONFIG: Record<AuditAction, AuditActionConfig> = {
  create: { label: "Created", color: "success" },
  update: { label: "Updated", color: "processing" },
  delete: { label: "Deleted", color: "error" },
};

export const ALL_AUDIT_ACTIONS = Object.entries(AUDIT_ACTION_CONFIG).map(
  ([value, cfg]) => ({ value, label: cfg.label })
);

/** Map a model_name from the API to a friendly label */
export const MODEL_LABELS: Record<string, string> = {
  server: "Server",
  virtualmachine: "Virtual Machine",
  cluster: "Cluster",
  ipaddress: "IP Address",
  subnet: "Subnet",
  vlan: "VLAN",
  application: "Application",
  service: "Service",
};

export function modelLabel(name: string): string {
  return MODEL_LABELS[name] ?? name;
}

export const ALL_MODEL_OPTIONS = Object.entries(MODEL_LABELS).map(
  ([value, label]) => ({ value, label })
);

/** Render a raw field value for display in a diff */
export function displayValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (value === true) return "Yes";
  if (value === false) return "No";
  return String(value);
}

/** Turn a snake_case field name into a readable label */
export function fieldLabel(field: string): string {
  return field
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
