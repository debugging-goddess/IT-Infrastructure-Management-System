# Data Model Overview

## Core Entities

### Infrastructure
- **Server**: a physical machine. Status (active, inactive, unracked, maintenance,
  decommissioned), location, OS, hardware specs, front and rear photos, owner, and
  optional purchase / warranty-expiry / end-of-life dates.
- **VirtualMachine**: hosted on a server and optionally part of a cluster. OS, vCPU,
  RAM, disk, status and owner.
- **Cluster**: a logical group of servers, for example a hypervisor cluster.

### Network
- **VLAN**: a virtual LAN identified by its VID (1–4094).
- **Subnet**: a CIDR block with an optional name, mask, gateway, DNS servers, DHCP flag
  and VLAN. The mask and gateway are checked against the CIDR.
- **IPAddress**: a single address assigned to a server or a VM, never both. If it has a
  subnet, it must fall inside it. It also stores the result of the last reachability
  check.

### Software
- **Application**: deployed on a VM or a server, with version, status, port, URL and
  owner. It can depend on other applications, but not on itself.
- **Service**: an OS-level service (for example nginx or postgres) with a port and
  status, running on a VM or a server.

### Users
- **User**: a Django user signed in by email, with phone, department and an
  "asset manager" flag. Users own servers, VMs and applications.

### Audit
- **AuditLog**: a generic change log. It records every create, update and delete of the
  models above, with the user who made it and a field-level `{field: [old, new]}` diff.

## Key Relationships

```
Server ──hosts──▶ VirtualMachine
Server/VM ──has──▶ IPAddress ──belongs to──▶ Subnet ──in──▶ VLAN
VM/Server ──runs──▶ Application
VM/Server ──runs──▶ Service
Application ──depends on──▶ Application
User ──owns──▶ Server | VM | Application
AuditLog ──tracks──▶ any model (via GenericForeignKey)
```

## Permissions

| Action | Who |
|---|---|
| View inventory, users, dashboard, topology | Any signed-in user |
| Create, edit and delete servers, VMs, apps and network records | Any signed-in user |
| Edit your own name, phone and department | Everyone |
| Edit other users, create and delete users, assign assets to owners | Staff |
| Grant or remove staff / superuser rights, edit superuser accounts | Superusers only |
| Read the audit log | Staff |

Nobody can deactivate, demote or delete their own account.
