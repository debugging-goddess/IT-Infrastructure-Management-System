import { Typography, Tabs, Space, Card } from "antd";
import {
  GlobalOutlined, PartitionOutlined, ApartmentOutlined,
} from "@ant-design/icons";
import IPAddressTab from "@/components/network/IPAddressTab";
import SubnetTab from "@/components/network/SubnetTab";
import VLANTab from "@/components/network/VLANTab";

const { Text } = Typography;

export default function NetworkPage() {
  return (
    <>
      {/* ── Page header ─────────────────────────────────────────── */}
      <div style={{ marginBottom: 20 }}>
        <Space align="center">
          <GlobalOutlined style={{ fontSize: 24, color: "#722ed1" }} />
          <div>
            <Typography.Title level={4} style={{ margin: 0 }}>
              Network / IPs
            </Typography.Title>
            <Text type="secondary" style={{ fontSize: 13 }}>
              Manage IP addresses, subnets, and VLANs
            </Text>
          </div>
        </Space>
      </div>

      <Card styles={{ body: { paddingTop: 8 } }}>
        <Tabs
          defaultActiveKey="ips"
          size="large"
          items={[
            {
              key: "ips",
              label: (
                <Space>
                  <GlobalOutlined />
                  IP Addresses
                </Space>
              ),
              children: <IPAddressTab />,
            },
            {
              key: "subnets",
              label: (
                <Space>
                  <PartitionOutlined />
                  Subnets
                </Space>
              ),
              children: <SubnetTab />,
            },
            {
              key: "vlans",
              label: (
                <Space>
                  <ApartmentOutlined />
                  VLANs
                </Space>
              ),
              children: <VLANTab />,
            },
          ]}
        />
      </Card>
    </>
  );
}
