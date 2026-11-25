"""Small IP / subnet helpers built on the standard-library ipaddress module."""

import ipaddress

# IPv6 networks bigger than this have too many addresses for utilisation to mean anything
IPV6_MIN_PREFIX_FOR_STATS = 112


def parse_network(cidr: str):
    """Parse a CIDR string (host bits allowed). Raises ValueError if invalid."""
    return ipaddress.ip_network(str(cidr).strip(), strict=False)


def parse_address(value):
    """Parse an IP address string, or return None if it is not valid."""
    try:
        return ipaddress.ip_address(str(value).strip())
    except ValueError:
        return None


def address_in_network(address, network) -> bool:
    ip = parse_address(address)
    return ip is not None and ip.version == network.version and ip in network


def usable_host_count(network):
    """Number of assignable host addresses, or None when it is not meaningful (huge IPv6)."""
    if network.version == 4:
        if network.prefixlen == 32:
            return 1
        if network.prefixlen == 31:
            return 2
        return network.num_addresses - 2  # minus network and broadcast
    if network.prefixlen >= IPV6_MIN_PREFIX_FOR_STATS:
        return network.num_addresses
    return None


def load_ip_pool():
    """Every registered IP address as ip_address objects. Invalid rows are skipped."""
    from .models import IPAddress

    pool = []
    for raw in IPAddress.objects.values_list("address", flat=True):
        ip = parse_address(raw)
        if ip is not None:
            pool.append(ip)
    return pool


def used_addresses(network, pool, gateway=None) -> set:
    """
    Addresses in `network` that are taken: every registered IP that falls inside it,
    plus the gateway (it occupies an address even if nobody registered it as an IP).
    """
    used = {ip for ip in pool if ip.version == network.version and ip in network}
    gw = parse_address(gateway) if gateway else None
    if gw is not None and gw.version == network.version and gw in network:
        used.add(gw)
    return used


def next_free_addresses(network, used: set, count: int) -> list:
    """The first `count` assignable addresses in `network` that are not in `used`."""
    free = []
    for host in network.hosts():
        if host in used:
            continue
        free.append(str(host))
        if len(free) >= count:
            break
    return free
