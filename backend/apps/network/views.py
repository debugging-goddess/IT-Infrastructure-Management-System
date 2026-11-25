from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import VLAN, Subnet, IPAddress
from .netutils import (
    parse_network, load_ip_pool, used_addresses, next_free_addresses,
)
from .serializers import VLANSerializer, SubnetSerializer, IPAddressSerializer


class VLANViewSet(viewsets.ModelViewSet):
    queryset = VLAN.objects.prefetch_related("subnets").all()
    serializer_class = VLANSerializer
    search_fields = ["name", "vid"]
    ordering_fields = ["vid", "name"]


class SubnetViewSet(viewsets.ModelViewSet):
    queryset = Subnet.objects.select_related("vlan").prefetch_related("ip_addresses").all()
    serializer_class = SubnetSerializer
    search_fields = ["name", "cidr", "description"]
    filterset_fields = ["vlan"]
    ordering_fields = ["cidr", "name", "updated_at"]

    def get_serializer_context(self):
        context = super().get_serializer_context()
        # Load every IP once per request instead of once per subnet
        context["ip_pool"] = load_ip_pool()
        return context

    @action(detail=True, methods=["get"], url_path="next-free")
    def next_free(self, request, pk=None):
        """Suggest the next unused IPs in this subnet. ?count=5 (max 20)."""
        subnet = self.get_object()
        try:
            network = parse_network(subnet.cidr)
        except ValueError:
            return Response({"detail": "This subnet's CIDR is not valid."}, status=400)

        try:
            count = max(1, min(int(request.query_params.get("count", 5)), 20))
        except ValueError:
            count = 5

        used = used_addresses(network, load_ip_pool(), subnet.gateway)
        free = next_free_addresses(network, used, count)
        return Response({
            "subnet": subnet.cidr,
            "free": free,
            "exhausted": len(free) == 0,
        })


class IPAddressViewSet(viewsets.ModelViewSet):
    queryset = IPAddress.objects.select_related(
        "subnet", "assigned_server", "assigned_vm"
    ).all()
    serializer_class = IPAddressSerializer
    search_fields = ["address", "dns_name", "description"]
    filterset_fields = ["status", "subnet", "assigned_server", "assigned_vm"]
    ordering_fields = ["address", "status", "created_at"]
