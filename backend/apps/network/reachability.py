"""
Reachability checks for the IP addresses assigned to servers and VMs.

A host counts as "responding" if ANY probe gets an answer:
  * an ICMP echo reply (a ping, sent from Python so no `ping` binary is needed; this
    requires the process to be allowed to open a raw socket, which root in a Docker
    container is by default), or
  * a TCP connection to a common port or one of the host's recorded service ports.
    A connection that is actively refused still proves the host is up, because only a
    live machine can send the refusal.

This is a best-effort signal, not monitoring-grade: a host behind a firewall that
drops everything will look "not responding".
"""

import ipaddress
import os
import socket
import struct
import time
from concurrent.futures import ThreadPoolExecutor

from django.db.models import Q
from django.utils import timezone

DEFAULT_PORTS = (22, 80, 443, 445, 3389)
DEFAULT_TIMEOUT = 1.5
MAX_WORKERS = 16

# Statuses that mean "this host should be on" / "this host should be off"
EXPECTED_UP = {"active"}
EXPECTED_DOWN = {"inactive", "unracked", "decommissioned"}


# ---------------------------------------------------------------------------
# Probes (no database access, safe to run in threads)
# ---------------------------------------------------------------------------

def tcp_alive(address: str, port: int, timeout: float) -> bool:
    try:
        with socket.create_connection((address, port), timeout=timeout):
            return True
    except (ConnectionRefusedError, ConnectionResetError):
        return True  # something answered, so the host is up
    except OSError:
        return False  # timeout, no route, network unreachable...


def _icmp_checksum(data: bytes) -> int:
    if len(data) % 2:
        data += b"\x00"
    total = sum(struct.unpack(f"!{len(data) // 2}H", data))
    total = (total >> 16) + (total & 0xFFFF)
    total += total >> 16
    return ~total & 0xFFFF


def icmp_alive(address: str, timeout: float) -> bool:
    """
    Send one ICMP echo request and wait for the matching reply. IPv4 only.
    Returns False (rather than raising) if raw sockets are not permitted, so the
    TCP probes can still decide.
    """
    try:
        if ipaddress.ip_address(address).version != 4:
            return False
    except ValueError:
        return False

    ident = (os.getpid() ^ id(address)) & 0xFFFF
    payload = b"infra-monitor"
    header = struct.pack("!BBHHH", 8, 0, 0, ident, 1)  # type 8 = echo request
    packet = struct.pack("!BBHHH", 8, 0, _icmp_checksum(header + payload), ident, 1) + payload

    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_RAW, socket.IPPROTO_ICMP)
    except OSError:  # includes PermissionError
        return False

    with sock:
        try:
            sock.sendto(packet, (address, 0))
        except OSError:
            return False
        deadline = time.monotonic() + timeout
        while True:
            remaining = deadline - time.monotonic()
            if remaining <= 0:
                return False
            sock.settimeout(remaining)
            try:
                data, peer = sock.recvfrom(1024)
            except OSError:  # timeout
                return False
            if peer[0] != address or len(data) < 28:
                continue  # someone else's ICMP traffic
            header_len = (data[0] & 0x0F) * 4
            icmp_type, _code, _sum, reply_id, _seq = struct.unpack(
                "!BBHHH", data[header_len:header_len + 8]
            )
            if icmp_type == 0 and reply_id == ident:  # type 0 = echo reply
                return True


def probe_address(address: str, ports=DEFAULT_PORTS, timeout: float = DEFAULT_TIMEOUT) -> bool:
    """True if the address answers a ping or any of the given TCP ports."""
    try:
        # Re-parse so only a well-formed IP can ever reach the ping command line
        address = str(ipaddress.ip_address(str(address).strip()))
    except ValueError:
        return False

    probes = [lambda: icmp_alive(address, timeout)]
    probes += [(lambda p=p: tcp_alive(address, p, timeout)) for p in ports]
    with ThreadPoolExecutor(max_workers=len(probes)) as pool:
        return any(pool.map(lambda probe: probe(), probes))


# ---------------------------------------------------------------------------
# Checking stored IPs
# ---------------------------------------------------------------------------

def _ports_for(ip) -> tuple:
    """Common ports plus any service ports recorded on the IP's host."""
    host = ip.assigned_server or ip.assigned_vm
    ports = set(DEFAULT_PORTS)
    if host is not None:
        ports.update(s.port for s in host.services.all() if s.port)
    return tuple(sorted(ports))


def check_ip_queryset(queryset, timeout: float = DEFAULT_TIMEOUT) -> dict:
    """
    Probe every IP in the queryset and store the result.

    Writes with QuerySet.update(), which skips model signals on purpose: a status that
    flaps up and down must not flood the audit log.
    Returns {"checked": n, "up": n, "down": n}.
    """
    ips = list(
        queryset.select_related("assigned_server", "assigned_vm").prefetch_related(
            "assigned_server__services", "assigned_vm__services"
        )
    )
    if not ips:
        return {"checked": 0, "up": 0, "down": 0}

    jobs = [(ip.pk, str(ip.address), _ports_for(ip)) for ip in ips]
    with ThreadPoolExecutor(max_workers=min(MAX_WORKERS, len(jobs))) as pool:
        results = list(pool.map(lambda j: (j[0], probe_address(j[1], j[2], timeout)), jobs))

    now = timezone.now()
    up_ids = [pk for pk, ok in results if ok]
    down_ids = [pk for pk, ok in results if not ok]
    model = queryset.model
    if up_ids:
        model.objects.filter(pk__in=up_ids).update(is_reachable=True, last_checked_at=now)
    if down_ids:
        model.objects.filter(pk__in=down_ids).update(is_reachable=False, last_checked_at=now)
    return {"checked": len(results), "up": len(up_ids), "down": len(down_ids)}


def assigned_ips(model):
    """IPs that belong to a server or a VM (unassigned IPs are not monitored)."""
    return model.objects.filter(Q(assigned_server__isnull=False) | Q(assigned_vm__isnull=False))


# ---------------------------------------------------------------------------
# Summarising a host from its IPs
# ---------------------------------------------------------------------------

def summarize_reachability(ips, host_status: str) -> dict:
    """
    Roll a host's IP results up into one state.

    reachability: "no_ip" | "unknown" | "up" | "down"
    alert: "active_but_down" (recorded active, not responding),
           "inactive_but_up" (recorded off / retired, still responding), or None
    """
    ips = list(ips)
    if not ips:
        return {"reachability": "no_ip", "checked_at": None, "alert": None}

    results = [ip.is_reachable for ip in ips]
    if any(r is True for r in results):
        state = "up"
    elif any(r is False for r in results):
        state = "down"
    else:
        state = "unknown"

    checked = [ip.last_checked_at for ip in ips if ip.last_checked_at]
    alert = None
    if state == "down" and host_status in EXPECTED_UP:
        alert = "active_but_down"
    elif state == "up" and host_status in EXPECTED_DOWN:
        alert = "inactive_but_up"

    return {
        "reachability": state,
        "checked_at": max(checked) if checked else None,
        "alert": alert,
    }
