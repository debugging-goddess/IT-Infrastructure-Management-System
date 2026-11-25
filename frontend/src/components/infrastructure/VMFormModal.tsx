import { useEffect } from "react";
import {
  Modal, Form, Input, Select, InputNumber,
  Row, Col, Divider, message, Space,
} from "antd";
import { useQueryClient } from "@tanstack/react-query";
import { useCreateVM, useUpdateVM, useServerOptions, useClusterOptions } from "@/hooks/useVMs";
import OwnerSelect from "@/components/common/OwnerSelect";
import HostIPListField from "@/components/common/HostIPListField";
import HostServicesField from "@/components/common/HostServicesField";
import { syncHostRelations, type IPRow, type ServiceRow } from "@/utils/syncHostRelations";
import { ALL_SERVER_STATUSES } from "@/utils/serverStatus";
import type { VirtualMachine, VMFormData } from "@/types";

interface Props {
  open: boolean;
  vm?: VirtualMachine | null;
  onClose: () => void;
}

const OS_OPTIONS = [
  { label: "Ubuntu",         value: "Ubuntu" },
  { label: "Debian",         value: "Debian" },
  { label: "CentOS",         value: "CentOS" },
  { label: "Rocky Linux",    value: "Rocky Linux" },
  { label: "AlmaLinux",      value: "AlmaLinux" },
  { label: "Red Hat Enterprise Linux", value: "Red Hat Enterprise Linux" },
  { label: "Windows Server", value: "Windows Server" },
  { label: "Windows 11",     value: "Windows 11" },
  { label: "Windows 10",     value: "Windows 10" },
  { label: "Other",          value: "Other" },
];

// Local form shape — core VM fields plus the IP and service lists
type VMFormValues = VMFormData & {
  ips?: IPRow[];
  services?: ServiceRow[];
};

export default function VMFormModal({ open, vm, onClose }: Props) {
  const [form] = Form.useForm<VMFormValues>();
  const isEdit = !!vm;

  const qc = useQueryClient();
  const create  = useCreateVM();
  const update  = useUpdateVM();
  const loading = create.isPending || update.isPending;

  const { data: serverOptions = [], isLoading: loadingServers } = useServerOptions();
  const { data: clusterOptions = [], isLoading: loadingClusters } = useClusterOptions();

  // Populate form when modal opens
  useEffect(() => {
    if (!open) return;
    if (vm) {
      form.setFieldsValue({
        name:        vm.name,
        hostname:    vm.hostname,
        host_server: vm.host_server ?? undefined,
        cluster:     vm.cluster     ?? undefined,
        os:          vm.os,
        os_version:  vm.os_version,
        vcpu:        vm.vcpu        ?? undefined,
        ram_gb:      vm.ram_gb      ?? undefined,
        disk_gb:     vm.disk_gb     ?? undefined,
        status:      vm.status,
        notes:       vm.notes,
        owner:       vm.owner ?? undefined,
        // Existing IPs and services, so editing shows what is already assigned
        ips:      (vm.ip_addresses ?? []).map((ip) => ({ id: ip.id, address: ip.address })),
        services: (vm.services ?? []).map((s) => ({
          id: s.id, name: s.name, port: s.port, status: s.status as ServiceRow["status"],
        })),
      });
    } else {
      form.resetFields();
      form.setFieldValue("status", "active");
    }
  }, [open, vm, form]);

  const handleOk = async () => {
    let values: VMFormValues;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }

    // Keep the IP and service lists out of the VM payload; they are saved separately
    const { ips, services, ...rest } = values;
    // Clearing the dropdown gives undefined, which would mean "leave unchanged"; send null to remove the owner
    const vmValues = { ...rest, owner: rest.owner ?? null };

    try {
      let vmId: number;
      if (isEdit && vm) {
        await update.mutateAsync({ id: vm.id, data: vmValues });
        vmId = vm.id;
        message.success(`VM "${values.name}" updated`);
      } else {
        const created = await create.mutateAsync(vmValues);
        vmId = created.id;
        message.success(`VM "${values.name}" added`);
      }

      // Apply IP and service changes. This never throws; problems come back as warnings.
      const warnings = await syncHostRelations(
        "vm",
        vmId,
        { ips, services },
        {
          ips: vm?.ip_addresses ?? [],
          services: vm?.services ?? [],
        },
      );
      warnings.forEach((w) => message.warning({ content: `VM saved, but: ${w}`, duration: 6 }));

      // Refresh everything that shows IPs or services
      ["vms", "ips", "subnets", "services", "dashboard"].forEach((key) =>
        qc.invalidateQueries({ queryKey: [key] }),
      );

      onClose();
    } catch (err: unknown) {
      const axiosErr = err as {
        response?: { data?: Record<string, string | string[]> };
      };
      if (axiosErr?.response?.data) {
        const msgs = Object.entries(axiosErr.response.data)
          .map(([field, errors]) => {
            const text = Array.isArray(errors) ? errors.join(", ") : errors;
            return `${field}: ${text}`;
          })
          .join("\n");
        message.error({ content: msgs, duration: 6 });
      } else {
        message.error("Something went wrong. Please try again.");
      }
    }
  };

  return (
    <Modal
      title={
        <Space>
          {isEdit ? `Edit VM — ${vm?.name}` : "Add New Virtual Machine"}
        </Space>
      }
      open={open}
      onOk={handleOk}
      onCancel={onClose}
      okText={isEdit ? "Save Changes" : "Add VM"}
      cancelText="Cancel"
      confirmLoading={loading}
      width={720}
      destroyOnClose
      styles={{ body: { maxHeight: "75vh", overflowY: "auto", paddingRight: 4 } }}
    >
      <Form form={form} layout="vertical" requiredMark="optional">

        {/* ── Identity ─────────────────────────────────────────── */}
        <Divider orientation="left" orientationMargin={0} style={{ marginTop: 8 }}>
          Identity
        </Divider>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="name"
              label="VM Name"
              rules={[{ required: true, message: "VM name is required" }]}
            >
              <Input placeholder="e.g. prod-app-vm-01" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="hostname"
              label="Hostname / FQDN"
              rules={[{ required: true, message: "Hostname is required" }]}
            >
              <Input placeholder="e.g. prod-app-vm-01.example.com" />
            </Form.Item>
          </Col>
        </Row>

        {/* ── Hosting ──────────────────────────────────────────── */}
        <Divider orientation="left" orientationMargin={0}>
          Hosting
        </Divider>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="host_server" label="Host Server">
              <Select
                showSearch
                allowClear
                placeholder="Select host server"
                loading={loadingServers}
                options={serverOptions}
                filterOption={(input, option) =>
                  (option?.label as string)?.toLowerCase().includes(input.toLowerCase())
                }
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="cluster" label="Cluster">
              <Select
                showSearch
                allowClear
                placeholder="Select cluster (optional)"
                loading={loadingClusters}
                options={clusterOptions}
                filterOption={(input, option) =>
                  (option?.label as string)?.toLowerCase().includes(input.toLowerCase())
                }
              />
            </Form.Item>
          </Col>
        </Row>

        {/* ── Operating System ─────────────────────────────────── */}
        <Divider orientation="left" orientationMargin={0}>
          Operating System
        </Divider>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="os" label="OS">
              <Select
                showSearch
                allowClear
                placeholder="Select OS"
                options={OS_OPTIONS}
                filterOption={(input, option) =>
                  (option?.label as string)?.toLowerCase().includes(input.toLowerCase())
                }
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="os_version" label="OS Version">
              <Input placeholder="e.g. 22.04 LTS, 2022 Standard" />
            </Form.Item>
          </Col>
        </Row>

        {/* ── Status ───────────────────────────────────────────── */}
        <Divider orientation="left" orientationMargin={0}>
          Status
        </Divider>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="status"
              label="Status"
              rules={[{ required: true, message: "Status is required" }]}
            >
              <Select options={ALL_SERVER_STATUSES} placeholder="Select status" />
            </Form.Item>
          </Col>
        </Row>

        {/* ── Ownership ────────────────────────────────────────── */}
        <Divider orientation="left" orientationMargin={0}>
          Ownership
        </Divider>
        <Row gutter={16}>
          <Col span={12}>
            <OwnerSelect />
          </Col>
        </Row>

        {/* ── Virtual Resources ────────────────────────────────── */}
        <Divider orientation="left" orientationMargin={0}>
          Virtual Resources
        </Divider>
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item name="vcpu" label="vCPUs">
              <InputNumber min={1} style={{ width: "100%" }} placeholder="e.g. 4" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="ram_gb" label="RAM (GB)">
              <InputNumber min={1} style={{ width: "100%" }} placeholder="e.g. 16" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="disk_gb" label="Disk (GB)">
              <InputNumber min={1} style={{ width: "100%" }} placeholder="e.g. 100" />
            </Form.Item>
          </Col>
        </Row>

        {/* ── IP addresses (optional) ──────────────────────────── */}
        <Divider orientation="left" orientationMargin={0}>
          IP Addresses{" "}
          <span style={{ fontSize: 12, fontWeight: 400, color: "#8c8c8c" }}>(optional)</span>
        </Divider>
        <HostIPListField emptyHint="No IP addresses assigned to this VM." />

        {/* ── Services (optional) ──────────────────────────────── */}
        <Divider orientation="left" orientationMargin={0}>
          Services{" "}
          <span style={{ fontSize: 12, fontWeight: 400, color: "#8c8c8c" }}>(optional)</span>
        </Divider>
        <HostServicesField emptyHint="No services recorded on this VM." />

        {/* ── Notes ───────────────────────────────────────────── */}
        <Divider orientation="left" orientationMargin={0}>
          Notes
        </Divider>
        <Form.Item name="notes">
          <Input.TextArea
            rows={3}
            placeholder="Any additional information about this VM..."
          />
        </Form.Item>

      </Form>
    </Modal>
  );
}
