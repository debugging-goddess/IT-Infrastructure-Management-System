"""Servers and VMs: CRUD, status counts, sorting, pagination and lifecycle dates."""

from datetime import date, timedelta

from django.test import TestCase
from django.utils import timezone

from apps.infrastructure.lifecycle import lifecycle_state
from apps.infrastructure.models import Server, VirtualMachine
from tests.helpers import client_for, make_user


class ServerApiTests(TestCase):
    def setUp(self):
        self.client = client_for(make_user("admin", is_staff=True))

    def test_create_update_delete(self):
        resp = self.client.post(
            "/api/v1/servers/",
            {"name": "web01", "hostname": "web01.local", "status": "active", "ram_gb": 64},
            format="json",
        )
        self.assertEqual(resp.status_code, 201, resp.content)
        server_id = resp.json()["id"]

        resp = self.client.patch(f"/api/v1/servers/{server_id}/", {"status": "maintenance"}, format="json")
        self.assertEqual(resp.json()["status"], "maintenance")

        self.assertEqual(self.client.delete(f"/api/v1/servers/{server_id}/").status_code, 204)
        self.assertFalse(Server.objects.filter(pk=server_id).exists())

    def test_hostname_must_be_unique(self):
        Server.objects.create(name="a", hostname="dup.local")
        resp = self.client.post("/api/v1/servers/", {"name": "b", "hostname": "dup.local"}, format="json")
        self.assertEqual(resp.status_code, 400)

    def test_status_counts_cover_every_page(self):
        statuses = ["active"] * 12 + ["inactive"] * 8 + ["decommissioned"] * 5
        for i, status in enumerate(statuses):
            Server.objects.create(name=f"s{i:02}", hostname=f"s{i:02}.local", status=status)

        page = self.client.get("/api/v1/servers/", {"page_size": 5}).json()
        self.assertEqual(len(page["results"]), 5)  # page_size is honoured

        counts = self.client.get("/api/v1/servers/status-counts/").json()
        self.assertEqual(counts["total"], 25)
        self.assertEqual(counts["counts"], {"active": 12, "inactive": 8, "decommissioned": 5})

    def test_ordering(self):
        for name in ["bravo", "alpha", "charlie"]:
            Server.objects.create(name=name, hostname=f"{name}.local")
        names = [s["name"] for s in self.client.get("/api/v1/servers/", {"ordering": "-name"}).json()["results"]]
        self.assertEqual(names, ["charlie", "bravo", "alpha"])

    def test_vm_links_to_host_server(self):
        host = Server.objects.create(name="hv01", hostname="hv01.local")
        VirtualMachine.objects.create(name="vm01", hostname="vm01.local", host_server=host)
        server = self.client.get(f"/api/v1/servers/{host.id}/").json()
        self.assertEqual(server["vm_count"], 1)
        self.assertEqual(server["virtual_machines"][0]["name"], "vm01")


class LifecycleTests(TestCase):
    def test_lifecycle_state(self):
        today = date(2026, 1, 1)
        self.assertEqual(lifecycle_state(None, today), ("none", None))
        self.assertEqual(lifecycle_state(today + timedelta(days=200), today)[0], "ok")
        self.assertEqual(lifecycle_state(today + timedelta(days=90), today), ("expiring", 90))
        self.assertEqual(lifecycle_state(today, today), ("expiring", 0))
        self.assertEqual(lifecycle_state(today - timedelta(days=3), today), ("expired", -3))

    def test_dashboard_lists_expiring_but_skips_decommissioned(self):
        today = timezone.localdate()
        Server.objects.create(name="soon", hostname="soon", warranty_expiry=today + timedelta(days=30))
        Server.objects.create(name="gone", hostname="gone", end_of_life=today - timedelta(days=5))
        Server.objects.create(
            name="retired", hostname="retired", status="decommissioned",
            warranty_expiry=today + timedelta(days=10),
        )
        stats = client_for(make_user("u")).get("/api/v1/dashboard/stats/").json()["lifecycle"]
        self.assertEqual([i["server_name"] for i in stats["expiring"]], ["soon"])
        self.assertEqual([i["server_name"] for i in stats["expired"]], ["gone"])
