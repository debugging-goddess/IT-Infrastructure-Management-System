from django.apps import AppConfig
from django.db.models.signals import pre_save, post_save, post_delete


class AuditConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.audit"
    label = "audit"

    def ready(self):
        # Wire up the audit signal handlers globally. The handlers themselves
        # filter to only the models listed in signals.TRACKED_MODELS.
        from . import signals

        pre_save.connect(signals.pre_save_handler, dispatch_uid="audit_pre_save")
        post_save.connect(signals.post_save_handler, dispatch_uid="audit_post_save")
        post_delete.connect(signals.post_delete_handler, dispatch_uid="audit_post_delete")
