from rest_framework import serializers
from .models import Application, Service


# -------------------------------------------------------------------
# Lightweight nested serializer for dependencies
# -------------------------------------------------------------------

class NestedDependencySerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    name = serializers.CharField(read_only=True)
    version = serializers.CharField(read_only=True)
    status = serializers.CharField(read_only=True)


# -------------------------------------------------------------------
# Application
# -------------------------------------------------------------------

class ApplicationSerializer(serializers.ModelSerializer):
    """
    Full application serializer.
    - owner_name: display name of the owning user
    - vm_name / server_name: where the app is deployed
    - deployment_target: human-friendly "VM: name" or "Server: name" string
    - dependency_details: nested info about dependency apps
    - dependent_count: how many other apps depend on this one
    """

    owner_name = serializers.SerializerMethodField()
    vm_name = serializers.CharField(source="vm.name", read_only=True, default=None)
    server_name = serializers.CharField(source="server.name", read_only=True, default=None)
    deployment_target = serializers.SerializerMethodField()
    dependency_details = NestedDependencySerializer(source="dependencies", many=True, read_only=True)
    dependent_count = serializers.SerializerMethodField()

    class Meta:
        model = Application
        fields = [
            "id", "name", "version", "description", "status",
            "owner", "owner_name",
            "vm", "vm_name",
            "server", "server_name",
            "deployment_target",
            "port", "url",
            "dependencies", "dependency_details", "dependent_count",
            "notes",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_owner_name(self, obj) -> str | None:
        if obj.owner:
            return obj.owner.get_full_name() or obj.owner.email
        return None

    def get_deployment_target(self, obj) -> str | None:
        if obj.vm:
            return f"VM: {obj.vm.name}"
        if obj.server:
            return f"Server: {obj.server.name}"
        return None

    def get_dependent_count(self, obj) -> int:
        return obj.dependents.count()

    def validate(self, data):
        # An application cannot depend on itself
        dependencies = data.get("dependencies")
        if dependencies and self.instance and self.instance in dependencies:
            raise serializers.ValidationError(
                {"dependencies": "An application cannot depend on itself."}
            )
        return data


class ServiceSerializer(serializers.ModelSerializer):
    vm_name = serializers.CharField(source="vm.name", read_only=True, default=None)
    server_name = serializers.CharField(source="server.name", read_only=True, default=None)

    class Meta:
        model = Service
        fields = [
            "id", "name", "description", "status",
            "vm", "vm_name", "server", "server_name",
            "port", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]
