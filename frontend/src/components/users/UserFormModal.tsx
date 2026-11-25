import { useEffect } from "react";
import {
  Modal, Form, Input, Row, Col, Divider,
  message, Switch, Space, Typography, Alert,
} from "antd";
import { useCreateUser, useUpdateUser } from "@/hooks/useUsers";
import { useAuth } from "@/store/AuthContext";
import type { User, UserCreateData, UserUpdateData } from "@/types";

const { Text } = Typography;

interface Props {
  open: boolean;
  user?: User | null;
  onClose: () => void;
}

interface FormValues {
  first_name?: string;
  last_name?: string;
  email: string;
  username: string;
  phone?: string;
  password?: string;
  is_asset_manager?: boolean;
  is_staff?: boolean;
}

export default function UserFormModal({ open, user, onClose }: Props) {
  const [form] = Form.useForm<FormValues>();
  const isEdit = !!user;

  // What the signed-in person may change (the backend enforces the same rules)
  const { user: actor } = useAuth();
  const actorIsStaff = !!(actor?.is_staff || actor?.is_superuser);
  const actorIsSuperuser = !!actor?.is_superuser;
  const editingSelf = isEdit && user?.id === actor?.id;
  const canEditAccount = !isEdit || actorIsStaff;        // username, email, asset-manager flag
  const canEditStaffFlag = actorIsSuperuser && !editingSelf;

  const create  = useCreateUser();
  const update  = useUpdateUser();
  const loading = create.isPending || update.isPending;

  useEffect(() => {
    if (!open) return;
    if (user) {
      form.setFieldsValue({
        first_name:       user.first_name,
        last_name:        user.last_name,
        email:            user.email,
        username:         user.username,
        phone:            user.phone,
        is_asset_manager: user.is_asset_manager,
        is_staff:         user.is_staff,
      });
    } else {
      form.resetFields();
      form.setFieldsValue({ is_asset_manager: false, is_staff: false });
    }
  }, [open, user, form]);

  const handleOk = async () => {
    let values: FormValues;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }

    try {
      if (isEdit && user) {
        // Only send the fields this person is allowed to change
        const payload: UserUpdateData = {
          first_name: values.first_name,
          last_name:  values.last_name,
          phone:      values.phone,
          ...(canEditAccount && {
            email:            values.email,
            username:         values.username,
            is_asset_manager: values.is_asset_manager,
          }),
          ...(canEditStaffFlag && { is_staff: values.is_staff }),
        };
        await update.mutateAsync({ id: user.id, data: payload });
        message.success("User updated");
      } else {
        const payload: UserCreateData = {
          username:         values.username,
          email:            values.email,
          password:         values.password!,
          first_name:       values.first_name,
          last_name:        values.last_name,
          phone:            values.phone,
          is_asset_manager: values.is_asset_manager,
        };
        await create.mutateAsync(payload);
        message.success("User added");
      }
      onClose();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: Record<string, string | string[]> } };
      if (axiosErr?.response?.data) {
        const msgs = Object.entries(axiosErr.response.data)
          .map(([field, errors]) => `${field}: ${Array.isArray(errors) ? errors.join(", ") : errors}`)
          .join("\n");
        message.error({ content: msgs, duration: 6 });
      } else {
        message.error("Something went wrong. Please try again.");
      }
    }
  };

  return (
    <Modal
      title={isEdit ? `Edit User — ${user?.full_name}` : "Add New User"}
      open={open}
      onOk={handleOk}
      onCancel={onClose}
      okText={isEdit ? "Save Changes" : "Add User"}
      cancelText="Cancel"
      confirmLoading={loading}
      width={640}
      destroyOnClose
    >
      <Form form={form} layout="vertical" requiredMark="optional" style={{ marginTop: 8 }}>

        {/* ── Contact details ─────────────────────────────────── */}
        <Divider orientation="left" orientationMargin={0}>
          Contact Details
        </Divider>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="first_name" label="First Name">
              <Input placeholder="e.g. Jane" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="last_name" label="Last Name">
              <Input placeholder="e.g. Doe" />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="email"
              label="Email"
              rules={[
                { required: true, message: "Email is required" },
                { type: "email", message: "Enter a valid email" },
              ]}
            >
              <Input placeholder="e.g. jane.doe@example.com" disabled={!canEditAccount} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="phone" label="Phone" tooltip="Who to call when there's an issue">
              <Input placeholder="e.g. +1 555 123 4567" />
            </Form.Item>
          </Col>
        </Row>

        {/* ── Account ─────────────────────────────────────────── */}
        <Divider orientation="left" orientationMargin={0}>
          Account
        </Divider>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="username"
              label="Username"
              rules={[{ required: true, message: "Username is required" }]}
            >
              <Input placeholder="e.g. jdoe" disabled={!canEditAccount} />
            </Form.Item>
          </Col>
          {!isEdit && (
            <Col span={12}>
              <Form.Item
                name="password"
                label="Password"
                rules={[
                  { required: true, message: "Password is required" },
                  { min: 8, message: "At least 8 characters" },
                ]}
              >
                <Input.Password placeholder="Minimum 8 characters" />
              </Form.Item>
            </Col>
          )}
        </Row>

        {isEdit && (
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
            message="To reset a password, use the Django admin or a password reset flow."
          />
        )}

        {/* ── Roles ───────────────────────────────────────────── */}
        <Divider orientation="left" orientationMargin={0}>
          Roles
        </Divider>
        <Space direction="vertical" size={12} style={{ width: "100%" }}>
          <Row justify="space-between" align="middle">
            <Col>
              <Text strong>Asset Manager</Text>
              <br />
              <Text type="secondary" style={{ fontSize: 12 }}>
                Shown first when choosing an owner for servers, VMs and applications
              </Text>
            </Col>
            <Col>
              <Form.Item name="is_asset_manager" valuePropName="checked" noStyle>
                <Switch disabled={!canEditAccount} />
              </Form.Item>
            </Col>
          </Row>
          {/* Granting admin rights is for superusers only, and never on your own account */}
          {isEdit && actorIsSuperuser && (
            <Row justify="space-between" align="middle">
              <Col>
                <Text strong>Staff / Admin Access</Text>
                <br />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {editingSelf
                    ? "You cannot remove your own admin access"
                    : "Can create and delete users, and access admin features"}
                </Text>
              </Col>
              <Col>
                <Form.Item name="is_staff" valuePropName="checked" noStyle>
                  <Switch disabled={!canEditStaffFlag} />
                </Form.Item>
              </Col>
            </Row>
          )}
          {!canEditAccount && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              Roles, username and email can only be changed by an administrator.
            </Text>
          )}
        </Space>
      </Form>
    </Modal>
  );
}
