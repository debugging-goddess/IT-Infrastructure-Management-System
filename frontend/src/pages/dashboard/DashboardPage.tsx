import { Row, Col, Card, Statistic, Typography, Space, Tag, Empty, Spin, List, Alert, Progress } from "antd";
import {
  CloudServerOutlined, DesktopOutlined, AppstoreOutlined,
  GlobalOutlined, PartitionOutlined, ApartmentOutlined,
  ApiOutlined, ClusterOutlined, WarningOutlined,
  InfoCircleOutlined, CloseCircleOutlined, ThunderboltOutlined,
} from "@ant-design/icons";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip as RTooltip,
} from "recharts";
import { useDashboardStats } from "@/hooks/useDashboard";
import { timeAgo } from "@/utils/formatters";
import type { StatusCount, AttentionItem, RecentActivity } from "@/types";

const { Title, Text } = Typography;

// Color map shared across status charts
const STATUS_COLORS: Record<string, string> = {
  active: "#52c41a", running: "#52c41a",
  inactive: "#8c8c8c", stopped: "#8c8c8c",
  unracked: "#fa8c16", degraded: "#fa8c16",
  maintenance: "#1677ff",
  decommissioned: "#ff4d4f", failed: "#ff4d4f",
};

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function StatusDonut({ title, data }: { title: string; data: StatusCount[] }) {
  const hasData = data.some((d) => d.count > 0);
  return (
    <Card size="small" title={title} style={{ height: "100%" }}>
      {hasData ? (
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={data}
              dataKey="count"
              nameKey="status"
              cx="50%"
              cy="50%"
              innerRadius={45}
              outerRadius={75}
              paddingAngle={2}
            >
              {data.map((entry) => (
                <Cell key={entry.status} fill={STATUS_COLORS[entry.status] ?? "#d9d9d9"} />
              ))}
            </Pie>
            <RTooltip formatter={(value: number, name: string) => [value, cap(name)]} />
            <Legend formatter={(value: string) => cap(value)} />
          </PieChart>
        </ResponsiveContainer>
      ) : (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No data" style={{ padding: "40px 0" }} />
      )}
    </Card>
  );
}

const ATTENTION_ICON = {
  info:    <InfoCircleOutlined style={{ color: "#1677ff" }} />,
  warning: <WarningOutlined style={{ color: "#fa8c16" }} />,
  error:   <CloseCircleOutlined style={{ color: "#ff4d4f" }} />,
};

const ACTION_COLOR: Record<string, string> = {
  create: "success", update: "processing", delete: "error",
};

export default function DashboardPage() {
  const { data, isLoading } = useDashboardStats();

  if (isLoading || !data) {
    return (
      <div style={{ textAlign: "center", padding: "80px 0" }}>
        <Spin size="large" />
      </div>
    );
  }

  const { totals, status_breakdowns, capacity, attention, recent_activity } = data;

  const statCards = [
    { title: "Servers",      value: totals.servers,      icon: <CloudServerOutlined />, color: "#1677ff", bg: "#e6f4ff" },
    { title: "VMs",          value: totals.vms,          icon: <DesktopOutlined />,     color: "#52c41a", bg: "#f6ffed" },
    { title: "Applications", value: totals.applications, icon: <AppstoreOutlined />,    color: "#fa8c16", bg: "#fff7e6" },
    { title: "IP Addresses", value: totals.ip_addresses, icon: <GlobalOutlined />,      color: "#722ed1", bg: "#f9f0ff" },
    { title: "Subnets",      value: totals.subnets,      icon: <PartitionOutlined />,   color: "#13c2c2", bg: "#e6fffb" },
    { title: "VLANs",        value: totals.vlans,        icon: <ApartmentOutlined />,   color: "#2f54eb", bg: "#f0f5ff" },
    { title: "Services",     value: totals.services,     icon: <ApiOutlined />,         color: "#eb2f96", bg: "#fff0f6" },
    { title: "Clusters",     value: totals.clusters,     icon: <ClusterOutlined />,     color: "#faad14", bg: "#fffbe6" },
  ];

  return (
    <>
      <Title level={4} style={{ marginBottom: 24 }}>Dashboard</Title>

      {/* ── Stat cards ──────────────────────────────────────────── */}
      <Row gutter={[16, 16]}>
        {statCards.map((s) => (
          <Col xs={12} sm={8} lg={6} xl={3} key={s.title}>
            <Card size="small" style={{ background: s.bg, border: "none" }}>
              <Statistic
                title={s.title}
                value={s.value}
                valueStyle={{ fontSize: 24 }}
                prefix={<span style={{ color: s.color, marginRight: 4 }}>{s.icon}</span>}
              />
            </Card>
          </Col>
        ))}
      </Row>

      {/* ── Status charts ───────────────────────────────────────── */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} md={8}>
          <StatusDonut title="Servers by Status" data={status_breakdowns.servers} />
        </Col>
        <Col xs={24} md={8}>
          <StatusDonut title="VMs by Status" data={status_breakdowns.vms} />
        </Col>
        <Col xs={24} md={8}>
          <StatusDonut title="Applications by Status" data={status_breakdowns.applications} />
        </Col>
      </Row>

      {/* ── Attention + Capacity + Activity ─────────────────────── */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        {/* Needs attention */}
        <Col xs={24} lg={8}>
          <Card
            size="small"
            title={<Space><WarningOutlined style={{ color: "#fa8c16" }} />Needs Attention</Space>}
            style={{ height: "100%" }}
          >
            {attention.length ? (
              <Space direction="vertical" size={10} style={{ width: "100%" }}>
                {attention.map((item: AttentionItem, i) => (
                  <Space key={i} align="start">
                    {ATTENTION_ICON[item.severity]}
                    <Text style={{ fontSize: 13 }}>{item.message}</Text>
                  </Space>
                ))}
              </Space>
            ) : (
              <Alert type="success" showIcon message="All clear — nothing needs attention." />
            )}
          </Card>
        </Col>

        {/* Capacity */}
        <Col xs={24} lg={8}>
          <Card
            size="small"
            title={<Space><ThunderboltOutlined style={{ color: "#1677ff" }} />Fleet Capacity</Space>}
            style={{ height: "100%" }}
          >
            <Space direction="vertical" size={14} style={{ width: "100%" }}>
              <div>
                <Text type="secondary" style={{ fontSize: 12 }}>PHYSICAL (SERVERS)</Text>
                <Row gutter={8} style={{ marginTop: 4 }}>
                  <Col span={8}><Statistic title="CPU cores" value={capacity.server_cpu_cores} valueStyle={{ fontSize: 18 }} /></Col>
                  <Col span={8}><Statistic title="RAM (GB)" value={capacity.server_ram_gb} valueStyle={{ fontSize: 18 }} /></Col>
                  <Col span={8}><Statistic title="Storage (TB)" value={capacity.server_storage_tb} valueStyle={{ fontSize: 18 }} /></Col>
                </Row>
              </div>
              <div>
                <Text type="secondary" style={{ fontSize: 12 }}>ALLOCATED (VMs)</Text>
                <Row gutter={8} style={{ marginTop: 4 }}>
                  <Col span={8}><Statistic title="vCPUs" value={capacity.vm_vcpu} valueStyle={{ fontSize: 18 }} /></Col>
                  <Col span={8}><Statistic title="RAM (GB)" value={capacity.vm_ram_gb} valueStyle={{ fontSize: 18 }} /></Col>
                  <Col span={8}><Statistic title="Disk (GB)" value={capacity.vm_disk_gb} valueStyle={{ fontSize: 18 }} /></Col>
                </Row>
              </div>
              {capacity.server_ram_gb > 0 && (
                <div>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    VM RAM allocation vs physical
                  </Text>
                  <Progress
                    percent={Math.min(100, Math.round((capacity.vm_ram_gb / capacity.server_ram_gb) * 100))}
                    status={capacity.vm_ram_gb > capacity.server_ram_gb ? "exception" : "active"}
                  />
                </div>
              )}
            </Space>
          </Card>
        </Col>

        {/* Recent activity */}
        <Col xs={24} lg={8}>
          <Card
            size="small"
            title="Recent Activity"
            style={{ height: "100%" }}
          >
            {recent_activity.length ? (
              <List
                size="small"
                dataSource={recent_activity}
                renderItem={(item: RecentActivity) => (
                  <List.Item>
                    <Space align="start">
                      <Tag color={ACTION_COLOR[item.action]} style={{ marginTop: 2 }}>
                        {cap(item.action)}
                      </Tag>
                      <Space direction="vertical" size={0}>
                        <Text style={{ fontSize: 13 }}>
                          <Text strong>{item.object_repr}</Text>
                          <Text type="secondary"> ({item.model})</Text>
                        </Text>
                        <Text type="secondary" style={{ fontSize: 11 }}>
                          {item.user} · {timeAgo(item.timestamp)}
                        </Text>
                      </Space>
                    </Space>
                  </List.Item>
                )}
              />
            ) : (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No activity yet" />
            )}
          </Card>
        </Col>
      </Row>
    </>
  );
}
