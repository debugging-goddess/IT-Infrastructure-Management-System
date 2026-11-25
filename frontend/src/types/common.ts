/** Generic paginated API response from Django REST Framework */
export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export type ServerStatus =
  | "active"
  | "inactive"
  | "unracked"
  | "maintenance"
  | "decommissioned";

export type AppStatus = "running" | "stopped" | "degraded" | "maintenance" | "decommissioned";
export type ServiceStatus = "running" | "stopped" | "failed";
export type IPStatus = "active" | "reserved" | "deprecated" | "dhcp";

/** Legacy alias — prefer the specific status types above */
export type Status = ServerStatus;
