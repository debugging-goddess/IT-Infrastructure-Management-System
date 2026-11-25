from django.db import models
from django.conf import settings


class StatusChoices(models.TextChoices):
    ACTIVE = "active", "Active"           # Racked, powered on, running
    INACTIVE = "inactive", "Inactive"     # Racked but powered off / not running
    UNRACKED = "unracked", "Unracked"     # Previously racked, now removed from rack
    MAINTENANCE = "maintenance", "Maintenance"
    DECOMMISSIONED = "decommissioned", "Decommissioned"


class Server(models.Model):
    """A physical server in the infrastructure."""

    name = models.CharField(max_length=255, unique=True)
    hostname = models.CharField(max_length=255, unique=True)
    serial_number = models.CharField(max_length=100, blank=True)
    manufacturer = models.CharField(max_length=100, blank=True)
    model = models.CharField(max_length=100, blank=True)
    location = models.CharField(max_length=255, blank=True)  # e.g. datacenter/rack
    os = models.CharField(max_length=100, blank=True, verbose_name="Operating System")
    os_version = models.CharField(max_length=50, blank=True)
    cpu_cores = models.PositiveIntegerField(null=True, blank=True)
    ram_gb = models.PositiveIntegerField(null=True, blank=True)
    storage_tb = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    # Lifecycle tracking (all optional)
    purchase_date = models.DateField(null=True, blank=True)
    warranty_expiry = models.DateField(null=True, blank=True)
    end_of_life = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=StatusChoices.choices, default=StatusChoices.ACTIVE)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name="owned_servers"
    )
    image_front = models.ImageField(upload_to="servers/images/", null=True, blank=True)
    image_rear = models.ImageField(upload_to="servers/images/", null=True, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Server"
        verbose_name_plural = "Servers"
        ordering = ["name"]

    def __str__(self):
        return self.name


class Cluster(models.Model):
    """A logical grouping of servers (e.g. a hypervisor cluster)."""

    name = models.CharField(max_length=255, unique=True)
    description = models.TextField(blank=True)
    servers = models.ManyToManyField(Server, blank=True, related_name="clusters")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Cluster"
        verbose_name_plural = "Clusters"
        ordering = ["name"]

    def __str__(self):
        return self.name


class VirtualMachine(models.Model):
    """A virtual machine hosted on a physical server."""

    name = models.CharField(max_length=255)
    hostname = models.CharField(max_length=255, unique=True)
    host_server = models.ForeignKey(
        Server, on_delete=models.SET_NULL, null=True, blank=True, related_name="virtual_machines"
    )
    cluster = models.ForeignKey(
        Cluster, on_delete=models.SET_NULL, null=True, blank=True, related_name="virtual_machines"
    )
    os = models.CharField(max_length=100, blank=True, verbose_name="Operating System")
    os_version = models.CharField(max_length=50, blank=True)
    vcpu = models.PositiveIntegerField(null=True, blank=True, verbose_name="vCPUs")
    ram_gb = models.PositiveIntegerField(null=True, blank=True)
    disk_gb = models.PositiveIntegerField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=StatusChoices.choices, default=StatusChoices.ACTIVE)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name="owned_vms"
    )
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Virtual Machine"
        verbose_name_plural = "Virtual Machines"
        ordering = ["name"]

    def __str__(self):
        return self.hostname
