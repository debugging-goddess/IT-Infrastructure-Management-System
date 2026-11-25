import { useState } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { Layout, Menu, Avatar, Dropdown, Typography, type MenuProps } from "antd";
import {
  DashboardOutlined,
  CloudServerOutlined,
  DesktopOutlined,
  AppstoreOutlined,
  GlobalOutlined,
  PartitionOutlined,
  TeamOutlined,
  FileSearchOutlined,
  LogoutOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { useAuth } from "@/store/AuthContext";

const { Sider, Header, Content } = Layout;
const { Text } = Typography;

const navItems = [
  { key: "/dashboard", icon: <DashboardOutlined />, label: "Dashboard" },
  { key: "/servers",   icon: <CloudServerOutlined />, label: "Servers" },
  { key: "/vms",       icon: <DesktopOutlined />, label: "Virtual Machines" },
  { key: "/applications", icon: <AppstoreOutlined />, label: "Applications" },
  { key: "/network",   icon: <GlobalOutlined />, label: "Network / IPs" },
  { key: "/topology",  icon: <PartitionOutlined />, label: "Topology" },
  { key: "/users",     icon: <TeamOutlined />, label: "Users" },
  { key: "/audit",     icon: <FileSearchOutlined />, label: "Audit Log" },
];

export default function MainLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, user } = useAuth();
  // The audit log is admin-only on the backend, so only offer it to staff
  const isStaff = !!(user?.is_staff || user?.is_superuser);

  const userMenu: MenuProps["items"] = [
    {
      key: "logout",
      icon: <LogoutOutlined />,
      label: "Logout",
      onClick: logout,
    },
  ];

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider collapsible collapsed={collapsed} onCollapse={setCollapsed} theme="dark">
        <div style={{ padding: "16px", textAlign: "center" }}>
          {!collapsed && (
            <Text strong style={{ color: "#fff", fontSize: 14 }}>
              IT Infra Manager
            </Text>
          )}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={navItems.filter((item) => item.key !== "/audit" || isStaff)}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>

      <Layout>
        <Header
          style={{
            background: "#fff",
            padding: "0 24px",
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
            boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
          }}
        >
          <Dropdown menu={{ items: userMenu }} placement="bottomRight">
            <div style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
              <Avatar icon={<UserOutlined />} />
              {user && <Text>{user.email}</Text>}
            </div>
          </Dropdown>
        </Header>

        <Content style={{ margin: "24px", minHeight: 280 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
