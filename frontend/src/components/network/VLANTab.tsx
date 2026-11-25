import { useState, useMemo } from "react";
import {
  Table, Button, Input, Space, Popconfirm,
  Tooltip, Typography, Row, Col, message, Badge,
} from "antd";
import type { TableProps } from "antd";
import {
  PlusOutlined, SearchOutlined, ReloadOutlined,
  EditOutlined, DeleteOutlined, ApartmentOutlined,
} from "@ant-design/icons";
import { useVLANs, useDeleteVLAN } from "@/hooks/useNetwork";
import VLANFormModal from "./VLANFormModal";
import { timeAgo } from "@/utils/formatters";
import type { VLAN } from "@/types";

const { Text } = Typography;
const { Search } = Input;

export default function VLANTab() {
  const [search, setSearch] = useState("");
  const [page, setPage]     = useState(1);
  const PAGE_SIZE = 20;

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing]     = useState<VLAN | null>(null);

  const queryParams = useMemo(() => ({
    ...(search ? { search } : {}),
    page,
    page_size: PAGE_SIZE,
  }), [search, page]);

  const { data, isLoading, isFetching, refetch } = useVLANs(queryParams);
  const deleteVLAN = useDeleteVLAN();

  const vlans = data?.results ?? [];
  const total = data?.count   ?? 0;

  const openAdd  = ()           => { setEditing(null); setModalOpen(true); };
  const openEdit = (v: VLAN)    => { setEditing(v);    setModalOpen(true); };

  const handleDelete = async (id: number, vid: number) => {
    try {
      await deleteVLAN.mutateAsync(id);
      message.success(`VLAN ${vid} deleted`);
    } catch {
      message.error("Failed to delete VLAN");
    }
  };

  const columns: TableProps<VLAN>["columns"] = [
    {
      title: "VID",
      dataIndex: "vid",
      key: "vid",
      width: 100,
      render: (v: number) => (
        <Space>
          <ApartmentOutlined style={{ color: "#2f54eb" }} />
          <Text code strong>{v}</Text>
        </Space>
      ),
    },
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      render: (v: string) => <Text strong>{v}</Text>,
    },
    {
      title: "Subnets",
      dataIndex: "subnet_count",
      key: "subnet_count",
      width: 100,
      align: "center" as const,
      render: (v: number) => (
        <Badge count={v} showZero style={{ backgroundColor: v > 0 ? "#13c2c2" : "#d9d9d9" }} />
      ),
    },
    {
      title: "Description",
      dataIndex: "description",
      key: "description",
      render: (v: string) => v || <Text type="secondary">—</Text>,
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
              title={`Delete VLAN ${record.vid}?`}
              description="Subnets using this VLAN will be unlinked."
              okText="Delete"
              okType="danger"
              onConfirm={() => handleDelete(record.id, record.vid)}
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
              placeholder="Search by name or VID..."
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
            Add VLAN
          </Button>
        </Col>
      </Row>

      <Table<VLAN>
        dataSource={vlans}
        columns={columns}
        rowKey="id"
        loading={isLoading}
        size="middle"
        pagination={{
          current: page,
          pageSize: PAGE_SIZE,
          total,
          showSizeChanger: false,
          showTotal: (t, [from, to]) => `${from}–${to} of ${t} VLANs`,
          onChange: (p) => setPage(p),
        }}
      />

      <VLANFormModal
        open={modalOpen}
        vlan={editing}
        onClose={() => { setModalOpen(false); setEditing(null); }}
      />
    </>
  );
}
