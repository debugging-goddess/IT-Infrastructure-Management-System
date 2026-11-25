import { useState, useMemo } from "react";
import {
  Table, Input, Select, Space, Card, DatePicker,
  Tooltip, Typography, Row, Col, Tag, Avatar, Button,
  Result, Alert,
} from "antd";
import type { TableProps } from "antd";
import {
  SearchOutlined, ReloadOutlined, FileSearchOutlined,
  FilterOutlined, UserOutlined, RobotOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { useAuditLogs } from "@/hooks/useAuditLogs";
import ChangeDiff from "@/components/audit/ChangeDiff";
import {
  AUDIT_ACTION_CONFIG, ALL_AUDIT_ACTIONS,
  ALL_MODEL_OPTIONS, modelLabel,
} from "@/utils/auditFormat";
import { formatDate, timeAgo } from "@/utils/formatters";
import type { AuditLog, AuditAction } from "@/types";

const { Text } = Typography;
const { Search } = Input;
const { RangePicker } = DatePicker;

export default function AuditPage() {
  const [search, setSearch]   = useState("");
  const [action, setAction]   = useState<AuditAction | "">("");
  const [model, setModel]     = useState<string>("");
  const [range, setRange]     = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null);
  const [page, setPage]       = useState(1);
  const PAGE_SIZE = 25;

  const queryParams = useMemo(() => ({
    ...(search ? { search } : {}),
    ...(action ? { action } : {}),
    ...(model  ? { model }  : {}),
    ...(range?.[0] ? { date_from: range[0]!.startOf("day").toISOString() } : {}),
    ...(range?.[1] ? { date_to:   range[1]!.endOf("day").toISOString() }   : {}),
    page,
    page_size: PAGE_SIZE,
  }), [search, action, model, range, page]);

  const { data, isLoading, isFetching, refetch, error } = useAuditLogs(queryParams);

  const logs  = data?.results ?? [];
  const total = data?.count   ?? 0;

  // Tell "not allowed" and "request failed" apart from "nothing recorded yet"
  const status = (error as { response?: { status?: number } } | null)?.response?.status;
  if (status === 403) {
    return (
      <Result
        status="403"
        title="Admins only"
        subTitle="The audit log records every change and is limited to staff accounts. Ask an administrator for access."
      />
    );
  }

  const columns: TableProps<AuditLog>["columns"] = [
    {
      title: "When",
      dataIndex: "timestamp",
      key: "timestamp",
      width: 170,
      render: (v: string) => (
        <Tooltip title={formatDate(v)}>
          <Space direction="vertical" size={0}>
            <Text style={{ fontSize: 13 }}>{timeAgo(v)}</Text>
            <Text type="secondary" style={{ fontSize: 11 }}>{formatDate(v)}</Text>
          </Space>
        </Tooltip>
      ),
    },
    {
      title: "User",
      key: "user",
      width: 200,
      render: (_, record) => {
        const isSystem = !record.user;
        return (
          <Space>
            <Avatar
              size="small"
              style={{ backgroundColor: isSystem ? "#8c8c8c" : "#1677ff" }}
              icon={isSystem ? <RobotOutlined /> : <UserOutlined />}
            />
            <Space direction="vertical" size={0}>
              <Text style={{ fontSize: 13 }}>{record.user_name}</Text>
              {record.user_email && (
                <Text type="secondary" style={{ fontSize: 11 }}>{record.user_email}</Text>
              )}
            </Space>
          </Space>
        );
      },
    },
    {
      title: "Action",
      dataIndex: "action",
      key: "action",
      width: 110,
      render: (a: AuditAction) => {
        const cfg = AUDIT_ACTION_CONFIG[a];
        return <Tag color={cfg?.color}>{cfg?.label ?? a}</Tag>;
      },
    },
    {
      title: "Type",
      dataIndex: "model_name",
      key: "model_name",
      width: 140,
      render: (m: string) => <Tag>{modelLabel(m)}</Tag>,
    },
    {
      title: "Object",
      dataIndex: "object_repr",
      key: "object_repr",
      render: (v: string) => <Text strong>{v}</Text>,
    },
    {
      title: "Changes",
      key: "change_count",
      width: 110,
      align: "center" as const,
      render: (_, record) => {
        const n = Object.keys(record.changes ?? {}).length;
        if (record.action === "update") {
          return n > 0
            ? <Tag color="blue">{n} field{n !== 1 ? "s" : ""}</Tag>
            : <Text type="secondary">—</Text>;
        }
        return <Text type="secondary">—</Text>;
      },
    },
  ];

  return (
    <>
      {/* ── Page header ─────────────────────────────────────────── */}
      <div style={{ marginBottom: 24 }}>
        <Space align="center">
          <FileSearchOutlined style={{ fontSize: 24, color: "#1677ff" }} />
          <div>
            <Typography.Title level={4} style={{ margin: 0 }}>
              Audit Log
            </Typography.Title>
            <Text type="secondary" style={{ fontSize: 13 }}>
              {total} recorded change{total !== 1 ? "s" : ""} — who changed what, and when
            </Text>
          </div>
        </Space>
      </div>

      {/* ── Filters bar ──────────────────────────────────────── */}
      <Card size="small" style={{ marginBottom: 16 }} styles={{ body: { padding: "12px 16px" } }}>
        <Row gutter={[12, 12]} align="middle">
          <Col flex="auto">
            <Search
              prefix={<SearchOutlined style={{ color: "#bbb" }} />}
              placeholder="Search object or user..."
              allowClear
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              style={{ maxWidth: 320 }}
            />
          </Col>
          <Col>
            <Space wrap>
              <FilterOutlined style={{ color: "#8c8c8c" }} />
              <Select
                placeholder="Action"
                allowClear
                value={action || undefined}
                onChange={(v) => { setAction(v ?? ""); setPage(1); }}
                style={{ width: 130 }}
                options={ALL_AUDIT_ACTIONS}
              />
              <Select
                placeholder="Type"
                allowClear
                showSearch
                value={model || undefined}
                onChange={(v) => { setModel(v ?? ""); setPage(1); }}
                style={{ width: 170 }}
                options={ALL_MODEL_OPTIONS}
                filterOption={(input, option) =>
                  (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
                }
              />
              <RangePicker
                value={range as never}
                onChange={(r) => { setRange(r as never); setPage(1); }}
                allowEmpty={[true, true]}
              />
              <Tooltip title="Refresh">
                <Button icon={<ReloadOutlined spin={isFetching} />} onClick={() => refetch()} />
              </Tooltip>
            </Space>
          </Col>
        </Row>
      </Card>

      {error && (
        <Alert
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
          message="Could not load the audit log"
          description={status ? `The server responded with status ${status}.` : "The server could not be reached."}
          action={<Button size="small" onClick={() => refetch()}>Retry</Button>}
        />
      )}

      {/* ── Main table ───────────────────────────────────────── */}
      <Card styles={{ body: { padding: 0 } }}>
        <Table<AuditLog>
          dataSource={logs}
          columns={columns}
          rowKey="id"
          loading={isLoading}
          scroll={{ x: 1000 }}
          expandable={{
            expandedRowRender: (record) => <ChangeDiff log={record} />,
            rowExpandable: () => true,
          }}
          pagination={{
            current: page,
            pageSize: PAGE_SIZE,
            total,
            showSizeChanger: false,
            showTotal: (t, [from, to]) => `${from}–${to} of ${t} entries`,
            onChange: (p) => setPage(p),
          }}
        />
      </Card>
    </>
  );
}
