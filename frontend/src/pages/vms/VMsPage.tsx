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
  DesktopOutlined, FilterOutlined, CloudServerOutlined,
} from "@ant-design/icons";
import { useVMs, useDeleteVM } from "@/hooks/useVMs";
import VMFormModal from "@/components/infrastructure/VMFormModal";
import VMDetailDrawer from "@/components/infrastructure/VMDetailDrawer";
import StatusBadge from "@/components/common/StatusBadge";
import { SERVER_STATUS_CONFIG, ALL_SERVER_STATUSES } from "@/utils/serverStatus";
import { formatDate, timeAgo } from "@/utils/formatters";
import type { VirtualMachine, ServerStatus } from "@/types";

const { Text } = Typography;
const { Search } = Input;

// OS icon helper
function OsTag({ os }: { os: string }) {
  if (!os) return <Text type="secondary">—</Text>;
  const lower = os.toLowerCase();
  let color = "default";
  let icon = "💻";
  if (lower.includes("windows")) { color = "blue";   icon = "🪟"; }
  else if (lower.includes("ubuntu"))  { color = "orange"; icon = "🟠"; }
  else if (lower.includes("debian"))  { color = "purple"; icon = "🌀"; }
  else if (lower.includes("centos") || lower.includes("rocky") || lower.includes("alma") || lower.includes("red hat")) {
    color = "red"; icon = "🎩";
  } else { color = "green"; icon = "🐧"; }

  return (
    <Tag color={color} style={{ fontSize: 11 }}>
      {icon} {os}
    </Tag>
  );
}

export default function VMsPage() {
  // ── Filter / pagination state ──────────────────────────────────
  const [search, setSearch]         = useState("");
  const [statusFilter, setStatus]   = useState<ServerStatus | "">("");
  const [page, setPage]             = useState(1);
  const PAGE_SIZE                   = 20;

  // ── Modal / drawer state ───────────────────────────────────────
  const [modalOpen, setModalOpen]     = useState(false);
  const [editingVM, setEditing]       = useState<VirtualMachine | null>(null);
  const [drawerVMId, setDrawerId]     = useState<number | null>(null);

  // ── Data ───────────────────────────────────────────────────────
  const queryParams = useMemo(() => ({
    ...(search       ? { search }               : {}),
    ...(statusFilter ? { status: statusFilter } : {}),
    page,
    page_size: PAGE_SIZE,
  }), [search, statusFilter, page]);

  const { data, isLoading, isFetching, refetch } = useVMs(queryParams);
  const deleteVM = useDeleteVM();

  const vms   = data?.results ?? [];
  const total = data?.count   ?? 0;

  // ── Status summary counts ──────────────────────────────────────
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    vms.forEach((v) => { counts[v.status] = (counts[v.status] ?? 0) + 1; });
    return counts;
  }, [vms]);

  // ── Actions ────────────────────────────────────────────────────
  const openAdd  = ()                  => { setEditing(null); setModalOpen(true); };
  const openEdit = (v: VirtualMachine) => { setEditing(v);    setModalOpen(true); };
  const openView = (id: number)        => setDrawerId(id);
  const closeModal  = ()               => { setModalOpen(false); setEditing(null); };
  const closeDrawer = ()               => setDrawerId(null);

  const handleDelete = async (id: number, name: string) => {
    try {
      await deleteVM.mutateAsync(id);
      message.success(`VM "${name}" deleted`);
    } catch {
      message.error("Failed to delete VM");
    }
  };

  // ── Table columns ──────────────────────────────────────────────
  const columns: TableProps<VirtualMachine>["columns"] = [
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      sorter: true,
      render: (name: string, record) => (
        <Space>
          <DesktopOutlined style={{ color: "#52c41a" }} />
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
      title: "Host Server",
      dataIndex: "host_server_name",
      key: "host_server_name",
      render: (v: string | null) =>
        v ? (
          <Space>
            <CloudServerOutlined style={{ color: "#1677ff", fontSize: 12 }} />
            <Text style={{ fontSize: 13 }}>{v}</Text>
          </Space>
        ) : (
          <Text type="secondary">—</Text>
        ),
    },
    {
      title: "OS",
      dataIndex: "os",
      key: "os",
      render: (v: string) => <OsTag os={v} />,
    },
    {
      title: "Resources",
      key: "resources",
      render: (_, record) => (
        <Space size={4} wrap>
          {record.vcpu   && <Tag style={{ fontSize: 11 }}>{record.vcpu} vCPU</Tag>}
          {record.ram_gb && <Tag style={{ fontSize: 11 }}>{record.ram_gb} GB</Tag>}
          {record.disk_gb && <Tag style={{ fontSize: 11 }}>{record.disk_gb} GB disk</Tag>}
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
      title: "Apps",
      key: "app_count",
      width: 65,
      align: "center" as const,
      render: (_, record) => (
        <Badge
          count={record.app_count}
          showZero
          style={{ backgroundColor: record.app_count > 0 ? "#fa8c16" : "#d9d9d9" }}
        />
      ),
    },
    {
      title: "Services",
      key: "service_count",
      width: 75,
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
              <DesktopOutlined style={{ fontSize: 24, color: "#52c41a" }} />
              <div>
                <Typography.Title level={4} style={{ margin: 0 }}>
                  Virtual Machines
                </Typography.Title>
                <Text type="secondary" style={{ fontSize: 13 }}>
                  {total} VM{total !== 1 ? "s" : ""} total
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
              Add VM
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
                borderColor: statusFilter === key ? "#52c41a" : "#f0f0f0",
                background: statusFilter === key ? "#f6ffed" : "#fff",
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
        styles={{ body: { padding: "12px 16px" } }}
      >
        <Row gutter={12} align="middle">
          <Col flex="auto">
            <Search
              prefix={<SearchOutlined style={{ color: "#bbb" }} />}
              placeholder="Search by name, hostname, OS..."
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
      <Card styles={{ body: { padding: 0 } }}>
        <Table<VirtualMachine>
          dataSource={vms}
          columns={columns}
          rowKey="id"
          loading={isLoading}
          scroll={{ x: 1550 }}
          pagination={{
            current: page,
            pageSize: PAGE_SIZE,
            total,
            showSizeChanger: false,
            showTotal: (t, [from, to]) => `${from}–${to} of ${t} VMs`,
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
      <VMFormModal
        open={modalOpen}
        vm={editingVM}
        onClose={closeModal}
      />

      {/* ── Detail drawer ────────────────────────────────────── */}
      <VMDetailDrawer
        vmId={drawerVMId}
        onClose={closeDrawer}
        onEdit={() => {
          const vm = vms.find((v) => v.id === drawerVMId) ?? null;
          closeDrawer();
          if (vm) openEdit(vm);
        }}
      />

      {/* ── Global row styles ────────────────────────────────── */}
      <style>{`
        .row-decommissioned td { opacity: 0.55; }
        .ant-table-row:hover .row-decommissioned td { opacity: 1; }
      `}</style>
    </>
  );
}
