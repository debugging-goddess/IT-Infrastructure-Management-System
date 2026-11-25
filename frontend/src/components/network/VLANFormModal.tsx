import { useEffect } from "react";
import { Modal, Form, Input, InputNumber, message } from "antd";
import { useCreateVLAN, useUpdateVLAN } from "@/hooks/useNetwork";
import type { VLAN, VLANFormData } from "@/types";

interface Props {
  open: boolean;
  vlan?: VLAN | null;
  onClose: () => void;
}

export default function VLANFormModal({ open, vlan, onClose }: Props) {
  const [form] = Form.useForm<VLANFormData>();
  const isEdit = !!vlan;

  const create  = useCreateVLAN();
  const update  = useUpdateVLAN();
  const loading = create.isPending || update.isPending;

  useEffect(() => {
    if (!open) return;
    if (vlan) {
      form.setFieldsValue({
        vid: vlan.vid,
        name: vlan.name,
        description: vlan.description,
      });
    } else {
      form.resetFields();
    }
  }, [open, vlan, form]);

  const handleOk = async () => {
    let values: VLANFormData;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }
    try {
      if (isEdit && vlan) {
        await update.mutateAsync({ id: vlan.id, data: values });
        message.success(`VLAN ${values.vid} updated`);
      } else {
        await create.mutateAsync(values);
        message.success(`VLAN ${values.vid} added`);
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
      title={isEdit ? `Edit VLAN ${vlan?.vid}` : "Add New VLAN"}
      open={open}
      onOk={handleOk}
      onCancel={onClose}
      okText={isEdit ? "Save Changes" : "Add VLAN"}
      cancelText="Cancel"
      confirmLoading={loading}
      destroyOnClose
    >
      <Form form={form} layout="vertical" requiredMark="optional" style={{ marginTop: 12 }}>
        <Form.Item
          name="vid"
          label="VLAN ID (VID)"
          rules={[{ required: true, message: "VLAN ID is required" }]}
          tooltip="Numeric 802.1Q VLAN identifier (1–4094)"
        >
          <InputNumber min={1} max={4094} style={{ width: "100%" }} placeholder="e.g. 100" />
        </Form.Item>
        <Form.Item
          name="name"
          label="Name"
          rules={[{ required: true, message: "Name is required" }]}
        >
          <Input placeholder="e.g. Production, Management, DMZ" />
        </Form.Item>
        <Form.Item name="description" label="Description">
          <Input.TextArea rows={3} placeholder="What is this VLAN used for?" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
