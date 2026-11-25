from rest_framework import viewsets, permissions, mixins
from django_filters import rest_framework as filters
from .models import AuditLog
from .serializers import AuditLogSerializer


class AuditLogFilter(filters.FilterSet):
    """Supports filtering by action, user, model type, and a date range."""

    date_from = filters.IsoDateTimeFilter(field_name="timestamp", lookup_expr="gte")
    date_to = filters.IsoDateTimeFilter(field_name="timestamp", lookup_expr="lte")
    model = filters.CharFilter(field_name="content_type__model", lookup_expr="iexact")

    class Meta:
        model = AuditLog
        fields = ["action", "user", "content_type", "model", "date_from", "date_to"]


class AuditLogViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    """Read-only viewset for audit logs. Only staff can access."""

    queryset = AuditLog.objects.select_related("user", "content_type").all()
    serializer_class = AuditLogSerializer
    permission_classes = [permissions.IsAdminUser]
    filterset_class = AuditLogFilter
    search_fields = ["object_repr", "user__email", "user__username"]
    ordering_fields = ["timestamp"]
    ordering = ["-timestamp"]
