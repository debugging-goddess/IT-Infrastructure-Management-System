"""User accounts: who may change what, sign-in, and assigning assets to owners."""

from django.test import TestCase
from rest_framework.test import APIClient

from apps.infrastructure.models import Server, VirtualMachine
from apps.users.models import User
from tests.helpers import PASSWORD, client_for, make_user


def url(user):
    return f"/api/v1/users/{user.id}/"


class UserPermissionTests(TestCase):
    def setUp(self):
        self.superuser = make_user("su", is_staff=True, is_superuser=True)
        self.staff = make_user("staff", is_staff=True)
        self.member = make_user("member")
        self.other = make_user("other")

    # ── ordinary users ─────────────────────────────────────────────
    def test_member_cannot_make_themselves_admin(self):
        resp = client_for(self.member).patch(
            url(self.member), {"is_staff": True, "is_superuser": True}, format="json"
        )
        self.assertEqual(resp.status_code, 403)
        self.member.refresh_from_db()
        self.assertFalse(self.member.is_staff)
        self.assertFalse(self.member.is_superuser)

    def test_member_can_edit_own_contact_details(self):
        resp = client_for(self.member).patch(
            url(self.member), {"first_name": "Pat", "phone": "555-0100"}, format="json"
        )
        self.assertEqual(resp.status_code, 200)
        self.member.refresh_from_db()
        self.assertEqual(self.member.phone, "555-0100")

    def test_member_cannot_change_own_asset_manager_flag(self):
        resp = client_for(self.member).patch(
            url(self.member), {"is_asset_manager": True}, format="json"
        )
        self.assertEqual(resp.status_code, 403)

    def test_resending_unchanged_values_is_allowed(self):
        # The edit form sends every field; unchanged role values must not be rejected
        resp = client_for(self.member).patch(
            url(self.member),
            {"first_name": "Pat", "is_staff": False, "is_asset_manager": False},
            format="json",
        )
        self.assertEqual(resp.status_code, 200)

    def test_member_cannot_edit_or_delete_others(self):
        client = client_for(self.member)
        self.assertEqual(client.patch(url(self.other), {"first_name": "X"}, format="json").status_code, 403)
        self.assertEqual(client.delete(url(self.other)).status_code, 403)

    def test_member_cannot_create_users(self):
        resp = client_for(self.member).post(
            "/api/v1/users/",
            {"username": "new", "email": "new@example.com", "password": PASSWORD},
            format="json",
        )
        self.assertEqual(resp.status_code, 403)

    def test_member_can_view_directory(self):
        self.assertEqual(client_for(self.member).get("/api/v1/users/").status_code, 200)

    # ── staff ──────────────────────────────────────────────────────
    def test_staff_can_edit_others(self):
        resp = client_for(self.staff).patch(
            url(self.other), {"is_asset_manager": True, "is_active": False}, format="json"
        )
        self.assertEqual(resp.status_code, 200)

    def test_staff_cannot_grant_admin_rights(self):
        resp = client_for(self.staff).patch(url(self.other), {"is_staff": True}, format="json")
        self.assertEqual(resp.status_code, 403)

    def test_staff_cannot_touch_superuser_accounts(self):
        client = client_for(self.staff)
        self.assertEqual(client.patch(url(self.superuser), {"first_name": "X"}, format="json").status_code, 403)
        self.assertEqual(client.delete(url(self.superuser)).status_code, 403)

    def test_staff_can_create_users(self):
        resp = client_for(self.staff).post(
            "/api/v1/users/",
            {"username": "new", "email": "new@example.com", "password": PASSWORD},
            format="json",
        )
        self.assertEqual(resp.status_code, 201)

    # ── lock-out protection ────────────────────────────────────────
    def test_nobody_can_deactivate_demote_or_delete_themselves(self):
        client = client_for(self.superuser)
        self.assertEqual(client.patch(url(self.superuser), {"is_active": False}, format="json").status_code, 403)
        self.assertEqual(client.patch(url(self.superuser), {"is_superuser": False}, format="json").status_code, 403)
        self.assertEqual(client.delete(url(self.superuser)).status_code, 403)

    def test_superuser_can_grant_staff(self):
        resp = client_for(self.superuser).patch(url(self.member), {"is_staff": True}, format="json")
        self.assertEqual(resp.status_code, 200)
        self.member.refresh_from_db()
        self.assertTrue(self.member.is_staff)


class SignInTests(TestCase):
    def test_token_login_records_last_login(self):
        user = make_user("pat")
        self.assertIsNone(user.last_login)
        resp = APIClient().post(
            "/api/v1/auth/token/", {"email": user.email, "password": PASSWORD}, format="json"
        )
        self.assertEqual(resp.status_code, 200)
        user.refresh_from_db()
        self.assertIsNotNone(user.last_login)

    def test_wrong_password_is_rejected(self):
        user = make_user("pat")
        resp = APIClient().post(
            "/api/v1/auth/token/", {"email": user.email, "password": "wrong"}, format="json"
        )
        self.assertEqual(resp.status_code, 401)

    def test_api_requires_authentication(self):
        self.assertEqual(APIClient().get("/api/v1/servers/").status_code, 401)


class AssignAssetsTests(TestCase):
    def setUp(self):
        self.admin = make_user("admin", is_staff=True)
        self.owner = make_user("owner")
        self.servers = [
            Server.objects.create(name=f"srv{i}", hostname=f"srv{i}.local") for i in range(3)
        ]
        self.vm = VirtualMachine.objects.create(name="vm1", hostname="vm1.local")
        self.assets_url = f"/api/v1/users/{self.owner.id}/assets/"

    def test_assign_and_release(self):
        client = client_for(self.admin)
        ids = [s.id for s in self.servers]
        resp = client.put(self.assets_url, {"servers": {"assign": ids}, "vms": {"assign": [self.vm.id]}}, format="json")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["user"]["owned_server_count"], 3)
        self.assertEqual(resp.json()["user"]["owned_vm_count"], 1)

        resp = client.put(self.assets_url, {"servers": {"release": ids[:2]}}, format="json")
        self.assertEqual(resp.json()["user"]["owned_server_count"], 1)
        self.assertEqual(resp.json()["user"]["owned_vm_count"], 1, "VMs must be left alone")

    def test_release_only_affects_this_users_assets(self):
        someone_else = make_user("someone")
        Server.objects.filter(pk=self.servers[0].pk).update(owner=someone_else)
        client_for(self.admin).put(self.assets_url, {"servers": {"release": [self.servers[0].id]}}, format="json")
        self.assertEqual(Server.objects.get(pk=self.servers[0].pk).owner, someone_else)

    def test_unknown_id_changes_nothing(self):
        resp = client_for(self.admin).put(
            self.assets_url, {"servers": {"assign": [self.servers[0].id, 999999]}}, format="json"
        )
        self.assertEqual(resp.status_code, 400)
        self.assertFalse(Server.objects.filter(owner=self.owner).exists())

    def test_non_staff_cannot_assign(self):
        resp = client_for(self.owner).put(
            self.assets_url, {"servers": {"assign": [self.servers[0].id]}}, format="json"
        )
        self.assertEqual(resp.status_code, 403)

    def test_cannot_assign_to_deactivated_user(self):
        self.owner.is_active = False
        self.owner.save()
        resp = client_for(self.admin).put(
            self.assets_url, {"servers": {"assign": [self.servers[0].id]}}, format="json"
        )
        self.assertEqual(resp.status_code, 400)
