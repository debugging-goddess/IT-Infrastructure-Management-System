from rest_framework import serializers
from rest_framework.exceptions import PermissionDenied
from .models import User

# Fields anyone may change on their own account
SELF_EDITABLE_FIELDS = {"first_name", "last_name", "phone", "department"}
# Fields only staff may change (on accounts other than their own superuser-protected ones)
STAFF_ONLY_FIELDS = {"username", "email", "is_asset_manager", "is_active"}
# Fields only superusers may change
SUPERUSER_ONLY_FIELDS = {"is_staff", "is_superuser"}


class UserSerializer(serializers.ModelSerializer):
    """
    Full user serializer for the directory view.
    - full_name: combined first + last name (falls back to username)
    - owned_server_count / owned_vm_count / owned_application_count:
      how much infrastructure this person is responsible for
    """

    full_name = serializers.SerializerMethodField()
    owned_server_count = serializers.SerializerMethodField()
    owned_vm_count = serializers.SerializerMethodField()
    owned_application_count = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id", "username", "email",
            "first_name", "last_name", "full_name",
            "department", "phone",
            "is_asset_manager", "is_staff", "is_superuser", "is_active",
            "owned_server_count", "owned_vm_count", "owned_application_count",
            "date_joined", "last_login",
        ]
        read_only_fields = ["id", "date_joined", "last_login"]

    def get_full_name(self, obj) -> str:
        name = f"{obj.first_name} {obj.last_name}".strip()
        return name or obj.username

    def get_owned_server_count(self, obj) -> int:
        return obj.owned_servers.count()

    def get_owned_vm_count(self, obj) -> int:
        return obj.owned_vms.count()

    def get_owned_application_count(self, obj) -> int:
        return obj.owned_applications.count()

    def validate(self, data):
        """
        Check every field being changed against what the requester may change.
        Rejecting (rather than silently ignoring) makes a blocked change obvious.
        """
        request = self.context.get("request")
        if request is None or self.instance is None:
            return data

        actor = request.user
        target = self.instance
        changing = {k for k, v in data.items() if getattr(target, k, None) != v}

        if actor.is_superuser:
            allowed = SELF_EDITABLE_FIELDS | STAFF_ONLY_FIELDS | SUPERUSER_ONLY_FIELDS
        elif actor.is_staff:
            allowed = SELF_EDITABLE_FIELDS | STAFF_ONLY_FIELDS
        else:
            allowed = SELF_EDITABLE_FIELDS

        blocked = changing - allowed
        if blocked:
            raise PermissionDenied(
                f"You are not allowed to change: {', '.join(sorted(blocked))}."
            )

        # Guard against locking yourself out
        if target.pk == actor.pk:
            if data.get("is_active") is False:
                raise PermissionDenied("You cannot deactivate your own account.")
            if (target.is_staff and data.get("is_staff") is False) or (
                target.is_superuser and data.get("is_superuser") is False
            ):
                raise PermissionDenied("You cannot remove your own admin rights.")
        return data


class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = [
            "username", "email", "password",
            "first_name", "last_name",
            "department", "phone", "is_asset_manager",
        ]

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)
