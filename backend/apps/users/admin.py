from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ["email", "username", "department", "is_asset_manager", "is_active"]
    list_filter = ["is_asset_manager", "is_active", "is_staff"]
    search_fields = ["email", "username", "department"]
    fieldsets = BaseUserAdmin.fieldsets + (
        ("IT Asset Info", {"fields": ("department", "phone", "is_asset_manager")}),
    )
