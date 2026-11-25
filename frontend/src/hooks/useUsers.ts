import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usersApi, serversApi, vmsApi, applicationsApi } from "@/api";
import type { UserCreateData, UserUpdateData, SetUserAssetsPayload } from "@/types";

export const USER_KEYS = {
  all:    ["users"] as const,
  list:   (params: Record<string, unknown>) => ["users", "list", params] as const,
  detail: (id: number) => ["users", id] as const,
};

export function useUsers(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: USER_KEYS.list(params ?? {}),
    queryFn: () => usersApi.list(params),
    // Owned-asset counts change whenever an owner is set on a server/VM/app elsewhere,
    // so never show a cached copy when arriving on this page.
    refetchOnMount: "always",
  });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UserCreateData) => usersApi.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: USER_KEYS.all }),
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UserUpdateData }) =>
      usersApi.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: USER_KEYS.all }),
  });
}

/** Toggle a user's active state (deactivate / reactivate) */
export function useToggleUserActive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      usersApi.update(id, { is_active: isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: USER_KEYS.all }),
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => usersApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: USER_KEYS.all }),
  });
}

// ---------------------------------------------------------------------------
// Ownership
// ---------------------------------------------------------------------------

export interface UserOption {
  value: number;
  label: string;
  disabled?: boolean;
}

/** People who can be picked as an owner. Asset managers are listed first. */
export function useUserOptions() {
  return useQuery({
    queryKey: ["users", "options"],
    queryFn: () => usersApi.list({ page_size: 500 }),
    refetchOnMount: "always",
    select: (data): UserOption[] =>
      [...data.results]
        .sort(
          (a, b) =>
            Number(b.is_active) - Number(a.is_active) ||
            Number(b.is_asset_manager) - Number(a.is_asset_manager) ||
            a.full_name.localeCompare(b.full_name),
        )
        .map((u) => ({
          value: u.id,
          label:
            `${u.full_name} (${u.email})` +
            (u.is_asset_manager ? " — Asset Manager" : "") +
            (u.is_active ? "" : " — inactive"),
          // An inactive person stays visible if already selected, but cannot be newly chosen
          disabled: !u.is_active,
        })),
  });
}

export interface AssignableAsset {
  value: number;
  name: string;
  owner: number | null;
  owner_name: string | null;
}

export interface AssignableAssets {
  servers: AssignableAsset[];
  vms: AssignableAsset[];
  applications: AssignableAsset[];
}

/** Every server, VM and application with its current owner, for the "Manage assets" dialog. */
export function useAssignableAssets(enabled: boolean) {
  return useQuery({
    queryKey: ["assignable-assets"],
    enabled,
    refetchOnMount: "always",
    queryFn: async (): Promise<AssignableAssets> => {
      const params = { page_size: 500 };
      const [servers, vms, apps] = await Promise.all([
        serversApi.list(params),
        vmsApi.list(params),
        applicationsApi.list(params),
      ]);
      const pick = (r: { id: number; name: string; owner: number | null; owner_name: string | null }) => ({
        value: r.id, name: r.name, owner: r.owner, owner_name: r.owner_name,
      });
      return {
        servers: servers.results.map(pick),
        vms: vms.results.map(pick),
        applications: apps.results.map(pick),
      };
    },
  });
}

export function useSetUserAssets() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: SetUserAssetsPayload }) =>
      usersApi.setAssets(id, data),
    onSuccess: () => {
      // Ownership shows up in all of these
      ["users", "servers", "vms", "applications", "assignable-assets", "audit-logs", "dashboard"].forEach(
        (key) => qc.invalidateQueries({ queryKey: [key] }),
      );
    },
  });
}
