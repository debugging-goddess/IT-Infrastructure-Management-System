"""
Signal handlers that write AuditLog entries automatically whenever a tracked
model is created, updated, or deleted. Connected in AuditConfig.ready().

- pre_save:  snapshot the existing row so we can diff old vs new
- post_save: create a CREATE or UPDATE log (with field-level changes)
- post_delete: create a DELETE log
"""

from django.contrib.contenttypes.models import ContentType
from django.db.models import DateTimeField

from .models import AuditLog
from .middleware import get_current_user

# App-label.ModelName of every model we want to audit
TRACKED_MODELS = {
    "infrastructure.Server",
    "infrastructure.VirtualMachine",
    "infrastructure.Cluster",
    "network.IPAddress",
    "network.Subnet",
    "network.VLAN",
    "software.Application",
    "software.Service",
}

# Fields we never record in the diff (noise / internal)
IGNORED_FIELDS = {
    "updated_at", "created_at", "last_login", "password",
    # reachability results change constantly and are not user edits
    "is_reachable", "last_checked_at",
}


def _is_tracked(sender) -> bool:
    label = f"{sender._meta.app_label}.{sender.__name__}"
    return label in TRACKED_MODELS


def _serialise_value(value):
    """Convert a field value into something JSON-friendly for the diff."""
    if value is None:
        return None
    if isinstance(value, (str, int, float, bool)):
        return value
    return str(value)


def _snapshot(instance) -> dict:
    """Capture the current field values of an instance as a plain dict."""
    data = {}
    for field in instance._meta.fields:
        name = field.name
        if name in IGNORED_FIELDS:
            continue
        try:
            value = getattr(instance, field.attname)
        except Exception:
            continue
        if isinstance(field, DateTimeField):
            continue
        data[name] = _serialise_value(value)
    return data


# ---------------------------------------------------------------------------
# Handlers
# ---------------------------------------------------------------------------

def pre_save_handler(sender, instance, **kwargs):
    if not _is_tracked(sender):
        return
    if not instance.pk:
        instance._audit_old = None  # new object
        return
    try:
        old = sender.objects.get(pk=instance.pk)
        instance._audit_old = _snapshot(old)
    except sender.DoesNotExist:
        instance._audit_old = None


def post_save_handler(sender, instance, created, **kwargs):
    if not _is_tracked(sender):
        return

    new_data = _snapshot(instance)
    changes = {}

    if created:
        action = AuditLog.ActionChoices.CREATE
    else:
        action = AuditLog.ActionChoices.UPDATE
        old_data = getattr(instance, "_audit_old", None) or {}
        for key, new_val in new_data.items():
            old_val = old_data.get(key)
            if old_val != new_val:
                changes[key] = [old_val, new_val]
        # Nothing actually changed — skip logging noise
        if not changes:
            return

    AuditLog.objects.create(
        user=get_current_user(),
        action=action,
        content_type=ContentType.objects.get_for_model(sender),
        object_id=instance.pk,
        object_repr=str(instance)[:255],
        changes=changes,
    )


def post_delete_handler(sender, instance, **kwargs):
    if not _is_tracked(sender):
        return
    AuditLog.objects.create(
        user=get_current_user(),
        action=AuditLog.ActionChoices.DELETE,
        content_type=ContentType.objects.get_for_model(sender),
        object_id=instance.pk,
        object_repr=str(instance)[:255],
        changes={},
    )
