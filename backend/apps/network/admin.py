from django.contrib import admin
from .models import VLAN, Subnet, IPAddress


@admin.register(VLAN)
class VLANAdmin(admin.ModelAdmin):
    list_display = ["vid", "name", "created_at"]
    search_fields = ["name"]


@admin.register(Subnet)
class SubnetAdmin(admin.ModelAdmin):
    list_display = ["cidr", "vlan", "gateway", "created_at"]
    list_filter = ["vlan"]
    search_fields = ["cidr"]


@admin.register(IPAddress)
class IPAddressAdmin(admin.ModelAdmin):
    list_display = ["address", "status", "dns_name", "assigned_server", "assigned_vm", "subnet"]
    list_filter = ["status"]
    search_fields = ["address", "dns_name"]
