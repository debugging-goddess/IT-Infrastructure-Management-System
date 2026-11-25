import {
  Drawer, Descriptions, Tag, Table, Skeleton,
  Space, Typography, Divider, Empty, Button, Badge,
} from "antd";
import {
  AppstoreOutlined, UserOutlined, DeploymentUnitOutlined,
  LinkOutlined, ApiOutlined, EditOutlined,
  CloudServerOutlined, DesktopOutlined, BranchesOutlined,
} from "@ant-design/icons";
import { useApplication } from "@/hooks/useApplications";
import { APP_STATUS_CONFIG } from "@/utils/appStatus";
import { formatDate, timeAgo } from "@/utils/formatters";
import type { AppStatus, NestedDependency } from "@/types";

const { Text } = Typography;

interface Props {
  applicationId: number | null;
  onClose: () => void;
  onEdit: () => void;
}

function AppStatusTag({ status }: { status: string }) {
  const cfg = APP_STATUS_CONFIG[status as AppStatus];
  if (!cfg) return <Tag>{status}</Tag>;
  return <Badge color={cfg.badgeColor} text={cfg.label} />;
}

export default function ApplicationDetailDrawer({ applicationId, onClose, onEdit }: Props) {
  const { data: app, isLoading } = useApplication(applicationId);

  const depColumns = [
    {
      title: "Application",
      dataIndex: "name",
      key: "name",
      render: (v: string, record: NestedDependency) => (
        <Space direction="vertical" size={0}>
          <Text strong>{v}</Text>
          {record.version && (
            <Text type="secondary" style={{ fontSize: 11 }}>{record.version}</Text>
          )}
        </Space>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (v: string) => <AppStatusTag status={v} />,
    },
  ];

  return (
    <Drawer
      title={
        isLoading ? "Loading..." : (
          <Space>
            <AppstoreOutlined style={{ color: "#fa8c16" }} />
            <span>{app?.name}</span>
            {app?.version && <Tag>{app.version}</Tag>}
            {app && <AppStatusTag status={app.status} />}
          </Space>
        )
      }
      placement="right"
      width={640}
      open={applicationId !== null}
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
      {isLoading || !app ? (
        <Skeleton active paragraph={{ rows: 10 }} />
      ) : (
        <>
          {app.description && (
            <p style={{ color: "#595959", marginTop: 0 }}>{app.description}</p>
          )}

          {/* ── Deployment banner ────────────────────────────── */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              background: app.deployment_target ? "#fff7e6" : "#fafafa",
              border: `1px solid ${app.deployment_target ? "#ffd591" : "#f0f0f0"}`,
              borderRadius: 8,
              padding: "10px 14px",
              marginBottom: 20,
            }}
          >
            <DeploymentUnitOutlined style={{ fontSize: 20, color: "#fa8c16" }} />
            <div>
              <Text type="secondary" style={{ fontSize: 11, display: "block" }}>
                DEPLOYED ON
              </Text>
              {app.vm_name ? (
                <Space><DesktopOutlined style={{ color: "#52c41a" }} /><Text strong>{app.vm_name}</Text><Tag color="green">VM</Tag></Space>
              ) : app.server_name ? (
                <Space><CloudServerOutlined style={{ color: "#1677ff" }} /><Text strong>{app.server_name}</Text><Tag color="blue">Server</Tag></Space>
              ) : (
                <Text type="secondary">Not deployed to any host</Text>
              )}
            </div>
          </div>

          {/* ── Core details ─────────────────────────────────── */}
          <Descriptions
            column={2}
            size="small"
            bordered
            labelStyle={{ fontWeight: 500, width: 120 }}
          >
            <Descriptions.Item label="Port">
              {app.port != null ? <Text code>{app.port}</Text> : <Text type="secondary">—</Text>}
            </Descriptions.Item>
            <Descriptions.Item label="Dependents">
              <Space>
                <BranchesOutlined />
                {app.dependent_count} app{app.dependent_count !== 1 ? "s" : ""} depend on this
              </Space>
            </Descriptions.Item>
            <Descriptions.Item label="URL" span={2}>
              {app.url ? (
                <a href={app.url} target="_blank" rel="noopener noreferrer">
                  <Space size={4}><LinkOutlined />{app.url}</Space>
                </a>
              ) : (
                <Text type="secondary">—</Text>
              )}
            </Descriptions.Item>
            <Descriptions.Item label="Owner" span={2}>
              {app.owner_name ? (
                <Space><UserOutlined />{app.owner_name}</Space>
              ) : <Text type="secondary">—</Text>}
            </Descriptions.Item>
            <Descriptions.Item label="Added">{formatDate(app.created_at)}</Descriptions.Item>
            <Descriptions.Item label="Updated">{timeAgo(app.updated_at)}</Descriptions.Item>
          </Descriptions>

          {app.notes && (
            <>
              <Divider />
              <Text type="secondary" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 1 }}>
                Notes
              </Text>
              <p style={{ marginTop: 6, color: "#595959" }}>{app.notes}</p>
            </>
          )}

          {/* ── Dependencies ─────────────────────────────────── */}
          <Divider orientation="left" orientationMargin={0}>
            <Space>
              <ApiOutlined />
              Dependencies
              <Badge count={app.dependency_details.length} style={{ backgroundColor: "#fa8c16" }} />
            </Space>
          </Divider>
          {app.dependency_details.length ? (
            <Table<NestedDependency>
              dataSource={app.dependency_details}
              columns={depColumns}
              rowKey="id"
              size="small"
              pagination={false}
            />
          ) : (
            <Empty
              description="This application has no dependencies"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          )}
        </>
      )}
    </Drawer>
  );
}
