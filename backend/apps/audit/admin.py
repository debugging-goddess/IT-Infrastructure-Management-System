from django.contrib import admin
from .models import AuditLog


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ["timestamp", "action", "object_repr", "user", "content_type"]
    list_filter = ["action", "content_type"]
    search_fields = ["object_repr", "user__email"]
    readonly_fields = ["user", "action", "content_type", "object_id", "object_repr", "changes", "timestamp"]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False
