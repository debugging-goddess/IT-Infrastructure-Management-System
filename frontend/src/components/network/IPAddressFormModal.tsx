import { useEffect, useState } from "react";
import {
  Modal, Form, Input, Select, Radio,
  Row, Col, Divider, message,
} from "antd";
import {
  useCreateIP, useUpdateIP,
  useSubnetOptions, useServerOptionsForIP, useVMOptionsForIP,
} from "@/hooks/useNetwork";
import { ALL_IP_STATUSES } from "@/utils/ipStatus";
import type { IPAddress, IPAddressFormData } from "@/types";

interface Props {
  open: boolean;
  ip?: IPAddress | null;
  onClose: () => void;
}

type AssignTarget = "none" | "server" | "vm";

const IP_REGEX = /^(\d{1,3}\.){3}\d{1,3}$|^[0-9a-fA-F:]+$/;

export default function IPAddressFormModal({ open, ip, onClose }: Props) {
  const [form] = Form.useForm<IPAddressFormData>();
  const isEdit = !!ip;

  const [assignTarget, setAssignTarget] = useState<AssignTarget>("none");

  const create  = useCreateIP();
  const update  = useUpdateIP();
  const loading = create.isPending || update.isPending;

  const { data: subnetOptions = [], isLoading: loadingSubnets } = useSubnetOptions();
  const { data: serverOptions = [], isLoading: loadingServers }  = useServerOptionsForIP();
  const { data: vmOptions = [],     isLoading: loadingVMs }      = useVMOptionsForIP();

  useEffect(() => {
    if (!open) return;
    if (ip) {
      form.setFieldsValue({
        address:         ip.address,
        status:          ip.status,
        dns_name:        ip.dns_name,
        description:     ip.description,
        subnet:          ip.subnet          ?? undefined,
        assigned_server: ip.assigned_server ?? undefined,
        assigned_vm:     ip.assigned_vm     ?? undefined,
      });
      if (ip.assigned_server)      setAssignTarget("server");
      else if (ip.assigned_vm)     setAssignTarget("vm");
      else                         setAssignTarget("none");
    } else {
      form.resetFields();
      form.setFieldValue("status", "active");
      setAssignTarget("none");
    }
  }, [open, ip, form]);

  const handleTargetChange = (target: AssignTarget) => {
    setAssignTarget(target);
    if (target === "server")    form.setFieldValue("assigned_vm", undefined);
    else if (target === "vm")   form.setFieldValue("assigned_server", undefined);
    else {
      form.setFieldValue("assigned_server", undefined);
      form.setFieldValue("assigned_vm", undefined);
    }
  };

  const handleOk = async () => {
    let values: IPAddressFormData;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }
    const payload: IPAddressFormData = {
      ...values,
      subnet:          values.subnet ?? null,
      assigned_server: assignTarget === "server" ? values.assigned_server ?? null : null,
      assigned_vm:     assignTarget === "vm"     ? values.assigned_vm     ?? null : null,
    };
    try {
      if (isEdit && ip) {
        await update.mutateAsync({ id: ip.id, data: payload });
        message.success(`IP ${values.address} updated`);
      } else {
        await create.mutateAsync(payload);
        message.success(`IP ${values.address} added`);
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

  const filterOption = (input: string, option?: { label: string }) =>
    (option?.label ?? "").toLowerCase().includes(input.toLowerCase());

  return (
    <Modal
      title={isEdit ? `Edit IP — ${ip?.address}` : "Add IP Address"}
      open={open}
      onOk={handleOk}
      onCancel={onClose}
      okText={isEdit ? "Save Changes" : "Add IP"}
      cancelText="Cancel"
      confirmLoading={loading}
      width={620}
      destroyOnClose
      styles={{ body: { maxHeight: "75vh", overflowY: "auto", paddingRight: 4 } }}
    >
      <Form form={form} layout="vertical" requiredMark="optional" style={{ marginTop: 4 }}>

        {/* ── Address & Status ─────────────────────────────────── */}
        <Divider orientation="left" orientationMargin={0} style={{ marginTop: 8 }}>
          Address
        </Divider>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="address"
              label="IP Address"
              rules={[
                { required: true, message: "IP address is required" },
                { pattern: IP_REGEX, message: "Enter a valid IPv4 or IPv6 address" },
              ]}
            >
              <Input placeholder="e.g. 192.168.1.10" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="status"
              label="Status"
              rules={[{ required: true, message: "Status is required" }]}
            >
              <Select options={ALL_IP_STATUSES} placeholder="Select status" />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="dns_name" label="DNS Name">
              <Input placeholder="e.g. web01.example.com" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="subnet" label="Subnet">
              <Select
                showSearch
                allowClear
                placeholder="Select subnet"
                loading={loadingSubnets}
                options={subnetOptions}
                filterOption={filterOption}
              />
            </Form.Item>
          </Col>
        </Row>

        {/* ── Assignment ───────────────────────────────────────── */}
        <Divider orientation="left" orientationMargin={0}>
          Assignment
        </Divider>
        <Form.Item label="Assigned To">
          <Radio.Group
            value={assignTarget}
            onChange={(e) => handleTargetChange(e.target.value)}
            optionType="button"
            buttonStyle="solid"
          >
            <Radio.Button value="none">Unassigned</Radio.Button>
            <Radio.Button value="server">Server</Radio.Button>
            <Radio.Button value="vm">Virtual Machine</Radio.Button>
          </Radio.Group>
        </Form.Item>

        {assignTarget === "server" && (
          <Form.Item
            name="assigned_server"
            label="Server"
            rules={[{ required: true, message: "Select a server" }]}
          >
            <Select
              showSearch
              allowClear
              placeholder="Select server"
              loading={loadingServers}
              options={serverOptions}
              filterOption={filterOption}
            />
          </Form.Item>
        )}

        {assignTarget === "vm" && (
          <Form.Item
            name="assigned_vm"
            label="Virtual Machine"
            rules={[{ required: true, message: "Select a VM" }]}
          >
            <Select
              showSearch
              allowClear
              placeholder="Select VM"
              loading={loadingVMs}
              options={vmOptions}
              filterOption={filterOption}
            />
          </Form.Item>
        )}

        {/* ── Description ─────────────────────────────────────── */}
        <Divider orientation="left" orientationMargin={0}>
          Description
        </Divider>
        <Form.Item name="description">
          <Input.TextArea rows={2} placeholder="Any notes about this IP..." />
        </Form.Item>
      </Form>
    </Modal>
  );
}
