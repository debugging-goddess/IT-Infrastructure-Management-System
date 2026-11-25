import { useState, useMemo } from "react";
import {
  Table, Button, Input, Select, Space,
  Popconfirm, Tooltip, Typography, Row, Col,
  Tag, message, Badge,
} from "antd";
import type { TableProps } from "antd";
import {
  PlusOutlined, SearchOutlined, ReloadOutlined,
  EditOutlined, DeleteOutlined, FilterOutlined,
  GlobalOutlined, DesktopOutlined, CloudServerOutlined,
} from "@ant-design/icons";
import { useIPAddresses, useDeleteIP } from "@/hooks/useNetwork";
import IPAddressFormModal from "./IPAddressFormModal";
import { IP_STATUS_CONFIG, ALL_IP_STATUSES } from "@/utils/ipStatus";
import { timeAgo } from "@/utils/formatters";
import type { IPAddress, IPStatus } from "@/types";

const { Text } = Typography;
const { Search } = Input;

export default function IPAddressTab() {
  const [search, setSearch]       = useState("");
  const [statusFilter, setStatus] = useState<IPStatus | "">("");
  const [page, setPage]           = useState(1);
  const PAGE_SIZE = 20;

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing]     = useState<IPAddress | null>(null);

  const queryParams = useMemo(() => ({
    ...(search       ? { search }               : {}),
    ...(statusFilter ? { status: statusFilter } : {}),
    page,
    page_size: PAGE_SIZE,
  }), [search, statusFilter, page]);

  const { data, isLoading, isFetching, refetch } = useIPAddresses(queryParams);
  const deleteIP = useDeleteIP();

  const ips   = data?.results ?? [];
  const total = data?.count   ?? 0;

  const openAdd  = ()               => { setEditing(null); setModalOpen(true); };
  const openEdit = (ip: IPAddress)  => { setEditing(ip);   setModalOpen(true); };

  const handleDelete = async (id: number, address: string) => {
    try {
      await deleteIP.mutateAsync(id);
      message.success(`IP ${address} deleted`);
    } catch {
      message.error("Failed to delete IP");
    }
  };

  const columns: TableProps<IPAddress>["columns"] = [
    {
      title: "IP Address",
      dataIndex: "address",
      key: "address",
      render: (v: string) => (
        <Space>
          <GlobalOutlined style={{ color: "#722ed1" }} />
          <Text code strong>{v}</Text>
        </Space>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 130,
      render: (status: IPStatus) => {
        const cfg = IP_STATUS_CONFIG[status];
        return cfg ? <Badge color={cfg.badgeColor} text={cfg.label} /> : <Tag>{status}</Tag>;
      },
    },
    {
      title: "DNS Name",
      dataIndex: "dns_name",
      key: "dns_name",
      render: (v: string) => v || <Text type="secondary">—</Text>,
    },
    {
      title: "Subnet",
      dataIndex: "subnet_cidr",
      key: "subnet_cidr",
      render: (v: string | null) => v ? <Text code style={{ fontSize: 12 }}>{v}</Text> : <Text type="secondary">—</Text>,
    },
    {
      title: "Assigned To",
      key: "assignment",
      render: (_, record) =>
        record.assigned_server_name ? (
          <Space size={4}>
            <CloudServerOutlined style={{ color: "#1677ff", fontSize: 12 }} />
            <Text style={{ fontSize: 13 }}>{record.assigned_server_name}</Text>
          </Space>
        ) : record.assigned_vm_name ? (
          <Space size={4}>
            <DesktopOutlined style={{ color: "#52c41a", fontSize: 12 }} />
            <Text style={{ fontSize: 13 }}>{record.assigned_vm_name}</Text>
          </Space>
        ) : (
          <Text type="secondary">Unassigned</Text>
        ),
    },
    {
      title: "Updated",
      dataIndex: "updated_at",
      key: "updated_at",
      width: 120,
      render: (v: string) => <Text type="secondary" style={{ fontSize: 12 }}>{timeAgo(v)}</Text>,
    },
    {
      title: "Actions",
      key: "actions",
      width: 90,
      align: "center" as const,
      render: (_, record) => (
        <Space size={4}>
          <Tooltip title="Edit">
            <Button type="text" size="small" icon={<EditOutlined />} onClick={() => openEdit(record)} />
          </Tooltip>
          <Tooltip title="Delete">
            <Popconfirm
              title={`Delete ${record.address}?`}
              okText="Delete"
              okType="danger"
              onConfirm={() => handleDelete(record.id, record.address)}
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
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col flex="auto">
          <Space wrap>
            <Search
              prefix={<SearchOutlined style={{ color: "#bbb" }} />}
              placeholder="Search IP, DNS name..."
              allowClear
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              style={{ width: 280 }}
            />
            <FilterOutlined style={{ color: "#8c8c8c" }} />
            <Select
              placeholder="Status"
              allowClear
              value={statusFilter || undefined}
              onChange={(v) => { setStatus(v ?? ""); setPage(1); }}
              style={{ width: 150 }}
              options={ALL_IP_STATUSES}
            />
            <Tooltip title="Refresh">
              <Button icon={<ReloadOutlined spin={isFetching} />} onClick={() => refetch()} />
            </Tooltip>
          </Space>
        </Col>
        <Col>
          <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>
            Add IP Address
          </Button>
        </Col>
      </Row>

      <Table<IPAddress>
        dataSource={ips}
        columns={columns}
        rowKey="id"
        loading={isLoading}
        size="middle"
        scroll={{ x: 900 }}
        pagination={{
          current: page,
          pageSize: PAGE_SIZE,
          total,
          showSizeChanger: false,
          showTotal: (t, [from, to]) => `${from}–${to} of ${t} IPs`,
          onChange: (p) => setPage(p),
        }}
      />

      <IPAddressFormModal
        open={modalOpen}
        ip={editing}
        onClose={() => { setModalOpen(false); setEditing(null); }}
      />
    </>
  );
}
