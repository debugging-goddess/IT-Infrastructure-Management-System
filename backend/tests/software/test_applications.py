"""Applications: deployment target and dependencies."""

from django.test import TestCase

from apps.infrastructure.models import VirtualMachine
from apps.software.models import Application
from tests.helpers import client_for, make_user


class ApplicationApiTests(TestCase):
    def setUp(self):
        self.client = client_for(make_user("admin", is_staff=True))

    def test_create_deployed_on_vm(self):
        vm = VirtualMachine.objects.create(name="app-vm", hostname="app-vm.local")
        resp = self.client.post(
            "/api/v1/applications/",
            {"name": "Billing API", "version": "2.1", "status": "running", "vm": vm.id},
            format="json",
        )
        self.assertEqual(resp.status_code, 201, resp.content)
        self.assertEqual(resp.json()["deployment_target"], "VM: app-vm")

    def test_dependencies_and_dependent_count(self):
        db = Application.objects.create(name="Database")
        api = self.client.post(
            "/api/v1/applications/", {"name": "API", "dependencies": [db.id]}, format="json"
        ).json()
        self.assertEqual(api["dependency_details"][0]["name"], "Database")
        self.assertEqual(self.client.get(f"/api/v1/applications/{db.id}/").json()["dependent_count"], 1)

    def test_application_cannot_depend_on_itself(self):
        app = Application.objects.create(name="Loop")
        resp = self.client.patch(
            f"/api/v1/applications/{app.id}/", {"dependencies": [app.id]}, format="json"
        )
        self.assertEqual(resp.status_code, 400)
