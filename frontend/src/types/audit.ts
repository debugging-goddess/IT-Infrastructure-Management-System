export type AuditAction = "create" | "update" | "delete";

/** A single field change: [oldValue, newValue] */
export type FieldChange = [unknown, unknown];

export interface AuditLog {
  id: number;
  user: number | null;
  user_email: string | null;
  user_name: string;
  action: AuditAction;
  model_name: string;        // e.g. "server", "ipaddress"
  object_id: number;
  object_repr: string;       // string snapshot, e.g. "prod-web-01"
  changes: Record<string, FieldChange>;
  timestamp: string;
}
