import { Form, Input, Button, Typography, message, Grid } from "antd";
import {
  MailOutlined, LockOutlined, CloudServerOutlined,
  SafetyOutlined, PartitionOutlined,
} from "@ant-design/icons";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/store/AuthContext";
import InfraIllustration from "@/components/auth/InfraIllustration";
import type { LoginCredentials } from "@/types";

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

const FEATURES = [
  { icon: <CloudServerOutlined />, text: "Track servers, VMs, and services" },
  { icon: <PartitionOutlined />,   text: "Visualize infrastructure dependencies" },
  { icon: <SafetyOutlined />,      text: "Full audit trail of every change" },
];

export default function LoginPage() {
  const { login } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();
  const screens   = useBreakpoint();

  // Branded panel only shows on md+ screens
  const showBrandPanel = screens.md;

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? "/dashboard";

  const onFinish = async (values: LoginCredentials) => {
    try {
      await login(values);
      navigate(from, { replace: true });
    } catch {
      message.error("Invalid email or password. Please try again.");
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex" }}>
      {/* ── Left: branded panel ─────────────────────────────────── */}
      {showBrandPanel && (
        <div
          style={{
            flex: "1 1 50%",
            background: "linear-gradient(135deg, #1677ff 0%, #0958d9 55%, #10239e 100%)",
            color: "#fff",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "48px 56px",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* subtle decorative circles */}
          <div style={{ position: "absolute", top: -80, right: -80, width: 260, height: 260, borderRadius: "50%", background: "rgba(255,255,255,0.06)" }} />
          <div style={{ position: "absolute", bottom: -100, left: -60, width: 300, height: 300, borderRadius: "50%", background: "rgba(255,255,255,0.05)" }} />

          <div style={{ position: "relative", zIndex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
              <CloudServerOutlined style={{ fontSize: 32 }} />
              <Text strong style={{ color: "#fff", fontSize: 22 }}>IT Infra Manager</Text>
            </div>
            <Title level={2} style={{ color: "#fff", marginTop: 16, marginBottom: 8, maxWidth: 420 }}>
              Your entire infrastructure, in one place.
            </Title>
            <Text style={{ color: "rgba(255,255,255,0.85)", fontSize: 15 }}>
              Track every server, VM, application, and IP across your organization.
            </Text>

            <div style={{ display: "flex", justifyContent: "center", margin: "32px 0" }}>
              <InfraIllustration />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {FEATURES.map((f, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div
                    style={{
                      width: 32, height: 32, borderRadius: 8,
                      background: "rgba(255,255,255,0.15)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 16,
                    }}
                  >
                    {f.icon}
                  </div>
                  <Text style={{ color: "rgba(255,255,255,0.92)", fontSize: 14 }}>{f.text}</Text>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Right: login form ───────────────────────────────────── */}
      <div
        style={{
          flex: showBrandPanel ? "1 1 50%" : "1 1 100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "32px",
          background: "#fff",
        }}
      >
        <div style={{ width: "100%", maxWidth: 380 }}>
          {/* compact logo for mobile (brand panel hidden) */}
          {!showBrandPanel && (
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <CloudServerOutlined style={{ fontSize: 36, color: "#1677ff" }} />
            </div>
          )}

          <Title level={3} style={{ marginBottom: 4 }}>Welcome back</Title>
          <Text type="secondary">Sign in to continue to your dashboard</Text>

          <Form layout="vertical" onFinish={onFinish} size="large" style={{ marginTop: 28 }}>
            <Form.Item
              label="Email"
              name="email"
              rules={[
                { required: true, message: "Email is required" },
                { type: "email",  message: "Enter a valid email address" },
              ]}
            >
              <Input
                prefix={<MailOutlined style={{ color: "#bbb" }} />}
                placeholder="you@example.com"
                autoComplete="email"
              />
            </Form.Item>

            <Form.Item
              label="Password"
              name="password"
              rules={[{ required: true, message: "Password is required" }]}
            >
              <Input.Password
                prefix={<LockOutlined style={{ color: "#bbb" }} />}
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </Form.Item>

            <Form.Item style={{ marginBottom: 0, marginTop: 8 }}>
              <Button type="primary" htmlType="submit" block>
                Sign In
              </Button>
            </Form.Item>
          </Form>

          <Text
            type="secondary"
            style={{ display: "block", textAlign: "center", marginTop: 32, fontSize: 12 }}
          >
            IT Infrastructure Management System
          </Text>
        </div>
      </div>
    </div>
  );
}
