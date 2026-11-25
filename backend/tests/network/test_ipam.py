"""IP address management: subnet validation, utilisation, next free IP, reachability."""

import ipaddress
from unittest import mock

from django.test import TestCase

from apps.infrastructure.models import Server
from apps.network.models import IPAddress, Subnet
from apps.network.netutils import next_free_addresses, usable_host_count
from apps.network.reachability import probe_address, summarize_reachability
from tests.helpers import client_for, make_user


class NetUtilsTests(TestCase):
    def test_usable_host_count(self):
        self.assertEqual(usable_host_count(ipaddress.ip_network("10.0.0.0/24")), 254)
        self.assertEqual(usable_host_count(ipaddress.ip_network("10.0.0.0/31")), 2)
        self.assertEqual(usable_host_count(ipaddress.ip_network("10.0.0.1/32")), 1)
        self.assertIsNone(usable_host_count(ipaddress.ip_network("2001:db8::/64")))

    def test_next_free_skips_used(self):
        net = ipaddress.ip_network("10.0.0.0/29")
        used = {ipaddress.ip_address("10.0.0.1"), ipaddress.ip_address("10.0.0.2")}
        self.assertEqual(next_free_addresses(net, used, 2), ["10.0.0.3", "10.0.0.4"])


class SubnetApiTests(TestCase):
    def setUp(self):
        self.client = client_for(make_user("admin", is_staff=True))

    def post_subnet(self, **data):
        return self.client.post("/api/v1/subnets/", data, format="json")

    def test_netmask_is_filled_in_from_cidr(self):
        resp = self.post_subnet(cidr="10.20.0.0/24", gateway="10.20.0.1")
        self.assertEqual(resp.status_code, 201, resp.content)
        self.assertEqual(resp.json()["netmask"], "255.255.255.0")

    def test_rejects_mismatched_mask(self):
        resp = self.post_subnet(cidr="10.20.0.0/24", netmask="255.255.0.0")
        self.assertEqual(resp.status_code, 400)
        self.assertIn("netmask", resp.json())

    def test_rejects_gateway_outside_subnet(self):
        resp = self.post_subnet(cidr="10.20.0.0/24", gateway="10.99.0.1")
        self.assertEqual(resp.status_code, 400)
        self.assertIn("gateway", resp.json())

    def test_rejects_invalid_cidr(self):
        self.assertEqual(self.post_subnet(cidr="not-a-network").status_code, 400)

    def test_ip_must_be_inside_its_subnet(self):
        subnet = Subnet.objects.create(cidr="10.30.0.0/24")
        bad = self.client.post("/api/v1/ip-addresses/", {"address": "10.31.0.5", "subnet": subnet.id, "status": "active"}, format="json")
        self.assertEqual(bad.status_code, 400)
        good = self.client.post("/api/v1/ip-addresses/", {"address": "10.30.0.5", "subnet": subnet.id, "status": "active"}, format="json")
        self.assertEqual(good.status_code, 201)

    def test_utilisation_and_next_free(self):
        subnet = Subnet.objects.create(cidr="10.40.0.0/24", gateway="10.40.0.1")
        IPAddress.objects.create(address="10.40.0.2")
        IPAddress.objects.create(address="10.40.0.3")

        data = self.client.get(f"/api/v1/subnets/{subnet.id}/").json()
        self.assertEqual(data["total_hosts"], 254)
        self.assertEqual(data["used_count"], 3)  # gateway + two IPs
        self.assertEqual(data["free_count"], 251)

        free = self.client.get(f"/api/v1/subnets/{subnet.id}/next-free/", {"count": 2}).json()
        self.assertEqual(free["free"], ["10.40.0.4", "10.40.0.5"])

    def test_full_subnet_reports_exhausted(self):
        subnet = Subnet.objects.create(cidr="10.50.0.0/30")
        IPAddress.objects.create(address="10.50.0.1")
        IPAddress.objects.create(address="10.50.0.2")
        free = self.client.get(f"/api/v1/subnets/{subnet.id}/next-free/").json()
        self.assertTrue(free["exhausted"])

    def test_ip_cannot_belong_to_server_and_vm(self):
        from apps.infrastructure.models import VirtualMachine
        server = Server.objects.create(name="s", hostname="s.local")
        vm = VirtualMachine.objects.create(name="v", hostname="v.local")
        resp = self.client.post(
            "/api/v1/ip-addresses/",
            {"address": "10.60.0.1", "assigned_server": server.id, "assigned_vm": vm.id},
            format="json",
        )
        self.assertEqual(resp.status_code, 400)


class FakeIP:
    def __init__(self, reachable, checked_at=None):
        self.is_reachable = reachable
        self.last_checked_at = checked_at


class ReachabilityTests(TestCase):
    def test_summary_states_and_alerts(self):
        self.assertEqual(summarize_reachability([], "active")["reachability"], "no_ip")
        self.assertEqual(summarize_reachability([FakeIP(None)], "active")["reachability"], "unknown")
        self.assertEqual(summarize_reachability([FakeIP(False)], "active")["alert"], "active_but_down")
        self.assertEqual(summarize_reachability([FakeIP(True)], "decommissioned")["alert"], "inactive_but_up")
        self.assertIsNone(summarize_reachability([FakeIP(False), FakeIP(True)], "active")["alert"])
        self.assertIsNone(summarize_reachability([FakeIP(False)], "maintenance")["alert"])

    def test_probe_rejects_anything_that_is_not_an_ip(self):
        self.assertFalse(probe_address("1.2.3.4; rm -rf /"))
        self.assertFalse(probe_address("--help"))

    def test_check_now_endpoint_stores_result(self):
        server = Server.objects.create(name="s", hostname="s.local", status="active")
        IPAddress.objects.create(address="192.0.2.10", assigned_server=server)
        with mock.patch("apps.network.reachability.probe_address", return_value=False):
            resp = client_for(make_user("u")).post(f"/api/v1/servers/{server.id}/check/")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["host"]["reachability"], "down")
        self.assertEqual(resp.json()["host"]["reachability_alert"], "active_but_down")
        self.assertFalse(IPAddress.objects.get(address="192.0.2.10").is_reachable)
