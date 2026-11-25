from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.response import Response
from common.mixins import StatusCountsMixin
from apps.network.models import IPAddress
from apps.network.reachability import check_ip_queryset
from .models import Server, Cluster, VirtualMachine
from .serializers import ServerSerializer, ClusterSerializer, VirtualMachineSerializer


class CheckReachabilityMixin:
    """Adds POST <detail-url>/check/ — probe this host's IPs right now and return the result."""

    host_field = None  # "assigned_server" or "assigned_vm"

    @action(detail=True, methods=["post"], url_path="check")
    def check(self, request, pk=None):
        host = self.get_object()
        ips = IPAddress.objects.filter(**{self.host_field: host})
        result = check_ip_queryset(ips)
        fresh = self.get_queryset().get(pk=host.pk)  # re-read so the new results are included
        return Response({"result": result, "host": self.get_serializer(fresh).data})


class ServerViewSet(CheckReachabilityMixin, StatusCountsMixin, viewsets.ModelViewSet):
    host_field = "assigned_server"
    queryset = Server.objects.select_related("owner").prefetch_related(
        "ip_addresses", "services", "virtual_machines"
    ).all()
    serializer_class = ServerSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    search_fields = ["name", "hostname", "location", "manufacturer", "serial_number"]
    filterset_fields = ["status", "owner"]
    ordering_fields = [
        "name", "hostname", "status", "location", "os",
        "warranty_expiry", "end_of_life",
        "created_at", "updated_at",
    ]


class ClusterViewSet(viewsets.ModelViewSet):
    queryset = Cluster.objects.prefetch_related("servers").all()
    serializer_class = ClusterSerializer
    search_fields = ["name"]
    ordering_fields = ["name"]


class VirtualMachineViewSet(CheckReachabilityMixin, StatusCountsMixin, viewsets.ModelViewSet):
    host_field = "assigned_vm"
    queryset = VirtualMachine.objects.select_related(
        "host_server", "owner", "cluster"
    ).prefetch_related(
        "ip_addresses", "applications", "services"
    ).all()
    serializer_class = VirtualMachineSerializer
    search_fields = ["name", "hostname", "os", "os_version"]
    filterset_fields = ["status", "host_server", "cluster", "owner"]
    ordering_fields = [
        "name", "hostname", "status", "os",
        "host_server__name", "created_at", "updated_at",
    ]
