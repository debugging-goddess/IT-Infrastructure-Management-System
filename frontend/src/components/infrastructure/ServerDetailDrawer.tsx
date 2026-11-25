import {
  Drawer, Descriptions, Tag, Table, Tabs,
  Skeleton, Space, Typography, Divider, Badge,
  Image, Empty, Button,
} from "antd";
import {
  GlobalOutlined, ApiOutlined, DesktopOutlined,
  HddOutlined, ClusterOutlined, UserOutlined,
  PictureOutlined, EditOutlined,
} from "@ant-design/icons";
import { useServer } from "@/hooks/useServers";
import StatusBadge from "@/components/common/StatusBadge";
import { formatDate, timeAgo } from "@/utils/formatters";
import type { NestedIPAddress, NestedService, NestedVM } from "@/types";

const { Text } = Typography;

interface Props {
  serverId: number | null;
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

// Small placeholder shown when no image has been uploaded
function NoImagePlaceholder({ label }: { label: string }) {
  return (
    <div
      style={{
        height: 160,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#fafafa",
        border: "1px dashed #d9d9d9",
        borderRadius: 8,
        color: "#bbb",
        gap: 6,
      }}
    >
      <PictureOutlined style={{ fontSize: 28 }} />
      <Text type="secondary" style={{ fontSize: 12 }}>{label}</Text>
    </div>
  );
}

export default function ServerDetailDrawer({ serverId, onClose, onEdit }: Props) {
  const { data: server, isLoading } = useServer(serverId);

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
      render: (v: string) => (
        <Tag color={IP_STATUS_COLOR[v] ?? "default"}>{v}</Tag>
      ),
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

  const vmColumns = [
    {
      title: "VM Name",
      dataIndex: "name",
      key: "name",
      render: (v: string) => <Text strong>{v}</Text>,
    },
    {
      title: "Hostname",
      dataIndex: "hostname",
      key: "hostname",
      render: (v: string) => <Text code>{v}</Text>,
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (v: string) => <StatusBadge status={v} />,
    },
  ];

  return (
    <Drawer
      title={
        isLoading ? "Loading..." : (
          <Space>
            <HddOutlined style={{ color: "#1677ff" }} />
            <span>{server?.name}</span>
            {server && <StatusBadge status={server.status} />}
          </Space>
        )
      }
      placement="right"
      width={680}
      open={serverId !== null}
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
      {isLoading || !server ? (
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
              { icon: <GlobalOutlined />, label: "IP Addresses", value: server.ip_count,      color: "#722ed1" },
              { icon: <ApiOutlined />,    label: "Services",     value: server.service_count,  color: "#1677ff" },
              { icon: <DesktopOutlined />,label: "VMs",          value: server.vm_count,       color: "#52c41a" },
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

          {/* ── Server images ────────────────────────────────── */}
          <Divider orientation="left" orientationMargin={0}>
            <Space>
              <PictureOutlined />
              Server Images
            </Space>
          </Divider>
          <Image.PreviewGroup>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 8 }}>
              <div>
                <Text type="secondary" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 1 }}>
                  Front View
                </Text>
                <div style={{ marginTop: 6 }}>
                  {server.image_front ? (
                    <Image
                      src={server.image_front}
                      alt="Front view"
                      width="100%"
                      height={160}
                      style={{ objectFit: "contain", borderRadius: 8, border: "1px solid #f0f0f0", background: "#fafafa" }}
                      preview={{ mask: "View Full Size" }}
                    />
                  ) : (
                    <NoImagePlaceholder label="No front image uploaded" />
                  )}
                </div>
              </div>
              <div>
                <Text type="secondary" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 1 }}>
                  Rear View
                </Text>
                <div style={{ marginTop: 6 }}>
                  {server.image_rear ? (
                    <Image
                      src={server.image_rear}
                      alt="Rear view"
                      width="100%"
                      height={160}
                      style={{ objectFit: "contain", borderRadius: 8, border: "1px solid #f0f0f0", background: "#fafafa" }}
                      preview={{ mask: "View Full Size" }}
                    />
                  ) : (
                    <NoImagePlaceholder label="No rear image uploaded" />
                  )}
                </div>
              </div>
            </div>
          </Image.PreviewGroup>
          {(!server.image_front && !server.image_rear) && (
            <div style={{ textAlign: "center", marginBottom: 4 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                No images uploaded — click Edit to add front and rear photos
              </Text>
            </div>
          )}

          {/* ── Core details ─────────────────────────────────── */}
          <Divider orientation="left" orientationMargin={0}>
            Details
          </Divider>
          <Descriptions
            column={2}
            size="small"
            bordered
            labelStyle={{ fontWeight: 500, width: 130 }}
          >
            <Descriptions.Item label="Hostname" span={2}>
              <Text code>{server.hostname}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Manufacturer">{server.manufacturer || "—"}</Descriptions.Item>
            <Descriptions.Item label="Model">{server.model || "—"}</Descriptions.Item>
            <Descriptions.Item label="Serial Number">{server.serial_number || "—"}</Descriptions.Item>
            <Descriptions.Item label="Location">{server.location || "—"}</Descriptions.Item>
            <Descriptions.Item label="OS">
              {server.os
                ? `${server.os}${server.os_version ? ` ${server.os_version}` : ""}`
                : "—"}
            </Descriptions.Item>
            <Descriptions.Item label="CPU Cores">
              {server.cpu_cores != null ? (
                <Space><ClusterOutlined />{server.cpu_cores} cores</Space>
              ) : "—"}
            </Descriptions.Item>
            <Descriptions.Item label="RAM">
              {server.ram_gb != null ? `${server.ram_gb} GB` : "—"}
            </Descriptions.Item>
            <Descriptions.Item label="Storage">
              {server.storage_tb != null ? `${server.storage_tb} TB` : "—"}
            </Descriptions.Item>
            <Descriptions.Item label="Owner">
              {server.owner_name ? (
                <Space><UserOutlined />{server.owner_name}</Space>
              ) : "—"}
            </Descriptions.Item>
            <Descriptions.Item label="Added">{formatDate(server.created_at)}</Descriptions.Item>
            <Descriptions.Item label="Last Updated">{timeAgo(server.updated_at)}</Descriptions.Item>
          </Descriptions>

          {server.notes && (
            <>
              <Divider />
              <Text type="secondary" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 1 }}>
                Notes
              </Text>
              <p style={{ marginTop: 6, color: "#595959" }}>{server.notes}</p>
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
                    IP Addresses
                    <Badge count={server.ip_count} style={{ backgroundColor: "#722ed1" }} />
                  </Space>
                ),
                children: server.ip_addresses.length ? (
                  <Table<NestedIPAddress>
                    dataSource={server.ip_addresses}
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
                key: "services",
                label: (
                  <Space>
                    <ApiOutlined />
                    Services
                    <Badge count={server.service_count} style={{ backgroundColor: "#1677ff" }} />
                  </Space>
                ),
                children: server.services.length ? (
                  <Table<NestedService>
                    dataSource={server.services}
                    columns={serviceColumns}
                    rowKey="id"
                    size="small"
                    pagination={false}
                  />
                ) : (
                  <Empty description="No services on this server" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                ),
              },
              {
                key: "vms",
                label: (
                  <Space>
                    <DesktopOutlined />
                    Virtual Machines
                    <Badge count={server.vm_count} style={{ backgroundColor: "#52c41a" }} />
                  </Space>
                ),
                children: server.virtual_machines.length ? (
                  <Table<NestedVM>
                    dataSource={server.virtual_machines}
                    columns={vmColumns}
                    rowKey="id"
                    size="small"
                    pagination={false}
                  />
                ) : (
                  <Empty description="No VMs hosted on this server" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                ),
              },
            ]}
          />
        </>
      )}
    </Drawer>
  );
}
