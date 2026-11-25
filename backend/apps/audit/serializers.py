from rest_framework import serializers
from .models import AuditLog


class AuditLogSerializer(serializers.ModelSerializer):
    user_email = serializers.CharField(source="user.email", read_only=True, default=None)
    user_name = serializers.SerializerMethodField()
    model_name = serializers.CharField(source="content_type.model", read_only=True)

    class Meta:
        model = AuditLog
        fields = [
            "id", "user", "user_email", "user_name",
            "action", "model_name",
            "object_id", "object_repr",
            "changes", "timestamp",
        ]
        read_only_fields = fields

    def get_user_name(self, obj) -> str:
        if not obj.user:
            return "System"
        name = f"{obj.user.first_name} {obj.user.last_name}".strip()
        return name or obj.user.username
