import { ipAddressesApi, servicesApi } from "@/api";
import type { NestedIPAddress, NestedService, Service, ServiceStatus } from "@/types";

/** A row in the IP list editor. `id` is set for rows that already exist. */
export interface IPRow {
  id?: number;
  address?: string;
}

/** A row in the services list editor. `id` is set for rows that already exist. */
export interface ServiceRow {
  id?: number;
  name?: string;
  port?: number | null;
  status?: ServiceStatus;
}

export type HostKind = "server" | "vm";

function errorText(err: unknown): string {
  const data = (err as { response?: { data?: unknown } })?.response?.data;
  if (data && typeof data === "object") {
    return Object.entries(data as Record<string, unknown>)
      .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : String(v)}`)
      .join("; ");
  }
  return "unexpected error";
}

/**
 * Brings a server's or VM's IPs and services in line with what the user left
 * in the form, by comparing against what it had when the form opened.
 *
 * - IPs removed from the list are unassigned (the IP record is kept in the
 *   Network page, only the link to this host is removed).
 * - New IPs reuse an existing unassigned IP record if there is one, otherwise
 *   a new record is created.
 * - Services removed from the list are deleted, since a service only exists on
 *   its host.
 *
 * Never throws. Returns a list of human-readable warnings for anything that
 * could not be applied, so the host itself is still saved.
 */
export async function syncHostRelations(
  kind: HostKind,
  hostId: number,
  rows: { ips?: IPRow[]; services?: ServiceRow[] },
  original: { ips: NestedIPAddress[]; services: NestedService[] },
): Promise<string[]> {
  const warnings: string[] = [];
  const assignKey = kind === "server" ? "assigned_server" : "assigned_vm";

  // ── IP addresses ──────────────────────────────────────────────
  const ipRows = (rows.ips ?? [])
    .map((r) => ({ id: r?.id, address: (r?.address ?? "").trim() }))
    .filter((r) => r.address);
  const keptIpIds = new Set(ipRows.filter((r) => r.id).map((r) => r.id));

  // Unassign IPs that were removed (done first so a removed address can be re-added)
  for (const old of original.ips) {
    if (keptIpIds.has(old.id)) continue;
    try {
      await ipAddressesApi.update(old.id, { [assignKey]: null });
    } catch (e) {
      warnings.push(`Could not remove IP ${old.address}: ${errorText(e)}`);
    }
  }

  for (const row of ipRows) {
    try {
      if (row.id) {
        const old = original.ips.find((o) => o.id === row.id);
        if (old && old.address !== row.address) {
          await ipAddressesApi.update(row.id, { address: row.address });
        }
        continue;
      }

      // New row: reuse an existing record for this address if there is one
      const found = await ipAddressesApi.list({ search: row.address, page_size: 20 });
      const match = found.results.find((ip) => ip.address === row.address);
      if (match) {
        const alreadyHere =
          kind === "server" ? match.assigned_server === hostId : match.assigned_vm === hostId;
        if (alreadyHere) continue;
        if (match.assigned_server || match.assigned_vm) {
          warnings.push(
            `IP ${row.address} is already assigned to ${match.assignment ?? "another host"}`,
          );
          continue;
        }
        await ipAddressesApi.update(match.id, { [assignKey]: hostId });
      } else {
        await ipAddressesApi.create({
          address: row.address,
          status: "active",
          [assignKey]: hostId,
        });
      }
    } catch (e) {
      warnings.push(`Could not save IP ${row.address}: ${errorText(e)}`);
    }
  }

  // ── Services ──────────────────────────────────────────────────
  const svcRows = (rows.services ?? [])
    .map((r) => ({
      id: r?.id,
      name: (r?.name ?? "").trim(),
      port: r?.port ?? null,
      status: (r?.status ?? "running") as ServiceStatus,
    }))
    .filter((r) => r.name);
  const keptSvcIds = new Set(svcRows.filter((r) => r.id).map((r) => r.id));

  for (const old of original.services) {
    if (keptSvcIds.has(old.id)) continue;
    try {
      await servicesApi.delete(old.id);
    } catch (e) {
      warnings.push(`Could not remove service ${old.name}: ${errorText(e)}`);
    }
  }

  for (const row of svcRows) {
    try {
      if (row.id) {
        const old = original.services.find((o) => o.id === row.id);
        const changed =
          !old || old.name !== row.name || old.port !== row.port || old.status !== row.status;
        if (changed) {
          await servicesApi.update(row.id, {
            name: row.name,
            port: row.port,
            status: row.status,
          });
        }
      } else {
        const payload: Partial<Service> = {
          name: row.name,
          port: row.port,
          status: row.status,
        };
        if (kind === "server") payload.server = hostId;
        else payload.vm = hostId;
        await servicesApi.create(payload);
      }
    } catch (e) {
      warnings.push(`Could not save service ${row.name}: ${errorText(e)}`);
    }
  }

  return warnings;
}
