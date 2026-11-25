from django.db.models import Count
from rest_framework.decorators import action
from rest_framework.response import Response


class StatusCountsMixin:
    """
    Adds GET <list-url>/status-counts/ to a viewset whose model has a `status` field.

    Returns the count of records per status across the WHOLE result set (not just
    the current page), so a status summary strip stays accurate with pagination.
    It honours `search`, so the strip matches what the user is searching for. The
    frontend does not send `status` to this endpoint, which keeps every status
    visible at once.
    """

    @action(detail=False, methods=["get"], url_path="status-counts")
    def status_counts(self, request):
        queryset = self.filter_queryset(self.get_queryset())
        # order_by() clears any ordering so it cannot leak into the GROUP BY
        rows = queryset.order_by().values("status").annotate(n=Count("id"))
        counts = {row["status"]: row["n"] for row in rows}
        return Response({"counts": counts, "total": sum(counts.values())})
