from rest_framework import serializers
from .models import VLAN, Subnet, IPAddress
from .netutils import (
    parse_network, address_in_network, usable_host_count,
    load_ip_pool, used_addresses,
)


class VLANSerializer(serializers.ModelSerializer):
    subnet_count = serializers.SerializerMethodField()

    class Meta:
        model = VLAN
        fields = [
            "id", "vid", "name", "description",
            "subnet_count", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_subnet_count(self, obj) -> int:
        return obj.subnets.count()


class SubnetSerializer(serializers.ModelSerializer):
    vlan_name = serializers.CharField(source="vlan.name", read_only=True, default=None)
    vlan_vid = serializers.IntegerField(source="vlan.vid", read_only=True, default=None)
    ip_count = serializers.SerializerMethodField()

    # Utilisation, worked out from the addresses themselves (not the subnet link)
    total_hosts = serializers.SerializerMethodField()
    used_count = serializers.SerializerMethodField()
    free_count = serializers.SerializerMethodField()
    utilization_pct = serializers.SerializerMethodField()

    class Meta:
        model = Subnet
        fields = [
            "id", "name", "cidr", "netmask", "description",
            "vlan", "vlan_name", "vlan_vid",
            "gateway", "dns_servers", "dhcp_enabled", "ip_count",
            "total_hosts", "used_count", "free_count", "utilization_pct",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    # ── utilisation ────────────────────────────────────────────────
    def _stats(self, obj) -> dict:
        """Compute once per subnet per serialisation and reuse for all four fields."""
        cache = self.context.setdefault("_subnet_stats", {})
        if obj.pk in cache:
            return cache[obj.pk]
        stats = {"total": None, "used": 0, "free": None, "pct": None}
        try:
            net = parse_network(obj.cidr)
        except ValueError:
            cache[obj.pk] = stats
            return stats
        pool = self.context.get("ip_pool")
        if pool is None:
            pool = self.context["ip_pool"] = load_ip_pool()
        used = len(used_addresses(net, pool, obj.gateway))
        total = usable_host_count(net)
        stats["used"] = used
        if total:
            stats["total"] = total
            stats["free"] = max(total - used, 0)
            stats["pct"] = round(min(used / total, 1) * 100, 1)
        cache[obj.pk] = stats
        return stats

    def get_ip_count(self, obj) -> int:
        return obj.ip_addresses.count()

    def get_total_hosts(self, obj) -> int | None:
        return self._stats(obj)["total"]

    def get_used_count(self, obj) -> int:
        return self._stats(obj)["used"]

    def get_free_count(self, obj) -> int | None:
        return self._stats(obj)["free"]

    def get_utilization_pct(self, obj) -> float | None:
        return self._stats(obj)["pct"]

    # ── validation ─────────────────────────────────────────────────
    def validate(self, data):
        # Only re-check network details when one of them is actually being changed,
        # so editing e.g. the description never trips over older inconsistent data.
        if not any(k in data for k in ("cidr", "netmask", "gateway")):
            return data

        inst = self.instance
        cidr = data.get("cidr", getattr(inst, "cidr", None))
        try:
            net = parse_network(cidr)
        except ValueError:
            raise serializers.ValidationError(
                {"cidr": "Enter a valid network in CIDR notation, e.g. 192.168.1.0/24."}
            )

        netmask = data.get("netmask") if "netmask" in data else None
        if net.version == 4:
            if netmask:
                if str(netmask) != str(net.netmask):
                    raise serializers.ValidationError({
                        "netmask": f"Subnet mask {netmask} does not match {cidr} (expected {net.netmask}).",
                    })
            elif "cidr" in data or "netmask" in data:
                # Fill the mask in from the CIDR so the two can never disagree
                data["netmask"] = str(net.netmask)
        elif netmask:
            raise serializers.ValidationError(
                {"netmask": "Subnet masks apply to IPv4 only. IPv6 subnets use the prefix length."}
            )

        gateway = data.get("gateway", getattr(inst, "gateway", None))
        if gateway and not address_in_network(gateway, net):
            raise serializers.ValidationError(
                {"gateway": f"Gateway {gateway} is not inside {cidr}."}
            )
        return data


class IPAddressSerializer(serializers.ModelSerializer):
    subnet_cidr = serializers.CharField(source="subnet.cidr", read_only=True, default=None)
    assigned_server_name = serializers.CharField(source="assigned_server.name", read_only=True, default=None)
    assigned_vm_name = serializers.CharField(source="assigned_vm.name", read_only=True, default=None)
    assignment = serializers.SerializerMethodField()

    class Meta:
        model = IPAddress
        fields = [
            "id", "address", "status", "dns_name", "description",
            "subnet", "subnet_cidr",
            "assigned_server", "assigned_server_name",
            "assigned_vm", "assigned_vm_name",
            "assignment",
            "is_reachable", "last_checked_at",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "is_reachable", "last_checked_at", "created_at", "updated_at"]

    def get_assignment(self, obj) -> str | None:
        if obj.assigned_server:
            return f"Server: {obj.assigned_server.name}"
        if obj.assigned_vm:
            return f"VM: {obj.assigned_vm.name}"
        return None

    def validate(self, data):
        # Resolve values considering partial updates
        server = data.get("assigned_server", getattr(self.instance, "assigned_server", None))
        vm = data.get("assigned_vm", getattr(self.instance, "assigned_vm", None))
        if server and vm:
            raise serializers.ValidationError(
                "An IP address can only be assigned to either a server or a VM, not both."
            )

        # The address must sit inside its subnet. Only checked when the address or the
        # subnet is being changed, so unrelated edits (e.g. unassigning) are never blocked.
        if "address" in data or "subnet" in data:
            address = data.get("address", getattr(self.instance, "address", None))
            subnet = data.get("subnet", getattr(self.instance, "subnet", None))
            if address and subnet:
                try:
                    net = parse_network(subnet.cidr)
                except ValueError:
                    net = None  # subnet itself is malformed; do not block saving the IP
                if net is not None and not address_in_network(address, net):
                    raise serializers.ValidationError(
                        {"address": f"{address} is not inside the subnet {subnet.cidr}."}
                    )
        return data
