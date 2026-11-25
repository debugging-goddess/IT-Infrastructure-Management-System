from django.db import transaction
from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from apps.infrastructure.models import Server, VirtualMachine
from apps.software.models import Application
from .models import User
from .permissions import UserAccountPermission
from .serializers import UserSerializer, UserCreateSerializer

# Request key -> model whose `owner` field this endpoint manages
ASSET_KINDS = {
    "servers": Server,
    "vms": VirtualMachine,
    "applications": Application,
}


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.prefetch_related(
        "owned_servers", "owned_vms", "owned_applications"
    ).all()
    # Object-level rules (self-edit only, superuser protection) live in UserAccountPermission;
    # field-level rules (who may change which field) live in UserSerializer.validate.
    permission_classes = [UserAccountPermission]
    search_fields = ["email", "username", "first_name", "last_name", "phone"]
    filterset_fields = ["is_active", "is_asset_manager", "is_staff"]
    ordering_fields = ["email", "date_joined", "first_name"]

    def get_serializer_class(self):
        if self.action == "create":
            return UserCreateSerializer
        return UserSerializer

    @action(detail=False, methods=["get"], url_path="me")
    def me(self, request):
        """Return the currently authenticated user's profile."""
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

    @action(detail=True, methods=["put"], url_path="assets", permission_classes=[permissions.IsAdminUser])
    def assets(self, request, pk=None):
        """
        Assign assets to this user and/or release assets they own.

        Body (every key is optional):
          {"servers":      {"assign": [ids], "release": [ids]},
           "vms":          {"assign": [ids], "release": [ids]},
           "applications": {"assign": [ids], "release": [ids]}}

        - assign:  these assets become owned by this user (taking them from any other owner).
        - release: these assets lose their owner, but only if this user currently owns them.
        Sending only the changes (not the full list) means a client that has not loaded
        every asset can never release something it did not know about.
        Staff only. Each change goes through save() so it appears in the audit log.
        """
        user = self.get_object()
        if not user.is_active:
            raise ValidationError({"detail": "Cannot assign assets to a deactivated user."})

        def clean_ids(value, where):
            if not isinstance(value, list) or not all(
                isinstance(i, int) and not isinstance(i, bool) for i in value
            ):
                raise ValidationError({where: "Expected a list of ids."})
            return set(value)

        # Validate everything before changing anything
        plan = {}
        for key, model in ASSET_KINDS.items():
            if key not in request.data:
                continue
            block = request.data[key]
            if not isinstance(block, dict):
                raise ValidationError({key: 'Expected {"assign": [...], "release": [...]}.'})
            assign = clean_ids(block.get("assign", []), f"{key}.assign")
            release = clean_ids(block.get("release", []), f"{key}.release")
            if assign & release:
                raise ValidationError({key: f"Ids in both assign and release: {sorted(assign & release)}"})
            known = set(model.objects.filter(pk__in=assign | release).values_list("pk", flat=True))
            missing = (assign | release) - known
            if missing:
                raise ValidationError({key: f"Unknown id(s): {sorted(missing)}"})
            plan[key] = (model, assign, release)

        summary = {}
        with transaction.atomic():
            for key, (model, assign, release) in plan.items():
                released = assigned = 0
                for obj in model.objects.filter(pk__in=release, owner=user):
                    obj.owner = None
                    obj.save(update_fields=["owner", "updated_at"])
                    released += 1
                for obj in model.objects.filter(pk__in=assign).exclude(owner=user):
                    obj.owner = user
                    obj.save(update_fields=["owner", "updated_at"])
                    assigned += 1
                summary[key] = {"assigned": assigned, "released": released}

        fresh = self.get_queryset().get(pk=user.pk)
        return Response({"changes": summary, "user": UserSerializer(fresh).data})
