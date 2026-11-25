import { useState, useMemo } from "react";
import {
  Table, Button, Input, Select, Space, Card,
  Popconfirm, Tooltip, Typography, Row, Col,
  Tag, message, Badge,
} from "antd";
import type { TableProps } from "antd";
import {
  PlusOutlined, SearchOutlined, ReloadOutlined,
  EditOutlined, DeleteOutlined, EyeOutlined,
  CloudServerOutlined, FilterOutlined,
} from "@ant-design/icons";
import { useServers, useDeleteServer } from "@/hooks/useServers";
import ServerFormModal from "@/components/infrastructure/ServerFormModal";
import ServerDetailDrawer from "@/components/infrastructure/ServerDetailDrawer";
import StatusBadge from "@/components/common/StatusBadge";
import { SERVER_STATUS_CONFIG, ALL_SERVER_STATUSES } from "@/utils/serverStatus";
import { formatDate, timeAgo } from "@/utils/formatters";
import type { Server, ServerStatus } from "@/types";

const { Text } = Typography;
const { Search } = Input;

export default function ServersPage() {
  // ── Filter / pagination state ──────────────────────────────────
  const [search, setSearch]         = useState("");
  const [statusFilter, setStatus]   = useState<ServerStatus | "">("");
  const [page, setPage]             = useState(1);
  const PAGE_SIZE                   = 20;

  // ── Modal / drawer state ───────────────────────────────────────
  const [modalOpen, setModalOpen]       = useState(false);
  const [editingServer, setEditing]     = useState<Server | null>(null);
  const [drawerServerId, setDrawerId]   = useState<number | null>(null);

  // ── Data ───────────────────────────────────────────────────────
  const queryParams = useMemo(() => ({
    ...(search       ? { search }          : {}),
    ...(statusFilter ? { status: statusFilter } : {}),
    page,
    page_size: PAGE_SIZE,
  }), [search, statusFilter, page]);

  const { data, isLoading, isFetching, refetch } = useServers(queryParams);
  const deleteServer = useDeleteServer();

  const servers = data?.results ?? [];
  const total   = data?.count   ?? 0;

  // ── Status summary counts ──────────────────────────────────────
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    servers.forEach((s) => {
      counts[s.status] = (counts[s.status] ?? 0) + 1;
    });
    return counts;
  }, [servers]);

  // ── Actions ────────────────────────────────────────────────────
  const openAdd  = ()              => { setEditing(null); setModalOpen(true); };
  const openEdit = (s: Server)     => { setEditing(s);    setModalOpen(true); };
  const openView = (id: number)    => setDrawerId(id);
  const closeModal  = ()           => { setModalOpen(false); setEditing(null); };
  const closeDrawer = ()           => setDrawerId(null);

  const handleDelete = async (id: number, name: string) => {
    try {
      await deleteServer.mutateAsync(id);
      message.success(`Server "${name}" deleted`);
    } catch {
      message.error("Failed to delete server");
    }
  };

  // ── Table columns ──────────────────────────────────────────────
  const columns: TableProps<Server>["columns"] = [
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      sorter: true,
      render: (name: string, record) => (
        <Space>
          <CloudServerOutlined style={{ color: "#1677ff" }} />
          <Button
            type="link"
            style={{ padding: 0, fontWeight: 600 }}
            onClick={() => openView(record.id)}
          >
            {name}
          </Button>
        </Space>
      ),
    },
    {
      title: "Hostname",
      dataIndex: "hostname",
      key: "hostname",
      render: (v: string) => <Text code style={{ fontSize: 12 }}>{v}</Text>,
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 150,
      render: (status: ServerStatus) => <StatusBadge status={status} dot />,
      filters: ALL_SERVER_STATUSES.map((s) => ({ text: s.label, value: s.value })),
      onFilter: (value, record) => record.status === value,
    },
    {
      title: "Location",
      dataIndex: "location",
      key: "location",
      render: (v: string) => v || <Text type="secondary">—</Text>,
    },
    {
      title: "OS",
      dataIndex: "os",
      key: "os",
      render: (v: string, record) =>
        v ? (
          <Tag style={{ fontSize: 11 }}>
            {v}{record.os_version ? ` ${record.os_version}` : ""}
          </Tag>
        ) : (
          <Text type="secondary">—</Text>
        ),
    },
    {
      title: "Specs",
      key: "specs",
      render: (_, record) => (
        <Space size={4} wrap>
          {record.cpu_cores && (
            <Tag style={{ fontSize: 11 }}>{record.cpu_cores} CPU</Tag>
          )}
          {record.ram_gb && (
            <Tag style={{ fontSize: 11 }}>{record.ram_gb} GB RAM</Tag>
          )}
          {record.storage_tb && (
            <Tag style={{ fontSize: 11 }}>{record.storage_tb} TB</Tag>
          )}
        </Space>
      ),
    },
    {
      title: "IP Addresses",
      key: "ip_addresses",
      width: 200,
      render: (_, record) => {
        const ips = record.ip_addresses ?? [];
        if (ips.length === 0) return <Text type="secondary">—</Text>;
        const shown = ips.slice(0, 2);
        const remaining = ips.length - shown.length;
        return (
          <Space size={4} wrap>
            {shown.map((ip) => (
              <Tag key={ip.id} color="purple" style={{ fontSize: 11, fontFamily: "monospace" }}>
                {ip.address}
              </Tag>
            ))}
            {remaining > 0 && (
              <Tooltip title={ips.slice(2).map((ip) => ip.address).join(", ")}>
                <Tag style={{ fontSize: 11 }}>+{remaining} more</Tag>
              </Tooltip>
            )}
          </Space>
        );
      },
    },
    {
      title: "Services",
      key: "service_count",
      width: 80,
      align: "center" as const,
      render: (_, record) => (
        <Badge
          count={record.service_count}
          showZero
          style={{ backgroundColor: record.service_count > 0 ? "#1677ff" : "#d9d9d9" }}
        />
      ),
    },
    {
      title: "VMs",
      key: "vm_count",
      width: 65,
      align: "center" as const,
      render: (_, record) => (
        <Badge
          count={record.vm_count}
          showZero
          style={{ backgroundColor: record.vm_count > 0 ? "#52c41a" : "#d9d9d9" }}
        />
      ),
    },
    {
      title: "Owner",
      dataIndex: "owner_name",
      key: "owner_name",
      render: (v: string | null) =>
        v ? <Text style={{ fontSize: 13 }}>{v}</Text> : <Text type="secondary">Unassigned</Text>,
    },
    {
      title: "Last Updated",
      dataIndex: "updated_at",
      key: "updated_at",
      width: 130,
      render: (v: string) => (
        <Tooltip title={formatDate(v)}>
          <Text type="secondary" style={{ fontSize: 12 }}>{timeAgo(v)}</Text>
        </Tooltip>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      width: 120,
      align: "center" as const,
      fixed: "right" as const,
      render: (_, record) => (
        <Space size={4}>
          <Tooltip title="View details">
            <Button
              type="text"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => openView(record.id)}
            />
          </Tooltip>
          <Tooltip title="Edit">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => openEdit(record)}
            />
          </Tooltip>
          <Tooltip title="Delete">
            <Popconfirm
              title={`Delete "${record.name}"?`}
              description="This action cannot be undone."
              okText="Delete"
              okType="danger"
              cancelText="Cancel"
              onConfirm={() => handleDelete(record.id, record.name)}
            >
              <Button
                type="text"
                size="small"
                danger
                icon={<DeleteOutlined />}
              />
            </Popconfirm>
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <>
      {/* ── Page header ─────────────────────────────────────────── */}
      <div style={{ marginBottom: 24 }}>
        <Row align="middle" justify="space-between" wrap={false}>
          <Col>
            <Space align="center">
              <CloudServerOutlined style={{ fontSize: 24, color: "#1677ff" }} />
              <div>
                <Typography.Title level={4} style={{ margin: 0 }}>
                  Servers
                </Typography.Title>
                <Text type="secondary" style={{ fontSize: 13 }}>
                  {total} server{total !== 1 ? "s" : ""} total
                </Text>
              </div>
            </Space>
          </Col>
          <Col>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={openAdd}
              size="middle"
            >
              Add Server
            </Button>
          </Col>
        </Row>
      </div>

      {/* ── Status summary strip ──────────────────────────────── */}
      <Row gutter={[12, 12]} style={{ marginBottom: 20 }}>
        {Object.entries(SERVER_STATUS_CONFIG).map(([key, cfg]) => (
          <Col key={key}>
            <Card
              size="small"
              hoverable
              onClick={() => setStatus(statusFilter === key ? "" : key as ServerStatus)}
              style={{
                cursor: "pointer",
                borderColor: statusFilter === key ? "#1677ff" : "#f0f0f0",
                background: statusFilter === key ? "#e6f4ff" : "#fff",
                minWidth: 120,
              }}
            >
              <Space>
                <Badge color={cfg.badgeColor} />
                <Text strong>{cfg.label}</Text>
                <Text type="secondary">({statusCounts[key] ?? 0})</Text>
              </Space>
            </Card>
          </Col>
        ))}
      </Row>

      {/* ── Filters bar ──────────────────────────────────────── */}
      <Card
        size="small"
        style={{ marginBottom: 16 }}
        bodyStyle={{ padding: "12px 16px" }}
      >
        <Row gutter={12} align="middle">
          <Col flex="auto">
            <Search
              prefix={<SearchOutlined style={{ color: "#bbb" }} />}
              placeholder="Search by name, hostname, location, manufacturer..."
              allowClear
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              style={{ maxWidth: 480 }}
            />
          </Col>
          <Col>
            <Space>
              <FilterOutlined style={{ color: "#8c8c8c" }} />
              <Select
                placeholder="Filter by status"
                allowClear
                value={statusFilter || undefined}
                onChange={(v) => { setStatus(v ?? ""); setPage(1); }}
                style={{ width: 180 }}
                options={ALL_SERVER_STATUSES}
              />
              <Tooltip title="Refresh">
                <Button
                  icon={<ReloadOutlined spin={isFetching} />}
                  onClick={() => refetch()}
                />
              </Tooltip>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* ── Main table ───────────────────────────────────────── */}
      <Card bodyStyle={{ padding: 0 }}>
        <Table<Server>
          dataSource={servers}
          columns={columns}
          rowKey="id"
          loading={isLoading}
          scroll={{ x: 1450 }}
          pagination={{
            current: page,
            pageSize: PAGE_SIZE,
            total,
            showSizeChanger: false,
            showTotal: (t, [from, to]) => `${from}–${to} of ${t} servers`,
            onChange: (p) => setPage(p),
          }}
          rowClassName={(record) =>
            record.status === "decommissioned" ? "row-decommissioned" : ""
          }
          onRow={(record) => ({
            onDoubleClick: () => openView(record.id),
            style: { cursor: "default" },
          })}
        />
      </Card>

      {/* ── Add / Edit modal ─────────────────────────────────── */}
      <ServerFormModal
        open={modalOpen}
        server={editingServer}
        onClose={closeModal}
      />

      {/* ── Detail drawer ────────────────────────────────────── */}
      <ServerDetailDrawer
        serverId={drawerServerId}
        onClose={closeDrawer}
        onEdit={() => {
          const server = servers.find((s) => s.id === drawerServerId) ?? null;
          closeDrawer();
          openEdit(server!);
        }}
      />

      {/* ── Global row styles ────────────────────────────────── */}
      <style>{`
        .row-decommissioned td {
          opacity: 0.55;
        }
        .ant-table-row:hover .row-decommissioned td {
          opacity: 1;
        }
      `}</style>
    </>
  );
}
