import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

/** Format an ISO timestamp to a readable date-time string */
export function formatDate(iso: string): string {
  return dayjs(iso).format("DD MMM YYYY, HH:mm");
}

/** Human-readable relative time, e.g. "3 hours ago" */
export function timeAgo(iso: string): string {
  return dayjs(iso).fromNow();
}
