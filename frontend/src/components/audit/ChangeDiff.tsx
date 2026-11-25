import { Typography, Empty } from "antd";
import { ArrowRightOutlined } from "@ant-design/icons";
import { displayValue, fieldLabel } from "@/utils/auditFormat";
import type { AuditLog } from "@/types";

const { Text } = Typography;

interface Props {
  log: AuditLog;
}

export default function ChangeDiff({ log }: Props) {
  const entries = Object.entries(log.changes ?? {});

  // Deletions and bare creates may have no field diff
  if (entries.length === 0) {
    if (log.action === "delete") {
      return <Text type="secondary">Record was deleted.</Text>;
    }
    if (log.action === "create") {
      return <Text type="secondary">Record was created.</Text>;
    }
    return (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description="No field-level changes recorded"
      />
    );
  }

  return (
    <div style={{ padding: "4px 0" }}>
      {entries.map(([field, [oldVal, newVal]]) => (
        <div
          key={field}
          style={{
            display: "grid",
            gridTemplateColumns: "180px 1fr",
            gap: 12,
            padding: "6px 0",
            borderBottom: "1px solid #f5f5f5",
            alignItems: "center",
          }}
        >
          <Text strong style={{ fontSize: 13 }}>{fieldLabel(field)}</Text>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <Text
              delete
              type="secondary"
              style={{
                background: "#fff1f0",
                padding: "1px 8px",
                borderRadius: 4,
                fontFamily: "monospace",
                fontSize: 12,
              }}
            >
              {displayValue(oldVal)}
            </Text>
            <ArrowRightOutlined style={{ color: "#bbb", fontSize: 12 }} />
            <Text
              style={{
                background: "#f6ffed",
                padding: "1px 8px",
                borderRadius: 4,
                fontFamily: "monospace",
                fontSize: 12,
                color: "#389e0d",
              }}
            >
              {displayValue(newVal)}
            </Text>
          </div>
        </div>
      ))}
    </div>
  );
}
