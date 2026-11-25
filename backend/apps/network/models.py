from django.db import models
from apps.infrastructure.models import Server, VirtualMachine


class VLAN(models.Model):
    """A Virtual LAN."""

    vid = models.PositiveSmallIntegerField(unique=True, verbose_name="VLAN ID")
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "VLAN"
        verbose_name_plural = "VLANs"
        ordering = ["vid"]

    def __str__(self):
        return f"VLAN {self.vid} ({self.name})"


class Subnet(models.Model):
    """An IP subnet / prefix."""

    name = models.CharField(max_length=255, blank=True)  # friendly label, e.g. "Office LAN"
    cidr = models.CharField(max_length=50, unique=True)  # e.g. 192.168.1.0/24
    netmask = models.GenericIPAddressField(null=True, blank=True)  # e.g. 255.255.255.0
    description = models.TextField(blank=True)
    vlan = models.ForeignKey(VLAN, on_delete=models.SET_NULL, null=True, blank=True, related_name="subnets")
    gateway = models.GenericIPAddressField(null=True, blank=True)
    dns_servers = models.CharField(max_length=255, blank=True)  # comma-separated, e.g. "8.8.8.8, 8.8.4.4"
    dhcp_enabled = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Subnet"
        verbose_name_plural = "Subnets"
        ordering = ["cidr"]

    def __str__(self):
        return self.cidr


class IPAddress(models.Model):
    """An individual IP address, optionally assigned to a server or VM interface."""

    class StatusChoices(models.TextChoices):
        ACTIVE = "active", "Active"
        RESERVED = "reserved", "Reserved"
        DEPRECATED = "deprecated", "Deprecated"
        DHCP = "dhcp", "DHCP"

    address = models.GenericIPAddressField(unique=True)
    subnet = models.ForeignKey(Subnet, on_delete=models.SET_NULL, null=True, blank=True, related_name="ip_addresses")
    status = models.CharField(max_length=20, choices=StatusChoices.choices, default=StatusChoices.ACTIVE)
    dns_name = models.CharField(max_length=255, blank=True)
    description = models.TextField(blank=True)

    # Result of the last reachability check (null = never checked)
    is_reachable = models.BooleanField(null=True, blank=True)
    last_checked_at = models.DateTimeField(null=True, blank=True)

    # Assignment — can belong to a server or a VM (not both)
    assigned_server = models.ForeignKey(
        Server, on_delete=models.SET_NULL, null=True, blank=True, related_name="ip_addresses"
    )
    assigned_vm = models.ForeignKey(
        VirtualMachine, on_delete=models.SET_NULL, null=True, blank=True, related_name="ip_addresses"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "IP Address"
        verbose_name_plural = "IP Addresses"
        ordering = ["address"]

    def __str__(self):
        return self.address
