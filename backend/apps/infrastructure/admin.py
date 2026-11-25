from django.contrib import admin
from .models import Server, Cluster, VirtualMachine


@admin.register(Server)
class ServerAdmin(admin.ModelAdmin):
    list_display = ["name", "hostname", "location", "status", "owner", "created_at"]
    list_filter = ["status", "manufacturer"]
    search_fields = ["name", "hostname", "serial_number"]


@admin.register(Cluster)
class ClusterAdmin(admin.ModelAdmin):
    list_display = ["name", "created_at"]
    search_fields = ["name"]


@admin.register(VirtualMachine)
class VirtualMachineAdmin(admin.ModelAdmin):
    list_display = ["hostname", "name", "host_server", "os", "status", "owner"]
    list_filter = ["status", "os"]
    search_fields = ["name", "hostname"]
