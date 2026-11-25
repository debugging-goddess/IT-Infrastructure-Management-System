"""Helpers for warranty / end-of-life tracking."""

from datetime import date

from django.utils import timezone

# A date this close (in days) counts as "expiring soon"
LIFECYCLE_WARNING_DAYS = 90


def lifecycle_state(target: date | None, today: date | None = None) -> tuple[str, int | None]:
    """
    Classify a warranty / end-of-life date.

    Returns (state, days_left) where state is one of:
      "none"     - no date recorded
      "ok"       - more than LIFECYCLE_WARNING_DAYS away
      "expiring" - within LIFECYCLE_WARNING_DAYS (including today)
      "expired"  - already in the past
    days_left is negative once expired, None when there is no date.
    """
    if target is None:
        return "none", None
    today = today or timezone.localdate()
    days_left = (target - today).days
    if days_left < 0:
        return "expired", days_left
    if days_left <= LIFECYCLE_WARNING_DAYS:
        return "expiring", days_left
    return "ok", days_left
