import {
  Drawer, Descriptions, Tag, Table, Tabs,
  Skeleton, Space, Typography, Divider, Badge,
  Empty, Button,
} from "antd";
import {
  GlobalOutlined, ApiOutlined, AppstoreOutlined,
  DesktopOutlined, ClusterOutlined, UserOutlined,
  EditOutlined, CloudServerOutlined,
} from "@ant-design/icons";
import { useVM } from "@/hooks/useVMs";
import StatusBadge from "@/components/common/StatusBadge";
import { formatDate, timeAgo } from "@/utils/formatters";
import type { NestedIPAddress, NestedService, NestedApplication } from "@/types";

const { Text } = Typography;

interface Props {
  vmId: number | null;
  onClose: () => void;
  onEdit: () => void;
}

const IP_STATUS_COLOR: Record<string, string> = {
  active:     "green",
  reserved:   "blue",
  deprecated: "volcano",
  dhcp:       "cyan",
};

const SERVICE_STATUS_COLOR: Record<string, string> = {
  running: "green",
  stopped: "default",
  failed:  "red",
};

const APP_STATUS_COLOR: Record<string, string> = {
  running:         "green",
  stopped:         "default",
  degraded:        "orange",
  maintenance:     "blue",
  decommissioned:  "red",
};

// OS icon mapping — just emoji flags for simplicity
function osIcon(os: string) {
  if (!os) return "💻";
  const lower = os.toLowerCase();
  if (lower.includes("windows")) return "🪟";
  if (lower.includes("ubuntu"))  return "🟠";
  if (lower.includes("debian"))  return "🌀";
  if (lower.includes("centos") || lower.includes("rocky") || lower.includes("alma") || lower.includes("red hat")) return "🎩";
  return "🐧";
}

export default function VMDetailDrawer({ vmId, onClose, onEdit }: Props) {
  const { data: vm, isLoading } = useVM(vmId);

  const ipColumns = [
    {
      title: "IP Address",
      dataIndex: "address",
      key: "address",
      render: (v: string) => <Text code>{v}</Text>,
    },
    {
      title: "DNS Name",
      dataIndex: "dns_name",
      key: "dns_name",
      render: (v: string) => v || <Text type="secondary">—</Text>,
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (v: string) => <Tag color={IP_STATUS_COLOR[v] ?? "default"}>{v}</Tag>,
    },
  ];

  const appColumns = [
    {
      title: "Application",
      dataIndex: "name",
      key: "name",
      render: (v: string, record: NestedApplication) => (
        <Space direction="vertical" size={0}>
          <Text strong>{v}</Text>
          {record.version && <Text type="secondary" style={{ fontSize: 11 }}>{record.version}</Text>}
        </Space>
      ),
    },
    {
      title: "Port",
      dataIndex: "port",
      key: "port",
      render: (v: number | null) =>
        v ? <Text code>{v}</Text> : <Text type="secondary">—</Text>,
    },
    {
      title: "URL",
      dataIndex: "url",
      key: "url",
      render: (v: string) =>
        v ? (
          <a href={v} target="_blank" rel="noopener noreferrer">
            {v}
          </a>
        ) : (
          <Text type="secondary">—</Text>
        ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (v: string) => <Tag color={APP_STATUS_COLOR[v] ?? "default"}>{v}</Tag>,
    },
  ];

  const serviceColumns = [
    {
      title: "Service",
      dataIndex: "name",
      key: "name",
      render: (v: string) => <Text strong>{v}</Text>,
    },
    {
      title: "Port",
      dataIndex: "port",
      key: "port",
      render: (v: number | null) =>
        v ? <Text code>{v}</Text> : <Text type="secondary">—</Text>,
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (v: string) => (
        <Tag color={SERVICE_STATUS_COLOR[v] ?? "default"}>{v}</Tag>
      ),
    },
  ];

  return (
    <Drawer
      title={
        isLoading ? "Loading..." : (
          <Space>
            <DesktopOutlined style={{ color: "#52c41a" }} />
            <span>{vm?.name}</span>
            {vm && <StatusBadge status={vm.status} />}
          </Space>
        )
      }
      placement="right"
      width={680}
      open={vmId !== null}
      onClose={onClose}
      extra={
        <Button
          icon={<EditOutlined />}
          size="small"
          type="primary"
          ghost
          onClick={onEdit}
        >
          Edit
        </Button>
      }
    >
      {isLoading || !vm ? (
        <Skeleton active paragraph={{ rows: 10 }} />
      ) : (
        <>
          {/* ── Summary counters ──────────────────────────────── */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 12,
              marginBottom: 24,
            }}
          >
            {[
              { icon: <GlobalOutlined />,    label: "IP Addresses",  value: vm.ip_count,      color: "#722ed1" },
              { icon: <AppstoreOutlined />,  label: "Applications",  value: vm.app_count,     color: "#fa8c16" },
              { icon: <ApiOutlined />,       label: "Services",      value: vm.service_count, color: "#1677ff" },
            ].map((s) => (
              <div
                key={s.label}
                style={{
                  background: "#fafafa",
                  border: "1px solid #f0f0f0",
                  borderRadius: 8,
                  padding: "12px 16px",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: 22, color: s.color }}>{s.icon}</div>
                <div style={{ fontSize: 22, fontWeight: 600 }}>{s.value}</div>
                <div style={{ fontSize: 12, color: "#8c8c8c" }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* ── OS badge ─────────────────────────────────────── */}
          {vm.os && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                background: "#f6ffed",
                border: "1px solid #b7eb8f",
                borderRadius: 8,
                padding: "10px 14px",
                marginBottom: 20,
              }}
            >
              <span style={{ fontSize: 24 }}>{osIcon(vm.os)}</span>
              <div>
                <Text strong>{vm.os}</Text>
                {vm.os_version && (
                  <Text type="secondary" style={{ marginLeft: 8 }}>
                    {vm.os_version}
                  </Text>
                )}
              </div>
            </div>
          )}

          {/* ── Core details ─────────────────────────────────── */}
          <Descriptions
            column={2}
            size="small"
            bordered
            labelStyle={{ fontWeight: 500, width: 140 }}
          >
            <Descriptions.Item label="Hostname" span={2}>
              <Text code>{vm.hostname}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Host Server">
              {vm.host_server_name ? (
                <Space>
                  <CloudServerOutlined style={{ color: "#1677ff" }} />
                  {vm.host_server_name}
                </Space>
              ) : (
                <Text type="secondary">—</Text>
              )}
            </Descriptions.Item>
            <Descriptions.Item label="Cluster">
              {vm.cluster_name ? (
                <Space>
                  <ClusterOutlined style={{ color: "#722ed1" }} />
                  {vm.cluster_name}
                </Space>
              ) : (
                <Text type="secondary">—</Text>
              )}
            </Descriptions.Item>
            <Descriptions.Item label="vCPUs">
              {vm.vcpu != null ? (
                <Space>
                  <ClusterOutlined />
                  {vm.vcpu} vCPU{vm.vcpu !== 1 ? "s" : ""}
                </Space>
              ) : "—"}
            </Descriptions.Item>
            <Descriptions.Item label="RAM">
              {vm.ram_gb != null ? `${vm.ram_gb} GB` : "—"}
            </Descriptions.Item>
            <Descriptions.Item label="Disk">
              {vm.disk_gb != null ? `${vm.disk_gb} GB` : "—"}
            </Descriptions.Item>
            <Descriptions.Item label="Owner">
              {vm.owner_name ? (
                <Space><UserOutlined />{vm.owner_name}</Space>
              ) : "—"}
            </Descriptions.Item>
            <Descriptions.Item label="Added">{formatDate(vm.created_at)}</Descriptions.Item>
            <Descriptions.Item label="Last Updated">{timeAgo(vm.updated_at)}</Descriptions.Item>
          </Descriptions>

          {vm.notes && (
            <>
              <Divider />
              <Text
                type="secondary"
                style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 1 }}
              >
                Notes
              </Text>
              <p style={{ marginTop: 6, color: "#595959" }}>{vm.notes}</p>
            </>
          )}

          {/* ── Related data tabs ────────────────────────────── */}
          <Divider />
          <Tabs
            defaultActiveKey="ips"
            size="small"
            items={[
              {
                key: "ips",
                label: (
                  <Space>
                    <GlobalOutlined />
                    IPs
                    <Badge count={vm.ip_count} style={{ backgroundColor: "#722ed1" }} />
                  </Space>
                ),
                children: vm.ip_addresses.length ? (
                  <Table<NestedIPAddress>
                    dataSource={vm.ip_addresses}
                    columns={ipColumns}
                    rowKey="id"
                    size="small"
                    pagination={false}
                  />
                ) : (
                  <Empty description="No IP addresses assigned" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                ),
              },
              {
                key: "apps",
                label: (
                  <Space>
                    <AppstoreOutlined />
                    Applications
                    <Badge count={vm.app_count} style={{ backgroundColor: "#fa8c16" }} />
                  </Space>
                ),
                children: vm.applications.length ? (
                  <Table<NestedApplication>
                    dataSource={vm.applications}
                    columns={appColumns}
                    rowKey="id"
                    size="small"
                    pagination={false}
                  />
                ) : (
                  <Empty description="No applications deployed" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                ),
              },
              {
                key: "services",
                label: (
                  <Space>
                    <ApiOutlined />
                    Services
                    <Badge count={vm.service_count} style={{ backgroundColor: "#1677ff" }} />
                  </Space>
                ),
                children: vm.services.length ? (
                  <Table<NestedService>
                    dataSource={vm.services}
                    columns={serviceColumns}
                    rowKey="id"
                    size="small"
                    pagination={false}
                  />
                ) : (
                  <Empty description="No services running" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                ),
              },
            ]}
          />
        </>
      )}
    </Drawer>
  );
}
