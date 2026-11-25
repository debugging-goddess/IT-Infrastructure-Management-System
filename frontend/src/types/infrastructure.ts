import type { ServerStatus } from "./common";

// -------------------------------------------------------------------
// Nested lightweight shapes (returned inline inside Server)
// -------------------------------------------------------------------

export interface NestedIPAddress {
  id: number;
  address: string;
  dns_name: string;
  status: string;
}

export interface NestedService {
  id: number;
  name: string;
  status: string;
  port: number | null;
}

export interface NestedVM {
  id: number;
  name: string;
  hostname: string;
  status: string;
}

// -------------------------------------------------------------------
// Server
// -------------------------------------------------------------------

export interface Server {
  id: number;
  name: string;
  hostname: string;
  serial_number: string;
  manufacturer: string;
  model: string;
  location: string;
  os: string;
  os_version: string;
  cpu_cores: number | null;
  ram_gb: number | null;
  storage_tb: string | null;
  status: ServerStatus;
  owner: number | null;
  owner_name: string | null;
  /** URL string returned by the API when an image exists */
  image_front: string | null;
  image_rear: string | null;
  notes: string;
  // Nested relations
  ip_addresses: NestedIPAddress[];
  ip_count: number;
  services: NestedService[];
  service_count: number;
  virtual_machines: NestedVM[];
  vm_count: number;
  created_at: string;
  updated_at: string;
}

/** Shape used when creating or editing — images are File objects in the form */
export interface ServerFormData {
  name: string;
  hostname: string;
  serial_number?: string;
  manufacturer?: string;
  model?: string;
  location?: string;
  os?: string;
  os_version?: string;
  cpu_cores?: number | null;
  ram_gb?: number | null;
  storage_tb?: number | null;
  status: ServerStatus;
  owner?: number | null;
  notes?: string;
  /** File selected by the user — undefined means no change, null means clear */
  image_front?: File | null;
  image_rear?: File | null;
}

// -------------------------------------------------------------------
// Cluster
// -------------------------------------------------------------------

export interface Cluster {
  id: number;
  name: string;
  description: string;
  servers: number[];
  created_at: string;
  updated_at: string;
}

// -------------------------------------------------------------------
// Virtual Machine
// -------------------------------------------------------------------

export interface NestedApplication {
  id: number;
  name: string;
  version: string;
  status: string;
  port: number | null;
  url: string;
}

export interface VirtualMachine {
  id: number;
  name: string;
  hostname: string;
  host_server: number | null;
  host_server_name: string | null;
  cluster: number | null;
  cluster_name: string | null;
  os: string;
  os_version: string;
  vcpu: number | null;
  ram_gb: number | null;
  disk_gb: number | null;
  status: ServerStatus;
  owner: number | null;
  owner_name: string | null;
  notes: string;
  // Nested relations
  ip_addresses: NestedIPAddress[];
  ip_count: number;
  applications: NestedApplication[];
  app_count: number;
  services: NestedService[];
  service_count: number;
  created_at: string;
  updated_at: string;
}

/** Shape used when creating or editing a VM */
export interface VMFormData {
  name: string;
  hostname: string;
  host_server?: number | null;
  cluster?: number | null;
  os?: string;
  os_version?: string;
  vcpu?: number | null;
  ram_gb?: number | null;
  disk_gb?: number | null;
  status: ServerStatus;
  owner?: number | null;
  notes?: string;
}
