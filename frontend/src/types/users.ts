export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  department: string;
  phone: string;
  is_asset_manager: boolean;
  is_staff: boolean;
  is_superuser: boolean;
  is_active: boolean;
  owned_server_count: number;
  owned_vm_count: number;
  owned_application_count: number;
  date_joined: string;
  last_login: string | null;
}

/** Shape used when creating a new user */
export interface UserCreateData {
  username: string;
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  is_asset_manager?: boolean;
}

/** Shape used when editing an existing user */
export interface UserUpdateData {
  username?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  is_asset_manager?: boolean;
  is_staff?: boolean;
  is_active?: boolean;
}

/** Changes to one kind of asset: assign these ids to the user, release those from them */
export interface AssetChange {
  assign?: number[];
  release?: number[];
}

export interface SetUserAssetsPayload {
  servers?: AssetChange;
  vms?: AssetChange;
  applications?: AssetChange;
}

export interface SetUserAssetsResult {
  changes: Record<string, { assigned: number; released: number }>;
  user: User;
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}
