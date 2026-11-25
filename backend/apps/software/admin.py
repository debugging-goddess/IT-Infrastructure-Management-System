from django.contrib import admin
from .models import Application, Service


@admin.register(Application)
class ApplicationAdmin(admin.ModelAdmin):
    list_display = ["name", "version", "status", "vm", "server", "owner"]
    list_filter = ["status"]
    search_fields = ["name", "version"]
    filter_horizontal = ["dependencies"]


@admin.register(Service)
class ServiceAdmin(admin.ModelAdmin):
    list_display = ["name", "status", "vm", "server", "port"]
    list_filter = ["status"]
    search_fields = ["name"]
