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
  AppstoreOutlined, FilterOutlined,
  DesktopOutlined, CloudServerOutlined, LinkOutlined,
} from "@ant-design/icons";
import {
  useApplications, useDeleteApplication,
} from "@/hooks/useApplications";
import ApplicationFormModal from "@/components/software/ApplicationFormModal";
import ApplicationDetailDrawer from "@/components/software/ApplicationDetailDrawer";
import { APP_STATUS_CONFIG, ALL_APP_STATUSES } from "@/utils/appStatus";
import { formatDate, timeAgo } from "@/utils/formatters";
import type { Application, AppStatus } from "@/types";

const { Text } = Typography;
const { Search } = Input;

function AppStatusBadge({ status }: { status: AppStatus }) {
  const cfg = APP_STATUS_CONFIG[status];
  if (!cfg) return <Tag>{status}</Tag>;
  return <Badge color={cfg.badgeColor} text={cfg.label} style={{ whiteSpace: "nowrap" }} />;
}

export default function ApplicationsPage() {
  // ── Filter / pagination state ──────────────────────────────────
  const [search, setSearch]       = useState("");
  const [statusFilter, setStatus] = useState<AppStatus | "">("");
  const [page, setPage]           = useState(1);
  const PAGE_SIZE                 = 20;

  // ── Modal / drawer state ───────────────────────────────────────
  const [modalOpen, setModalOpen]  = useState(false);
  const [editingApp, setEditing]   = useState<Application | null>(null);
  const [drawerAppId, setDrawerId] = useState<number | null>(null);

  // ── Data ───────────────────────────────────────────────────────
  const queryParams = useMemo(() => ({
    ...(search       ? { search }               : {}),
    ...(statusFilter ? { status: statusFilter } : {}),
    page,
    page_size: PAGE_SIZE,
  }), [search, statusFilter, page]);

  const { data, isLoading, isFetching, refetch } = useApplications(queryParams);
  const deleteApp = useDeleteApplication();

  const apps  = data?.results ?? [];
  const total = data?.count   ?? 0;

  // ── Status summary counts ──────────────────────────────────────
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    apps.forEach((a) => { counts[a.status] = (counts[a.status] ?? 0) + 1; });
    return counts;
  }, [apps]);

  // ── Actions ────────────────────────────────────────────────────
  const openAdd  = ()                 => { setEditing(null); setModalOpen(true); };
  const openEdit = (a: Application)   => { setEditing(a);    setModalOpen(true); };
  const openView = (id: number)       => setDrawerId(id);
  const closeModal  = ()              => { setModalOpen(false); setEditing(null); };
  const closeDrawer = ()              => setDrawerId(null);

  const handleDelete = async (id: number, name: string) => {
    try {
      await deleteApp.mutateAsync(id);
      message.success(`Application "${name}" deleted`);
    } catch {
      message.error("Failed to delete application");
    }
  };

  // ── Table columns ──────────────────────────────────────────────
  const columns: TableProps<Application>["columns"] = [
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      sorter: true,
      render: (name: string, record) => (
        <Space>
          <AppstoreOutlined style={{ color: "#fa8c16" }} />
          <Button
            type="link"
            style={{ padding: 0, fontWeight: 600 }}
            onClick={() => openView(record.id)}
          >
            {name}
          </Button>
          {record.version && <Tag style={{ fontSize: 11 }}>{record.version}</Tag>}
        </Space>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 140,
      render: (status: AppStatus) => <AppStatusBadge status={status} />,
      filters: ALL_APP_STATUSES.map((s) => ({ text: s.label, value: s.value })),
      onFilter: (value, record) => record.status === value,
    },
    {
      title: "Deployed On",
      key: "deployment",
      render: (_, record) =>
        record.vm_name ? (
          <Space size={4}>
            <DesktopOutlined style={{ color: "#52c41a", fontSize: 12 }} />
            <Text style={{ fontSize: 13 }}>{record.vm_name}</Text>
            <Tag color="green" style={{ fontSize: 10 }}>VM</Tag>
          </Space>
        ) : record.server_name ? (
          <Space size={4}>
            <CloudServerOutlined style={{ color: "#1677ff", fontSize: 12 }} />
            <Text style={{ fontSize: 13 }}>{record.server_name}</Text>
            <Tag color="blue" style={{ fontSize: 10 }}>Server</Tag>
          </Space>
        ) : (
          <Text type="secondary">—</Text>
        ),
    },
    {
      title: "Port",
      dataIndex: "port",
      key: "port",
      width: 80,
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
            <Space size={4}><LinkOutlined style={{ fontSize: 12 }} />Open</Space>
          </a>
        ) : (
          <Text type="secondary">—</Text>
        ),
    },
    {
      title: "Deps",
      key: "dependencies",
      width: 70,
      align: "center" as const,
      render: (_, record) => (
        <Tooltip title={`${record.dependencies.length} dependencies`}>
          <Badge
            count={record.dependencies.length}
            showZero
            style={{ backgroundColor: record.dependencies.length > 0 ? "#fa8c16" : "#d9d9d9" }}
          />
        </Tooltip>
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
            <Button type="text" size="small" icon={<EyeOutlined />} onClick={() => openView(record.id)} />
          </Tooltip>
          <Tooltip title="Edit">
            <Button type="text" size="small" icon={<EditOutlined />} onClick={() => openEdit(record)} />
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
              <Button type="text" size="small" danger icon={<DeleteOutlined />} />
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
              <AppstoreOutlined style={{ fontSize: 24, color: "#fa8c16" }} />
              <div>
                <Typography.Title level={4} style={{ margin: 0 }}>
                  Applications
                </Typography.Title>
                <Text type="secondary" style={{ fontSize: 13 }}>
                  {total} application{total !== 1 ? "s" : ""} total
                </Text>
              </div>
            </Space>
          </Col>
          <Col>
            <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>
              Add Application
            </Button>
          </Col>
        </Row>
      </div>

      {/* ── Status summary strip ──────────────────────────────── */}
      <Row gutter={[12, 12]} style={{ marginBottom: 20 }}>
        {Object.entries(APP_STATUS_CONFIG).map(([key, cfg]) => (
          <Col key={key}>
            <Card
              size="small"
              hoverable
              onClick={() => setStatus(statusFilter === key ? "" : key as AppStatus)}
              style={{
                cursor: "pointer",
                borderColor: statusFilter === key ? "#fa8c16" : "#f0f0f0",
                background: statusFilter === key ? "#fff7e6" : "#fff",
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
      <Card size="small" style={{ marginBottom: 16 }} styles={{ body: { padding: "12px 16px" } }}>
        <Row gutter={12} align="middle">
          <Col flex="auto">
            <Search
              prefix={<SearchOutlined style={{ color: "#bbb" }} />}
              placeholder="Search by name, version, description..."
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
                options={ALL_APP_STATUSES}
              />
              <Tooltip title="Refresh">
                <Button icon={<ReloadOutlined spin={isFetching} />} onClick={() => refetch()} />
              </Tooltip>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* ── Main table ───────────────────────────────────────── */}
      <Card styles={{ body: { padding: 0 } }}>
        <Table<Application>
          dataSource={apps}
          columns={columns}
          rowKey="id"
          loading={isLoading}
          scroll={{ x: 1250 }}
          pagination={{
            current: page,
            pageSize: PAGE_SIZE,
            total,
            showSizeChanger: false,
            showTotal: (t, [from, to]) => `${from}–${to} of ${t} applications`,
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
      <ApplicationFormModal
        open={modalOpen}
        application={editingApp}
        onClose={closeModal}
      />

      {/* ── Detail drawer ────────────────────────────────────── */}
      <ApplicationDetailDrawer
        applicationId={drawerAppId}
        onClose={closeDrawer}
        onEdit={() => {
          const app = apps.find((a) => a.id === drawerAppId) ?? null;
          closeDrawer();
          if (app) openEdit(app);
        }}
      />

      {/* ── Row styles ───────────────────────────────────────── */}
      <style>{`
        .row-decommissioned td { opacity: 0.55; }
        .ant-table-row:hover .row-decommissioned td { opacity: 1; }
      `}</style>
    </>
  );
}
