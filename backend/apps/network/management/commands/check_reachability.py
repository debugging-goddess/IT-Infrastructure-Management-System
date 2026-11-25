import time

from django.core.management.base import BaseCommand
from django.db import close_old_connections

from apps.network.models import IPAddress
from apps.network.reachability import assigned_ips, check_ip_queryset, DEFAULT_TIMEOUT


class Command(BaseCommand):
    help = (
        "Check whether the IPs assigned to servers and VMs respond. "
        "Runs forever every --interval seconds, or once with --once."
    )

    def add_arguments(self, parser):
        parser.add_argument("--once", action="store_true", help="Run a single check and exit.")
        parser.add_argument("--interval", type=int, default=60, help="Seconds between checks (default 60).")
        parser.add_argument(
            "--timeout", type=float, default=DEFAULT_TIMEOUT,
            help=f"Seconds to wait for each probe (default {DEFAULT_TIMEOUT}).",
        )

    def handle(self, *args, **options):
        interval = max(10, options["interval"])
        timeout = options["timeout"]

        if options["once"]:
            self._run(timeout)
            return

        self.stdout.write(f"Reachability monitor started (every {interval}s). Ctrl+C to stop.")
        try:
            while True:
                try:
                    self._run(timeout)
                except Exception as exc:  # keep the monitor alive across e.g. a brief DB outage
                    self.stderr.write(f"Check failed, will retry: {exc}")
                time.sleep(interval)
        except KeyboardInterrupt:
            self.stdout.write("Stopped.")

    def _run(self, timeout):
        close_old_connections()  # a long-running process must not hold a stale DB connection
        started = time.monotonic()
        summary = check_ip_queryset(assigned_ips(IPAddress), timeout=timeout)
        elapsed = time.monotonic() - started
        self.stdout.write(
            f"Checked {summary['checked']} IP(s): {summary['up']} responding, "
            f"{summary['down']} not responding ({elapsed:.1f}s)"
        )
