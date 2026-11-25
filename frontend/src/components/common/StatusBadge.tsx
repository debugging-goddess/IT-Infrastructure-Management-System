import { Tag, Badge } from "antd";
import { SERVER_STATUS_CONFIG } from "@/utils/serverStatus";
import type { ServerStatus } from "@/types";

interface StatusBadgeProps {
  status: string;
  /** Show a pulsing dot instead of a filled tag */
  dot?: boolean;
}

export default function StatusBadge({ status, dot }: StatusBadgeProps) {
  const cfg = SERVER_STATUS_CONFIG[status as ServerStatus];

  if (!cfg) {
    return <Tag>{status}</Tag>;
  }

  if (dot) {
    return (
      <Badge
        color={cfg.badgeColor}
        text={cfg.label}
        style={{ whiteSpace: "nowrap" }}
      />
    );
  }

  return (
    <Tag color={cfg.color} style={{ fontWeight: 500 }}>
      {cfg.label}
    </Tag>
  );
}
