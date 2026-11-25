export interface StatusCount {
  status: string;
  count: number;
}

export interface DashboardTotals {
  servers: number;
  vms: number;
  applications: number;
  services: number;
  ip_addresses: number;
  subnets: number;
  vlans: number;
  clusters: number;
}

export interface DashboardCapacity {
  server_cpu_cores: number;
  server_ram_gb: number;
  server_storage_tb: number;
  vm_vcpu: number;
  vm_ram_gb: number;
  vm_disk_gb: number;
}

export interface AttentionItem {
  severity: "info" | "warning" | "error";
  message: string;
}

export interface RecentActivity {
  id: number;
  action: "create" | "update" | "delete";
  model: string;
  object_repr: string;
  user: string;
  timestamp: string;
}

export interface DashboardStats {
  totals: DashboardTotals;
  status_breakdowns: {
    servers: StatusCount[];
    vms: StatusCount[];
    applications: StatusCount[];
  };
  capacity: DashboardCapacity;
  attention: AttentionItem[];
  recent_activity: RecentActivity[];
}

// ── Topology ─────────────────────────────────────────────────────

export type TopologyNodeType = "server" | "vm" | "application";
export type TopologyEdgeType = "hosts" | "runs" | "depends";

export interface TopologyNode {
  id: string;
  label: string;
  type: TopologyNodeType;
  status: string;
}

export interface TopologyEdge {
  id: string;
  source: string;
  target: string;
  type: TopologyEdgeType;
}

export interface Topology {
  nodes: TopologyNode[];
  edges: TopologyEdge[];
  counts: {
    servers: number;
    vms: number;
    applications: number;
    edges: number;
  };
}
