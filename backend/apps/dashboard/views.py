from django.db.models import Count, Sum, Q
from django.utils import timezone
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions

from apps.infrastructure.models import Server, VirtualMachine, Cluster
from apps.infrastructure.lifecycle import lifecycle_state, LIFECYCLE_WARNING_DAYS
from apps.network.reachability import summarize_reachability
from apps.network.models import IPAddress, Subnet, VLAN
from apps.software.models import Application, Service
from apps.audit.models import AuditLog


@extend_schema(
    summary="Infrastructure topology graph",
    description="Servers, VMs and applications as nodes, with hosts / runs / depends edges.",
    responses=OpenApiTypes.OBJECT,
)
class DashboardTopologyView(APIView):
    """
    Returns the infrastructure relationship graph as nodes + edges,
    suitable for a Cytoscape dependency visualization.

    Node types: server, vm, application
    Edge types: hosts (server -> vm), runs (vm/server -> app),
                depends (app -> app)
    """

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        nodes = []
        edges = []

        # ── Servers ────────────────────────────────────────────────
        servers = Server.objects.all()
        for s in servers:
            nodes.append({
                "id": f"server-{s.id}",
                "label": s.name,
                "type": "server",
                "status": s.status,
            })

        # ── Virtual Machines ───────────────────────────────────────
        vms = VirtualMachine.objects.select_related("host_server").all()
        for vm in vms:
            nodes.append({
                "id": f"vm-{vm.id}",
                "label": vm.name,
                "type": "vm",
                "status": vm.status,
            })
            if vm.host_server_id:
                edges.append({
                    "id": f"host-{vm.id}",
                    "source": f"server-{vm.host_server_id}",
                    "target": f"vm-{vm.id}",
                    "type": "hosts",
                })

        # ── Applications ───────────────────────────────────────────
        apps = Application.objects.prefetch_related("dependencies").all()
        for app in apps:
            nodes.append({
                "id": f"app-{app.id}",
                "label": f"{app.name} {app.version}".strip(),
                "type": "application",
                "status": app.status,
            })
            # Deployment edge — app runs on a VM or a server
            if app.vm_id:
                edges.append({
                    "id": f"run-vm-{app.id}",
                    "source": f"vm-{app.vm_id}",
                    "target": f"app-{app.id}",
                    "type": "runs",
                })
            elif app.server_id:
                edges.append({
                    "id": f"run-srv-{app.id}",
                    "source": f"server-{app.server_id}",
                    "target": f"app-{app.id}",
                    "type": "runs",
                })
            # Dependency edges — app depends on other apps
            for dep in app.dependencies.all():
                edges.append({
                    "id": f"dep-{app.id}-{dep.id}",
                    "source": f"app-{app.id}",
                    "target": f"app-{dep.id}",
                    "type": "depends",
                })

        return Response({
            "nodes": nodes,
            "edges": edges,
            "counts": {
                "servers": servers.count(),
                "vms": vms.count(),
                "applications": apps.count(),
                "edges": len(edges),
            },
        })


def _status_breakdown(queryset):
    """Return [{status, count}] for a queryset with a `status` field."""
    rows = queryset.values("status").annotate(count=Count("id")).order_by("status")
    return [{"status": r["status"], "count": r["count"]} for r in rows]


@extend_schema(
    summary="Dashboard statistics",
    description=(
        "Totals, status breakdowns, capacity, attention items, warranty / end-of-life "
        "lifecycle, reachability summary and recent activity."
    ),
    responses=OpenApiTypes.OBJECT,
)
class DashboardStatsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        # ── Top-level counts ───────────────────────────────────────
        totals = {
            "servers":      Server.objects.count(),
            "vms":          VirtualMachine.objects.count(),
            "applications": Application.objects.count(),
            "services":     Service.objects.count(),
            "ip_addresses": IPAddress.objects.count(),
            "subnets":      Subnet.objects.count(),
            "vlans":        VLAN.objects.count(),
            "clusters":     Cluster.objects.count(),
        }

        # ── Status breakdowns ──────────────────────────────────────
        status_breakdowns = {
            "servers":      _status_breakdown(Server.objects.all()),
            "vms":          _status_breakdown(VirtualMachine.objects.all()),
            "applications": _status_breakdown(Application.objects.all()),
        }

        # ── Capacity rollups ───────────────────────────────────────
        server_cap = Server.objects.aggregate(
            cpu=Sum("cpu_cores"), ram=Sum("ram_gb"), storage=Sum("storage_tb")
        )
        vm_cap = VirtualMachine.objects.aggregate(
            vcpu=Sum("vcpu"), ram=Sum("ram_gb"), disk=Sum("disk_gb")
        )
        capacity = {
            "server_cpu_cores":  server_cap["cpu"] or 0,
            "server_ram_gb":     server_cap["ram"] or 0,
            "server_storage_tb": float(server_cap["storage"] or 0),
            "vm_vcpu":           vm_cap["vcpu"] or 0,
            "vm_ram_gb":         vm_cap["ram"] or 0,
            "vm_disk_gb":        vm_cap["disk"] or 0,
        }

        # ── Needs attention ────────────────────────────────────────
        attention = []

        decommissioned_with_ips = IPAddress.objects.filter(
            assigned_server__status="decommissioned"
        ).count()
        if decommissioned_with_ips:
            attention.append({
                "severity": "warning",
                "message": f"{decommissioned_with_ips} IP(s) still assigned to decommissioned servers",
            })

        ownerless_servers = Server.objects.filter(owner__isnull=True).count()
        if ownerless_servers:
            attention.append({
                "severity": "info",
                "message": f"{ownerless_servers} server(s) have no assigned owner",
            })

        degraded_apps = Application.objects.filter(
            Q(status="degraded") | Q(status="stopped")
        ).count()
        if degraded_apps:
            attention.append({
                "severity": "error",
                "message": f"{degraded_apps} application(s) are degraded or stopped",
            })

        maintenance_servers = Server.objects.filter(status="maintenance").count()
        if maintenance_servers:
            attention.append({
                "severity": "warning",
                "message": f"{maintenance_servers} server(s) are under maintenance",
            })

        unassigned_ips = IPAddress.objects.filter(
            assigned_server__isnull=True, assigned_vm__isnull=True
        ).count()
        if unassigned_ips:
            attention.append({
                "severity": "info",
                "message": f"{unassigned_ips} IP address(es) are unassigned",
            })

        # ── Lifecycle: warranty / end-of-life ──────────────────────
        # Decommissioned servers are skipped: nobody needs a warranty reminder for them.
        today = timezone.localdate()
        expiring, expired = [], []
        tracked = Server.objects.exclude(status="decommissioned").filter(
            Q(warranty_expiry__isnull=False) | Q(end_of_life__isnull=False)
        )
        for server in tracked:
            for kind, when in (("warranty", server.warranty_expiry), ("end_of_life", server.end_of_life)):
                state, days_left = lifecycle_state(when, today)
                item = {
                    "server_id": server.id,
                    "server_name": server.name,
                    "kind": kind,
                    "date": when.isoformat() if when else None,
                    "days_left": days_left,
                }
                if state == "expiring":
                    expiring.append(item)
                elif state == "expired":
                    expired.append(item)
        expiring.sort(key=lambda i: i["days_left"])
        expired.sort(key=lambda i: i["days_left"])  # most overdue first

        if expired:
            attention.append({
                "severity": "error",
                "message": f"{len(expired)} warranty / end-of-life date(s) have already passed",
            })
        if expiring:
            attention.append({
                "severity": "warning",
                "message": f"{len(expiring)} warranty / end-of-life date(s) expire within {LIFECYCLE_WARNING_DAYS} days",
            })

        lifecycle = {
            "window_days": LIFECYCLE_WARNING_DAYS,
            "expiring_count": len(expiring),
            "expired_count": len(expired),
            "expiring": expiring[:10],
            "expired": expired[:10],
        }

        # ── Reachability (from the periodic IP checks) ─────────────
        reach_counts = {"up": 0, "down": 0, "unknown": 0, "no_ip": 0}
        reach_alerts = []
        hosts = (
            [("server", s) for s in Server.objects.prefetch_related("ip_addresses")]
            + [("vm", v) for v in VirtualMachine.objects.prefetch_related("ip_addresses")]
        )
        for kind, host in hosts:
            summary = summarize_reachability(host.ip_addresses.all(), host.status)
            reach_counts[summary["reachability"]] += 1
            if summary["alert"]:
                reach_alerts.append({
                    "host_type": kind,
                    "id": host.id,
                    "name": host.name,
                    "status": host.status,
                    "alert": summary["alert"],
                })

        down_but_active = sum(1 for a in reach_alerts if a["alert"] == "active_but_down")
        up_but_inactive = sum(1 for a in reach_alerts if a["alert"] == "inactive_but_up")
        if down_but_active:
            attention.append({
                "severity": "error",
                "message": f"{down_but_active} host(s) recorded as active are not responding",
            })
        if up_but_inactive:
            attention.append({
                "severity": "warning",
                "message": f"{up_but_inactive} host(s) recorded as inactive or retired are still responding",
            })

        reachability = {**reach_counts, "alert_count": len(reach_alerts), "alerts": reach_alerts[:10]}

        # ── Recent activity (from audit log) ───────────────────────
        recent = AuditLog.objects.select_related("user", "content_type").all()[:8]
        recent_activity = [
            {
                "id": log.id,
                "action": log.action,
                "model": log.content_type.model,
                "object_repr": log.object_repr,
                "user": (log.user.get_full_name() or log.user.username) if log.user else "System",
                "timestamp": log.timestamp,
            }
            for log in recent
        ]

        return Response({
            "totals": totals,
            "status_breakdowns": status_breakdowns,
            "capacity": capacity,
            "attention": attention,
            "lifecycle": lifecycle,
            "reachability": reachability,
            "recent_activity": recent_activity,
        })
