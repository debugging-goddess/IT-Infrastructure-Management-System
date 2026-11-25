import { useState, useMemo } from "react";
import {
  Table, Button, Input, Space, Popconfirm,
  Tooltip, Typography, Row, Col, Tag, message, Badge,
} from "antd";
import type { TableProps } from "antd";
import {
  PlusOutlined, SearchOutlined, ReloadOutlined,
  EditOutlined, DeleteOutlined, PartitionOutlined,
} from "@ant-design/icons";
import { useSubnets, useDeleteSubnet } from "@/hooks/useNetwork";
import SubnetFormModal from "./SubnetFormModal";
import { timeAgo } from "@/utils/formatters";
import type { Subnet } from "@/types";

const { Text } = Typography;
const { Search } = Input;

export default function SubnetTab() {
  const [search, setSearch] = useState("");
  const [page, setPage]     = useState(1);
  const PAGE_SIZE = 20;

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing]     = useState<Subnet | null>(null);

  const queryParams = useMemo(() => ({
    ...(search ? { search } : {}),
    page,
    page_size: PAGE_SIZE,
  }), [search, page]);

  const { data, isLoading, isFetching, refetch } = useSubnets(queryParams);
  const deleteSubnet = useDeleteSubnet();

  const subnets = data?.results ?? [];
  const total   = data?.count   ?? 0;

  const openAdd  = ()             => { setEditing(null); setModalOpen(true); };
  const openEdit = (s: Subnet)    => { setEditing(s);    setModalOpen(true); };

  const handleDelete = async (id: number, cidr: string) => {
    try {
      await deleteSubnet.mutateAsync(id);
      message.success(`Subnet ${cidr} deleted`);
    } catch {
      message.error("Failed to delete subnet");
    }
  };

  const columns: TableProps<Subnet>["columns"] = [
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      render: (v: string, record) => (
        <Space>
          <PartitionOutlined style={{ color: "#13c2c2" }} />
          {v ? <Text strong>{v}</Text> : <Text type="secondary">{record.cidr}</Text>}
        </Space>
      ),
    },
    {
      title: "CIDR",
      dataIndex: "cidr",
      key: "cidr",
      render: (v: string) => <Text code strong>{v}</Text>,
    },
    {
      title: "Subnet Mask",
      dataIndex: "netmask",
      key: "netmask",
      render: (v: string | null) => v ? <Text code style={{ fontSize: 12 }}>{v}</Text> : <Text type="secondary">—</Text>,
    },
    {
      title: "Gateway",
      dataIndex: "gateway",
      key: "gateway",
      render: (v: string | null) => v ? <Text code style={{ fontSize: 12 }}>{v}</Text> : <Text type="secondary">—</Text>,
    },
    {
      title: "VLAN",
      key: "vlan",
      render: (_, record) =>
        record.vlan_name ? (
          <Tag color="geekblue">VLAN {record.vlan_vid} — {record.vlan_name}</Tag>
        ) : (
          <Text type="secondary">—</Text>
        ),
    },
    {
      title: "DHCP",
      dataIndex: "dhcp_enabled",
      key: "dhcp_enabled",
      width: 90,
      align: "center" as const,
      render: (v: boolean) =>
        v ? <Tag color="cyan">Enabled</Tag> : <Tag>Off</Tag>,
    },
    {
      title: "IPs",
      dataIndex: "ip_count",
      key: "ip_count",
      width: 70,
      align: "center" as const,
      render: (v: number) => (
        <Badge count={v} showZero style={{ backgroundColor: v > 0 ? "#722ed1" : "#d9d9d9" }} />
      ),
    },
    {
      title: "Updated",
      dataIndex: "updated_at",
      key: "updated_at",
      width: 110,
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
              title={`Delete ${record.cidr}?`}
              description="IPs in this subnet will be unlinked."
              okText="Delete"
              okType="danger"
              onConfirm={() => handleDelete(record.id, record.cidr)}
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
          <Space>
            <Search
              prefix={<SearchOutlined style={{ color: "#bbb" }} />}
              placeholder="Search CIDR, description..."
              allowClear
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              style={{ width: 280 }}
            />
            <Tooltip title="Refresh">
              <Button icon={<ReloadOutlined spin={isFetching} />} onClick={() => refetch()} />
            </Tooltip>
          </Space>
        </Col>
        <Col>
          <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>
            Add Subnet
          </Button>
        </Col>
      </Row>

      <Table<Subnet>
        dataSource={subnets}
        columns={columns}
        rowKey="id"
        loading={isLoading}
        size="middle"
        scroll={{ x: 1050 }}
        pagination={{
          current: page,
          pageSize: PAGE_SIZE,
          total,
          showSizeChanger: false,
          showTotal: (t, [from, to]) => `${from}–${to} of ${t} subnets`,
          onChange: (p) => setPage(p),
        }}
      />

      <SubnetFormModal
        open={modalOpen}
        subnet={editing}
        onClose={() => { setModalOpen(false); setEditing(null); }}
      />
    </>
  );
}
