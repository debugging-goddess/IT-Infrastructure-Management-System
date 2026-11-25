from datetime import datetime

from rest_framework import serializers
from apps.network.reachability import summarize_reachability
from .lifecycle import lifecycle_state
from .models import Server, Cluster, VirtualMachine


# -------------------------------------------------------------------
# Lightweight nested serializers (avoid circular imports)
# -------------------------------------------------------------------

class NestedIPAddressSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    address = serializers.CharField(read_only=True)
    dns_name = serializers.CharField(read_only=True)
    status = serializers.CharField(read_only=True)
    is_reachable = serializers.BooleanField(read_only=True, allow_null=True)
    last_checked_at = serializers.DateTimeField(read_only=True, allow_null=True)


class ReachabilityFieldsMixin(serializers.Serializer):
    """
    Adds a roll-up of the host's IP check results to a Server / VM serializer:
      reachability:            "no_ip" | "unknown" | "up" | "down"
      reachability_checked_at: when the most recent IP check ran
      reachability_alert:      "active_but_down" | "inactive_but_up" | null
    """

    reachability = serializers.SerializerMethodField()
    reachability_checked_at = serializers.SerializerMethodField()
    reachability_alert = serializers.SerializerMethodField()

    def _reach(self, obj) -> dict:
        cache = self.context.setdefault("_reach_cache", {})
        key = (type(obj).__name__, obj.pk)
        if key not in cache:
            cache[key] = summarize_reachability(obj.ip_addresses.all(), obj.status)
        return cache[key]

    def get_reachability(self, obj) -> str:
        return self._reach(obj)["reachability"]

    def get_reachability_checked_at(self, obj) -> datetime | None:
        return self._reach(obj)["checked_at"]

    def get_reachability_alert(self, obj) -> str | None:
        return self._reach(obj)["alert"]


class NestedServiceSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    name = serializers.CharField(read_only=True)
    status = serializers.CharField(read_only=True)
    port = serializers.IntegerField(read_only=True, allow_null=True)


class NestedVMSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    name = serializers.CharField(read_only=True)
    hostname = serializers.CharField(read_only=True)
    status = serializers.CharField(read_only=True)


# -------------------------------------------------------------------
# Main serializers
# -------------------------------------------------------------------

class ServerSerializer(ReachabilityFieldsMixin, serializers.ModelSerializer):
    """
    Full server serializer.
    - owner_name: display name of the owning user
    - ip_addresses: all IPs assigned to this server
    - services: all OS-level services running on this server
    - virtual_machines: VMs hosted on this server
    - vm_count / service_count / ip_count: quick summary numbers
    """

    owner_name = serializers.SerializerMethodField()
    ip_addresses = NestedIPAddressSerializer(many=True, read_only=True)
    services = NestedServiceSerializer(many=True, read_only=True)
    virtual_machines = NestedVMSerializer(many=True, read_only=True)

    # Summary counts for the table view
    vm_count = serializers.SerializerMethodField()
    service_count = serializers.SerializerMethodField()
    ip_count = serializers.SerializerMethodField()

    # Lifecycle (derived from the dates below)
    warranty_state = serializers.SerializerMethodField()
    warranty_days_left = serializers.SerializerMethodField()
    eol_state = serializers.SerializerMethodField()
    eol_days_left = serializers.SerializerMethodField()

    class Meta:
        model = Server
        fields = [
            "id", "name", "hostname", "serial_number", "manufacturer", "model",
            "location", "os", "os_version",
            "cpu_cores", "ram_gb", "storage_tb", "status",
            "purchase_date", "warranty_expiry", "end_of_life",
            "warranty_state", "warranty_days_left", "eol_state", "eol_days_left",
            "reachability", "reachability_checked_at", "reachability_alert",
            "owner", "owner_name", "notes",
            "image_front", "image_rear",
            "ip_addresses", "ip_count",
            "services", "service_count",
            "virtual_machines", "vm_count",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_owner_name(self, obj) -> str | None:
        if obj.owner:
            return obj.owner.get_full_name() or obj.owner.email
        return None

    def get_vm_count(self, obj) -> int:
        return obj.virtual_machines.count()

    def get_service_count(self, obj) -> int:
        return obj.services.count()

    def get_ip_count(self, obj) -> int:
        return obj.ip_addresses.count()

    def get_warranty_state(self, obj) -> str:
        return lifecycle_state(obj.warranty_expiry)[0]

    def get_warranty_days_left(self, obj) -> int | None:
        return lifecycle_state(obj.warranty_expiry)[1]

    def get_eol_state(self, obj) -> str:
        return lifecycle_state(obj.end_of_life)[0]

    def get_eol_days_left(self, obj) -> int | None:
        return lifecycle_state(obj.end_of_life)[1]


class NestedApplicationSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    name = serializers.CharField(read_only=True)
    version = serializers.CharField(read_only=True)
    status = serializers.CharField(read_only=True)
    port = serializers.IntegerField(read_only=True, allow_null=True)
    url = serializers.CharField(read_only=True)


class ClusterSerializer(serializers.ModelSerializer):
    class Meta:
        model = Cluster
        fields = "__all__"
        read_only_fields = ["id", "created_at", "updated_at"]


class VirtualMachineSerializer(ReachabilityFieldsMixin, serializers.ModelSerializer):
    """
    Full VM serializer.
    - host_server_name: display name of the host physical server
    - owner_name: display name of the owning user
    - ip_addresses: IPs assigned to this VM
    - applications: apps deployed on this VM
    - services: OS-level services running on this VM
    - counts for each relation
    """

    host_server_name = serializers.CharField(source="host_server.name", read_only=True)
    cluster_name = serializers.CharField(source="cluster.name", read_only=True)
    owner_name = serializers.SerializerMethodField()

    ip_addresses = NestedIPAddressSerializer(many=True, read_only=True)
    applications = NestedApplicationSerializer(many=True, read_only=True)
    services = NestedServiceSerializer(many=True, read_only=True)

    ip_count = serializers.SerializerMethodField()
    app_count = serializers.SerializerMethodField()
    service_count = serializers.SerializerMethodField()

    class Meta:
        model = VirtualMachine
        fields = [
            "id", "name", "hostname",
            "host_server", "host_server_name",
            "cluster", "cluster_name",
            "os", "os_version",
            "vcpu", "ram_gb", "disk_gb",
            "status",
            "reachability", "reachability_checked_at", "reachability_alert",
            "owner", "owner_name",
            "notes",
            "ip_addresses", "ip_count",
            "applications", "app_count",
            "services", "service_count",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_owner_name(self, obj) -> str | None:
        if obj.owner:
            return obj.owner.get_full_name() or obj.owner.email
        return None

    def get_ip_count(self, obj) -> int:
        return obj.ip_addresses.count()

    def get_app_count(self, obj) -> int:
        return obj.applications.count()

    def get_service_count(self, obj) -> int:
        return obj.services.count()
