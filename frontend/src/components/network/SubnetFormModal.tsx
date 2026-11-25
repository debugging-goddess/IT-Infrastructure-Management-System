import { useEffect } from "react";
import { Modal, Form, Input, Select, Switch, Row, Col, message } from "antd";
import { useCreateSubnet, useUpdateSubnet, useVLANOptions } from "@/hooks/useNetwork";
import type { Subnet, SubnetFormData } from "@/types";

interface Props {
  open: boolean;
  subnet?: Subnet | null;
  onClose: () => void;
}

// Basic CIDR validation — IPv4/IPv6 with prefix length
const CIDR_REGEX =
  /^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\/\d{1,2}|[0-9a-fA-F:]+\/\d{1,3})$/;

const IP_REGEX = /^(\d{1,3}\.){3}\d{1,3}$|^[0-9a-fA-F:]+$/;

export default function SubnetFormModal({ open, subnet, onClose }: Props) {
  const [form] = Form.useForm<SubnetFormData>();
  const isEdit = !!subnet;

  const create  = useCreateSubnet();
  const update  = useUpdateSubnet();
  const loading = create.isPending || update.isPending;

  const { data: vlanOptions = [], isLoading: loadingVLANs } = useVLANOptions();

  useEffect(() => {
    if (!open) return;
    if (subnet) {
      form.setFieldsValue({
        name:         subnet.name,
        cidr:         subnet.cidr,
        netmask:      subnet.netmask ?? undefined,
        description:  subnet.description,
        vlan:         subnet.vlan ?? undefined,
        gateway:      subnet.gateway ?? undefined,
        dns_servers:  subnet.dns_servers,
        dhcp_enabled: subnet.dhcp_enabled,
      });
    } else {
      form.resetFields();
      form.setFieldValue("dhcp_enabled", false);
    }
  }, [open, subnet, form]);

  const handleOk = async () => {
    let values: SubnetFormData;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }
    const payload: SubnetFormData = {
      ...values,
      vlan: values.vlan ?? null,
      gateway: values.gateway || null,
      netmask: values.netmask || null,
    };
    try {
      if (isEdit && subnet) {
        await update.mutateAsync({ id: subnet.id, data: payload });
        message.success(`Subnet ${values.cidr} updated`);
      } else {
        await create.mutateAsync(payload);
        message.success(`Subnet ${values.cidr} added`);
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
      title={isEdit ? `Edit Subnet — ${subnet?.cidr}` : "Add New Subnet"}
      open={open}
      onOk={handleOk}
      onCancel={onClose}
      okText={isEdit ? "Save Changes" : "Add Subnet"}
      cancelText="Cancel"
      confirmLoading={loading}
      width={560}
      destroyOnClose
    >
      <Form form={form} layout="vertical" requiredMark="optional" style={{ marginTop: 12 }}>
        <Form.Item name="name" label="Name" tooltip="A friendly label for this subnet">
          <Input placeholder="e.g. Office LAN, Server VLAN" />
        </Form.Item>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="cidr"
              label="CIDR"
              rules={[
                { required: true, message: "CIDR is required" },
                { pattern: CIDR_REGEX, message: "e.g. 192.168.1.0/24" },
              ]}
              tooltip="Network prefix in CIDR notation"
            >
              <Input placeholder="e.g. 192.168.1.0/24" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="netmask"
              label="Subnet Mask"
              rules={[{ pattern: IP_REGEX, message: "Enter a valid mask" }]}
              tooltip="Dotted-decimal mask"
            >
              <Input placeholder="e.g. 255.255.255.0" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="gateway"
              label="Gateway"
              rules={[{ pattern: IP_REGEX, message: "Enter a valid IP address" }]}
            >
              <Input placeholder="e.g. 192.168.1.1" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="vlan" label="VLAN">
              <Select
                showSearch
                allowClear
                placeholder="Associate a VLAN"
                loading={loadingVLANs}
                options={vlanOptions}
                filterOption={(input, option) =>
                  (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
                }
              />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          name="dns_servers"
          label="DNS Servers"
          tooltip="Comma-separated list of DNS server IPs"
        >
          <Input placeholder="e.g. 8.8.8.8, 8.8.4.4" />
        </Form.Item>

        <Form.Item
          name="dhcp_enabled"
          label="DHCP Enabled"
          valuePropName="checked"
          tooltip="Whether addresses in this subnet are handed out by DHCP"
        >
          <Switch />
        </Form.Item>

        <Form.Item name="description" label="Description">
          <Input.TextArea rows={2} placeholder="What is this subnet used for?" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
