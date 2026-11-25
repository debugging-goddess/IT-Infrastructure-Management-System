"""Audit trail: every change is recorded with who made it and what changed."""

from django.test import TestCase

from apps.audit.models import AuditLog
from apps.network.models import IPAddress
from tests.helpers import client_for, jwt_client_for, make_user


class AuditTrailTests(TestCase):
    def setUp(self):
        self.admin = make_user("admin", is_staff=True)
        # Sign in for real so the audit middleware sees who is acting
        self.client = jwt_client_for(self.admin)

    def test_create_update_delete_are_logged_with_user_and_diff(self):
        server_id = self.client.post(
            "/api/v1/servers/",
            {"name": "audit01", "hostname": "audit01.local", "status": "active", "ram_gb": 64},
            format="json",
        ).json()["id"]
        self.client.patch(f"/api/v1/servers/{server_id}/", {"status": "maintenance", "ram_gb": 128}, format="json")
        self.client.delete(f"/api/v1/servers/{server_id}/")

        logs = list(AuditLog.objects.filter(object_repr="audit01").order_by("id"))
        self.assertEqual([log.action for log in logs], ["create", "update", "delete"])
        self.assertTrue(all(log.user_id == self.admin.id for log in logs))
        self.assertEqual(logs[1].changes["status"], ["active", "maintenance"])
        self.assertEqual(logs[1].changes["ram_gb"], [64, 128])

    def test_saving_without_real_changes_is_not_logged(self):
        server_id = self.client.post(
            "/api/v1/servers/", {"name": "quiet", "hostname": "quiet.local"}, format="json"
        ).json()["id"]
        before = AuditLog.objects.count()
        self.client.patch(f"/api/v1/servers/{server_id}/", {"name": "quiet"}, format="json")
        self.assertEqual(AuditLog.objects.count(), before)

    def test_reachability_results_are_not_audited(self):
        ip = IPAddress.objects.create(address="192.0.2.50")
        before = AuditLog.objects.count()
        ip.is_reachable = True
        ip.save()
        self.assertEqual(AuditLog.objects.count(), before)


class AuditAccessTests(TestCase):
    def test_only_staff_can_read_the_audit_log(self):
        self.assertEqual(client_for(make_user("member")).get("/api/v1/audit-logs/").status_code, 403)
        self.assertEqual(client_for(make_user("boss", is_staff=True)).get("/api/v1/audit-logs/").status_code, 200)
