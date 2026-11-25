import type { AppStatus, ServiceStatus } from "./common";

export type { AppStatus, ServiceStatus };

// -------------------------------------------------------------------
// Nested dependency shape
// -------------------------------------------------------------------

export interface NestedDependency {
  id: number;
  name: string;
  version: string;
  status: string;
}

// -------------------------------------------------------------------
// Application
// -------------------------------------------------------------------

export interface Application {
  id: number;
  name: string;
  version: string;
  description: string;
  status: AppStatus;
  owner: number | null;
  owner_name: string | null;
  vm: number | null;
  vm_name: string | null;
  server: number | null;
  server_name: string | null;
  deployment_target: string | null;
  port: number | null;
  url: string;
  dependencies: number[];
  dependency_details: NestedDependency[];
  dependent_count: number;
  notes: string;
  created_at: string;
  updated_at: string;
}

/** Shape used when creating or editing an application */
export interface ApplicationFormData {
  name: string;
  version?: string;
  description?: string;
  status: AppStatus;
  owner?: number | null;
  vm?: number | null;
  server?: number | null;
  port?: number | null;
  url?: string;
  dependencies?: number[];
  notes?: string;
}

// -------------------------------------------------------------------
// Service
// -------------------------------------------------------------------

export interface Service {
  id: number;
  name: string;
  description: string;
  status: ServiceStatus;
  vm: number | null;
  vm_name: string | null;
  server: number | null;
  server_name: string | null;
  port: number | null;
  created_at: string;
  updated_at: string;
}
