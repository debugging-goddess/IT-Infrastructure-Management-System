"""
Who may change user accounts.

  - Any signed-in user may view the directory.
  - A user may edit their own profile (a limited set of fields, see the serializer).
  - Staff may edit other accounts.
  - Only superusers may change or remove a superuser account.
"""

from rest_framework import permissions


def is_staff(user) -> bool:
    return bool(user and user.is_authenticated and (user.is_staff or user.is_superuser))


class UserAccountPermission(permissions.BasePermission):
    message = "You can only edit your own profile."

    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        if view.action in ("create", "destroy") and not is_staff(request.user):
            self.message = "Only staff can create or delete users."
            return False
        return True

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True

        actor = request.user
        if view.action == "destroy" and obj.pk == actor.pk:
            self.message = "You cannot delete your own account."
            return False
        if obj.is_superuser and not actor.is_superuser:
            self.message = "Only a superuser can change a superuser account."
            return False
        if obj.pk == actor.pk:
            return True
        if is_staff(actor):
            return True
        self.message = "You can only edit your own profile."
        return False
