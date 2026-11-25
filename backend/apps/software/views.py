from rest_framework import viewsets
from common.mixins import StatusCountsMixin
from .models import Application, Service
from .serializers import ApplicationSerializer, ServiceSerializer


class ApplicationViewSet(StatusCountsMixin, viewsets.ModelViewSet):
    queryset = Application.objects.select_related("owner", "vm", "server").prefetch_related(
        "dependencies", "dependents"
    ).all()
    serializer_class = ApplicationSerializer
    search_fields = ["name", "version", "description"]
    filterset_fields = ["status", "vm", "server", "owner"]
    ordering_fields = ["name", "version", "status", "port", "created_at", "updated_at"]


class ServiceViewSet(viewsets.ModelViewSet):
    queryset = Service.objects.select_related("vm", "server").all()
    serializer_class = ServiceSerializer
    search_fields = ["name", "description"]
    filterset_fields = ["status", "vm", "server"]
    ordering_fields = ["name", "created_at"]
