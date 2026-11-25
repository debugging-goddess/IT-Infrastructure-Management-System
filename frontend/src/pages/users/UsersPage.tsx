import { useState, useMemo } from "react";
import {
  Table, Button, Input, Select, Space, Card,
  Popconfirm, Tooltip, Typography, Row, Col,
  Tag, message, Avatar, Badge, Switch,
} from "antd";
import type { TableProps } from "antd";
import {
  PlusOutlined, SearchOutlined, ReloadOutlined,
  EditOutlined, DeleteOutlined, TeamOutlined,
  MailOutlined, PhoneOutlined, FilterOutlined,
  CloudServerOutlined, DesktopOutlined, AppstoreOutlined,
  CrownOutlined,
} from "@ant-design/icons";
import {
  useUsers, useDeleteUser, useToggleUserActive,
} from "@/hooks/useUsers";
import { useAuth } from "@/store/AuthContext";
import UserFormModal from "@/components/users/UserFormModal";
import UserAssetsModal from "@/components/users/UserAssetsModal";
import { timeAgo } from "@/utils/formatters";
import type { User } from "@/types";

const { Text } = Typography;
const { Search } = Input;

// Deterministic avatar colour from a string
function avatarColor(seed: string): string {
  const colors = ["#1677ff", "#52c41a", "#fa8c16", "#722ed1", "#13c2c2", "#eb2f96", "#faad14"];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

function initials(user: User): string {
  const f = user.first_name?.[0] ?? "";
  const l = user.last_name?.[0] ?? "";
  return (f + l || user.username[0] || "?").toUpperCase();
}

export default function UsersPage() {
  const [search, setSearch]       = useState("");
  const [activeFilter, setActive] = useState<"all" | "active" | "inactive">("all");
  const [page, setPage]           = useState(1);
  const PAGE_SIZE = 20;

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing]     = useState<User | null>(null);
  const [assetsUser, setAssetsUser] = useState<User | null>(null);

  // Same source the sidebar uses, so the two can never disagree
  const { user: currentUser } = useAuth();
  const isAdmin = !!(currentUser?.is_staff || currentUser?.is_superuser);

  const queryParams = useMemo(() => ({
    ...(search ? { search } : {}),
    ...(activeFilter !== "all" ? { is_active: activeFilter === "active" } : {}),
    page,
    page_size: PAGE_SIZE,
  }), [search, activeFilter, page]);

  const { data, isLoading, isFetching, refetch } = useUsers(queryParams);
  const deleteUser   = useDeleteUser();
  const toggleActive = useToggleUserActive();

  const users = data?.results ?? [];
  const total = data?.count   ?? 0;

  const openAdd  = ()          => { setEditing(null); setModalOpen(true); };
  const openEdit = (u: User)   => { setEditing(u);    setModalOpen(true); };

  const handleDelete = async (id: number, name: string) => {
    try {
      await deleteUser.mutateAsync(id);
      message.success(`User "${name}" deleted`);
    } catch {
      message.error("Failed to delete user — you may lack permission");
    }
  };

  const handleToggle = async (user: User) => {
    try {
      await toggleActive.mutateAsync({ id: user.id, isActive: !user.is_active });
      message.success(`${user.full_name} ${user.is_active ? "deactivated" : "reactivated"}`);
    } catch {
      message.error("Failed to update user status");
    }
  };

  const columns: TableProps<User>["columns"] = [
    {
      title: "Name",
      key: "name",
      render: (_, record) => (
        <Space>
          <Avatar style={{ backgroundColor: avatarColor(record.username), flexShrink: 0 }}>
            {initials(record)}
          </Avatar>
          <Space direction="vertical" size={0}>
            <Space size={6}>
              <Text strong>{record.full_name}</Text>
              {record.is_superuser && (
                <Tooltip title="Superuser">
                  <CrownOutlined style={{ color: "#faad14" }} />
                </Tooltip>
              )}
            </Space>
            <Text type="secondary" style={{ fontSize: 12 }}>@{record.username}</Text>
          </Space>
        </Space>
      ),
    },
    {
      title: "Contact",
      key: "contact",
      render: (_, record) => (
        <Space direction="vertical" size={2}>
          <a href={`mailto:${record.email}`}>
            <Space size={4}><MailOutlined style={{ fontSize: 12 }} />{record.email}</Space>
          </a>
          {record.phone ? (
            <a href={`tel:${record.phone}`}>
              <Space size={4}>
                <PhoneOutlined style={{ fontSize: 12, color: "#52c41a" }} />
                <Text style={{ fontSize: 13 }}>{record.phone}</Text>
              </Space>
            </a>
          ) : (
            <Text type="secondary" style={{ fontSize: 12 }}>No phone on file</Text>
          )}
        </Space>
      ),
    },
    {
      title: "Roles",
      key: "roles",
      render: (_, record) => (
        <Space size={4} wrap>
          {record.is_asset_manager && <Tag color="blue">Asset Manager</Tag>}
          {record.is_staff && <Tag color="gold">Staff</Tag>}
          {!record.is_asset_manager && !record.is_staff && (
            <Tag>Member</Tag>
          )}
        </Space>
      ),
    },
    {
      title: "Owns",
      key: "owns",
      width: 220,
      render: (_, record) => {
        const total = record.owned_server_count + record.owned_vm_count + record.owned_application_count;

        // Admins can click through to assign or release assets
        const manage = isAdmin && record.is_active;

        if (total === 0) {
          return manage ? (
            <Button
              type="link"
              size="small"
              icon={<PlusOutlined />}
              style={{ padding: 0 }}
              onClick={() => setAssetsUser(record)}
            >
              Assign assets
            </Button>
          ) : (
            <Text type="secondary">Nothing assigned</Text>
          );
        }

        const counts = (
          <Space size={10}>
            <Tooltip title={`${record.owned_server_count} servers`}>
              <Space size={3}>
                <CloudServerOutlined style={{ color: "#1677ff" }} />
                <Text>{record.owned_server_count}</Text>
              </Space>
            </Tooltip>
            <Tooltip title={`${record.owned_vm_count} VMs`}>
              <Space size={3}>
                <DesktopOutlined style={{ color: "#52c41a" }} />
                <Text>{record.owned_vm_count}</Text>
              </Space>
            </Tooltip>
            <Tooltip title={`${record.owned_application_count} applications`}>
              <Space size={3}>
                <AppstoreOutlined style={{ color: "#fa8c16" }} />
                <Text>{record.owned_application_count}</Text>
              </Space>
            </Tooltip>
          </Space>
        );

        return manage ? (
          <Tooltip title="Manage assets">
            <Button
              type="text"
              size="small"
              style={{ padding: "0 6px" }}
              onClick={() => setAssetsUser(record)}
            >
              <Space size={8}>{counts}<EditOutlined style={{ color: "#8c8c8c" }} /></Space>
            </Button>
          </Tooltip>
        ) : (
          counts
        );
      },
    },
    {
      title: "Status",
      key: "status",
      width: 110,
      render: (_, record) =>
        record.is_active ? (
          <Badge status="success" text="Active" />
        ) : (
          <Badge status="default" text="Inactive" />
        ),
    },
    {
      title: "Last Login",
      dataIndex: "last_login",
      key: "last_login",
      width: 120,
      render: (v: string | null) =>
        v ? (
          <Text type="secondary" style={{ fontSize: 12 }}>{timeAgo(v)}</Text>
        ) : (
          <Text type="secondary" style={{ fontSize: 12 }}>Never</Text>
        ),
    },
    {
      title: "Actions",
      key: "actions",
      width: 150,
      align: "center" as const,
      fixed: "right" as const,
      render: (_, record) => (
        <Space size={4}>
          {/* Admins edit anyone (superuser accounts only by superusers); everyone edits themselves */}
          {(record.id === currentUser?.id ||
            (isAdmin && (!record.is_superuser || currentUser?.is_superuser))) && (
            <Tooltip title={record.id === currentUser?.id ? "Edit my profile" : "Edit"}>
              <Button type="text" size="small" icon={<EditOutlined />} onClick={() => openEdit(record)} />
            </Tooltip>
          )}
          {isAdmin && (
            <Tooltip title={record.is_active ? "Deactivate" : "Reactivate"}>
              <Switch
                size="small"
                checked={record.is_active}
                loading={toggleActive.isPending}
                onChange={() => handleToggle(record)}
                disabled={record.id === currentUser?.id}
              />
            </Tooltip>
          )}
          {isAdmin && (
            <Tooltip title="Delete">
              <Popconfirm
                title={`Delete "${record.full_name}"?`}
                description="Owned assets will be left without an owner. Consider deactivating instead."
                okText="Delete"
                okType="danger"
                onConfirm={() => handleDelete(record.id, record.full_name)}
                disabled={record.id === currentUser?.id}
              >
                <Button
                  type="text"
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  disabled={record.id === currentUser?.id}
                />
              </Popconfirm>
            </Tooltip>
          )}
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
              <TeamOutlined style={{ fontSize: 24, color: "#1677ff" }} />
              <div>
                <Typography.Title level={4} style={{ margin: 0 }}>
                  Users
                </Typography.Title>
                <Text type="secondary" style={{ fontSize: 13 }}>
                  {total} {total === 1 ? "person" : "people"} — owners and contacts
                </Text>
              </div>
            </Space>
          </Col>
          {isAdmin && (
            <Col>
              <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>
                Add User
              </Button>
            </Col>
          )}
        </Row>
      </div>

      {/* ── Filters bar ──────────────────────────────────────── */}
      <Card size="small" style={{ marginBottom: 16 }} styles={{ body: { padding: "12px 16px" } }}>
        <Row gutter={12} align="middle">
          <Col flex="auto">
            <Search
              prefix={<SearchOutlined style={{ color: "#bbb" }} />}
              placeholder="Search by name, email, phone..."
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
                value={activeFilter}
                onChange={(v) => { setActive(v); setPage(1); }}
                style={{ width: 160 }}
                options={[
                  { value: "all",      label: "All users" },
                  { value: "active",   label: "Active only" },
                  { value: "inactive", label: "Inactive only" },
                ]}
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
        <Table<User>
          dataSource={users}
          columns={columns}
          rowKey="id"
          loading={isLoading}
          scroll={{ x: 1100 }}
          pagination={{
            current: page,
            pageSize: PAGE_SIZE,
            total,
            showSizeChanger: false,
            showTotal: (t, [from, to]) => `${from}–${to} of ${t} users`,
            onChange: (p) => setPage(p),
          }}
          rowClassName={(record) => (!record.is_active ? "row-inactive" : "")}
        />
      </Card>

      {/* ── Manage assets modal ──────────────────────────────── */}
      <UserAssetsModal
        open={!!assetsUser}
        user={assetsUser}
        onClose={() => setAssetsUser(null)}
      />

      {/* ── Add / Edit modal ─────────────────────────────────── */}
      <UserFormModal
        open={modalOpen}
        user={editing}
        onClose={() => { setModalOpen(false); setEditing(null); }}
      />

      {/* ── Row styles ───────────────────────────────────────── */}
      <style>{`
        .row-inactive td { opacity: 0.55; }
        .ant-table-row:hover .row-inactive td { opacity: 1; }
      `}</style>
    </>
  );
}
