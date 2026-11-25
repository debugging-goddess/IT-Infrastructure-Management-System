from django.db import models
from django.conf import settings
from apps.infrastructure.models import VirtualMachine, Server


class Application(models.Model):
    """A software application that can be deployed on infrastructure."""

    class StatusChoices(models.TextChoices):
        RUNNING = "running", "Running"
        STOPPED = "stopped", "Stopped"
        DEGRADED = "degraded", "Degraded"
        MAINTENANCE = "maintenance", "Maintenance"
        DECOMMISSIONED = "decommissioned", "Decommissioned"

    name = models.CharField(max_length=255)
    version = models.CharField(max_length=50, blank=True)
    description = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=StatusChoices.choices, default=StatusChoices.RUNNING)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name="owned_applications"
    )
    # Where is this app deployed?
    vm = models.ForeignKey(
        VirtualMachine, on_delete=models.SET_NULL, null=True, blank=True, related_name="applications"
    )
    server = models.ForeignKey(
        Server, on_delete=models.SET_NULL, null=True, blank=True, related_name="applications"
    )
    port = models.PositiveIntegerField(null=True, blank=True)
    url = models.URLField(blank=True)
    # Application dependencies
    dependencies = models.ManyToManyField("self", symmetrical=False, blank=True, related_name="dependents")
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Application"
        verbose_name_plural = "Applications"
        ordering = ["name"]

    def __str__(self):
        return f"{self.name} ({self.version})" if self.version else self.name


class Service(models.Model):
    """An OS-level service or daemon running on a VM or server."""

    class StatusChoices(models.TextChoices):
        RUNNING = "running", "Running"
        STOPPED = "stopped", "Stopped"
        FAILED = "failed", "Failed"

    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=StatusChoices.choices, default=StatusChoices.RUNNING)
    vm = models.ForeignKey(
        VirtualMachine, on_delete=models.SET_NULL, null=True, blank=True, related_name="services"
    )
    server = models.ForeignKey(
        Server, on_delete=models.SET_NULL, null=True, blank=True, related_name="services"
    )
    port = models.PositiveIntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Service"
        verbose_name_plural = "Services"
        ordering = ["name"]

    def __str__(self):
        return self.name
