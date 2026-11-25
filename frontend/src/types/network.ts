import type { IPStatus } from "./common";

export type { IPStatus };

// -------------------------------------------------------------------
// VLAN
// -------------------------------------------------------------------

export interface VLAN {
  id: number;
  vid: number;
  name: string;
  description: string;
  subnet_count: number;
  created_at: string;
  updated_at: string;
}

export interface VLANFormData {
  vid: number;
  name: string;
  description?: string;
}

// -------------------------------------------------------------------
// Subnet
// -------------------------------------------------------------------

export interface Subnet {
  id: number;
  name: string;
  cidr: string;
  netmask: string | null;
  description: string;
  vlan: number | null;
  vlan_name: string | null;
  vlan_vid: number | null;
  gateway: string | null;
  dns_servers: string;
  dhcp_enabled: boolean;
  ip_count: number;
  created_at: string;
  updated_at: string;
}

export interface SubnetFormData {
  name?: string;
  cidr: string;
  netmask?: string | null;
  description?: string;
  vlan?: number | null;
  gateway?: string | null;
  dns_servers?: string;
  dhcp_enabled?: boolean;
}

// -------------------------------------------------------------------
// IP Address
// -------------------------------------------------------------------

export interface IPAddress {
  id: number;
  address: string;
  status: IPStatus;
  dns_name: string;
  description: string;
  subnet: number | null;
  subnet_cidr: string | null;
  assigned_server: number | null;
  assigned_server_name: string | null;
  assigned_vm: number | null;
  assigned_vm_name: string | null;
  assignment: string | null;
  created_at: string;
  updated_at: string;
}

export interface IPAddressFormData {
  address: string;
  status: IPStatus;
  dns_name?: string;
  description?: string;
  subnet?: number | null;
  assigned_server?: number | null;
  assigned_vm?: number | null;
}
