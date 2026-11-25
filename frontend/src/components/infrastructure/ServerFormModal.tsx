import { useEffect, useState } from "react";
import {
  Modal, Form, Input, Select, InputNumber,
  Row, Col, Divider, message, Upload, Image,
  Button, Space, Typography,
} from "antd";
import { DeleteOutlined, PictureOutlined } from "@ant-design/icons";
import type { UploadProps } from "antd";
import { useQueryClient } from "@tanstack/react-query";
import { useCreateServer, useUpdateServer } from "@/hooks/useServers";
import OwnerSelect from "@/components/common/OwnerSelect";
import HostIPListField from "@/components/common/HostIPListField";
import HostServicesField from "@/components/common/HostServicesField";
import { syncHostRelations, type IPRow, type ServiceRow } from "@/utils/syncHostRelations";
import { ALL_SERVER_STATUSES } from "@/utils/serverStatus";
import type { Server, ServerFormData } from "@/types";

const { Text } = Typography;
const { Dragger } = Upload;

const OS_OPTIONS = [
  { label: "Ubuntu",         value: "Ubuntu" },
  { label: "Debian",         value: "Debian" },
  { label: "CentOS",         value: "CentOS" },
  { label: "Rocky Linux",    value: "Rocky Linux" },
  { label: "AlmaLinux",      value: "AlmaLinux" },
  { label: "Red Hat Enterprise Linux", value: "Red Hat Enterprise Linux" },
  { label: "VMware ESXi",    value: "VMware ESXi" },
  { label: "Windows Server", value: "Windows Server" },
  { label: "Other",          value: "Other" },
];

interface Props {
  open: boolean;
  server?: Server | null;
  onClose: () => void;
}

interface ImageSlot {
  file: File | null;       // new file chosen by user
  preview: string | null;  // local object URL or existing server URL
  cleared: boolean;        // user explicitly removed existing image
}

const EMPTY_SLOT: ImageSlot = { file: null, preview: null, cleared: false };

function ImageUploadSlot({
  label,
  slot,
  onChange,
}: {
  label: string;
  slot: ImageSlot;
  onChange: (s: ImageSlot) => void;
}) {
  const hasImage = !!slot.preview;

  const uploadProps: UploadProps = {
    accept: "image/*",
    showUploadList: false,
    beforeUpload: (file) => {
      const preview = URL.createObjectURL(file);
      onChange({ file, preview, cleared: false });
      return false; // prevent auto-upload
    },
  };

  return (
    <div>
      <Text type="secondary" style={{ fontSize: 12, marginBottom: 6, display: "block" }}>
        {label}
      </Text>
      {hasImage ? (
        <div style={{ position: "relative", display: "inline-block" }}>
          <Image
            src={slot.preview!}
            alt={label}
            width="100%"
            height={160}
            style={{ objectFit: "contain", borderRadius: 6, border: "1px solid #f0f0f0" }}
            preview={{ mask: "Preview" }}
          />
          <Button
            danger
            size="small"
            icon={<DeleteOutlined />}
            style={{ position: "absolute", top: 6, right: 6 }}
            onClick={() => {
              if (slot.preview && slot.preview.startsWith("blob:")) {
                URL.revokeObjectURL(slot.preview);
              }
              onChange({ file: null, preview: null, cleared: true });
            }}
          >
            Remove
          </Button>
        </div>
      ) : (
        <Dragger {...uploadProps} style={{ borderRadius: 6 }}>
          <Space direction="vertical" size={4} style={{ padding: "12px 0" }}>
            <PictureOutlined style={{ fontSize: 28, color: "#bbb" }} />
            <Text type="secondary" style={{ fontSize: 13 }}>
              Click or drag image here
            </Text>
            <Text type="secondary" style={{ fontSize: 11 }}>
              JPG, PNG, WEBP — max 5 MB
            </Text>
          </Space>
        </Dragger>
      )}
    </div>
  );
}

// Local form shape — core server fields plus the IP and service lists
type ServerFormValues = Omit<ServerFormData, "image_front" | "image_rear"> & {
  ips?: IPRow[];
  services?: ServiceRow[];
};

export default function ServerFormModal({ open, server, onClose }: Props) {
  const [form] = Form.useForm<ServerFormValues>();
  const isEdit = !!server;

  const [frontSlot, setFront] = useState<ImageSlot>(EMPTY_SLOT);
  const [rearSlot,  setRear]  = useState<ImageSlot>(EMPTY_SLOT);

  const qc = useQueryClient();
  const create  = useCreateServer();
  const update  = useUpdateServer();
  const loading = create.isPending || update.isPending;

  // Populate form when modal opens
  useEffect(() => {
    if (!open) return;

    if (server) {
      form.setFieldsValue({
        name:          server.name,
        hostname:      server.hostname,
        serial_number: server.serial_number,
        manufacturer:  server.manufacturer,
        model:         server.model,
        location:      server.location,
        os:            server.os,
        os_version:    server.os_version,
        cpu_cores:     server.cpu_cores  ?? undefined,
        ram_gb:        server.ram_gb     ?? undefined,
        storage_tb:    server.storage_tb ? Number(server.storage_tb) : undefined,
        status:        server.status,
        notes:         server.notes,
        owner:         server.owner ?? undefined,
        // Existing IPs and services, so editing shows what is already assigned
        ips:      (server.ip_addresses ?? []).map((ip) => ({ id: ip.id, address: ip.address })),
        services: (server.services ?? []).map((s) => ({
          id: s.id, name: s.name, port: s.port, status: s.status as ServiceRow["status"],
        })),
      });
      setFront(server.image_front
        ? { file: null, preview: server.image_front, cleared: false }
        : EMPTY_SLOT);
      setRear(server.image_rear
        ? { file: null, preview: server.image_rear, cleared: false }
        : EMPTY_SLOT);
    } else {
      form.resetFields();
      form.setFieldValue("status", "active");
      setFront(EMPTY_SLOT);
      setRear(EMPTY_SLOT);
    }
  }, [open, server, form]);

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      if (frontSlot.preview?.startsWith("blob:")) URL.revokeObjectURL(frontSlot.preview);
      if (rearSlot.preview?.startsWith("blob:"))  URL.revokeObjectURL(rearSlot.preview);
    };
  }, [frontSlot.preview, rearSlot.preview]);

  const handleOk = async () => {
    let values: ServerFormValues;
    try {
      values = await form.validateFields();
    } catch {
      // Ant Design highlights the fields — no extra action needed
      return;
    }

    // Keep the IP and service lists out of the server payload; they are saved separately
    const { ips, services, ...serverValues } = values;

    // Build the final server payload
    const payload: ServerFormData = {
      ...serverValues,
      // Clearing the dropdown gives undefined, which would mean "leave unchanged"; send null to remove the owner
      owner: serverValues.owner ?? null,
      // Include File if user picked one; null if user cleared; undefined if untouched
      image_front: frontSlot.file ?? (frontSlot.cleared ? null : undefined),
      image_rear:  rearSlot.file  ?? (rearSlot.cleared  ? null : undefined),
    };

    try {
      let serverId: number;
      if (isEdit && server) {
        await update.mutateAsync({ id: server.id, data: payload });
        serverId = server.id;
        message.success(`Server "${values.name}" updated`);
      } else {
        const created = await create.mutateAsync(payload);
        serverId = created.id;
        message.success(`Server "${values.name}" added`);
      }

      // Apply IP and service changes. This never throws; problems come back as warnings.
      const warnings = await syncHostRelations(
        "server",
        serverId,
        { ips, services },
        {
          ips: server?.ip_addresses ?? [],
          services: server?.services ?? [],
        },
      );
      warnings.forEach((w) => message.warning({ content: `Server saved, but: ${w}`, duration: 6 }));

      // Refresh everything that shows IPs or services
      ["servers", "ips", "subnets", "services", "dashboard"].forEach((key) =>
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
            const errText = Array.isArray(errors) ? errors.join(", ") : errors;
            return `${field}: ${errText}`;
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
          {isEdit ? `Edit Server — ${server?.name}` : "Add New Server"}
        </Space>
      }
      open={open}
      onOk={handleOk}
      onCancel={onClose}
      okText={isEdit ? "Save Changes" : "Add Server"}
      cancelText="Cancel"
      confirmLoading={loading}
      width={760}
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
              label="Server Name"
              rules={[{ required: true, message: "Server name is required" }]}
            >
              <Input placeholder="e.g. prod-web-01" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="hostname"
              label="Hostname / FQDN"
              rules={[{ required: true, message: "Hostname is required" }]}
            >
              <Input placeholder="e.g. prod-web-01.example.com" />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item name="manufacturer" label="Manufacturer">
              <Input placeholder="e.g. Dell, HP, Lenovo" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="model" label="Model">
              <Input placeholder="e.g. PowerEdge R740" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="serial_number" label="Serial Number">
              <Input placeholder="e.g. ABC123XYZ" />
            </Form.Item>
          </Col>
        </Row>

        {/* ── Location & Status ────────────────────────────────── */}
        <Divider orientation="left" orientationMargin={0}>
          Location & Status
        </Divider>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="location" label="Location / Rack">
              <Input placeholder="e.g. DC1 / Rack A / Unit 12" />
            </Form.Item>
          </Col>
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

        <Row gutter={16}>
          <Col span={12}>
            <OwnerSelect />
          </Col>
        </Row>

        {/* ── Operating System (optional) ──────────────────────── */}
        <Divider orientation="left" orientationMargin={0}>
          Operating System{" "}
          <span style={{ fontSize: 12, fontWeight: 400, color: "#8c8c8c" }}>(optional)</span>
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

        {/* ── Hardware Specs ───────────────────────────────────── */}
        <Divider orientation="left" orientationMargin={0}>
          Hardware Specs
        </Divider>
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item name="cpu_cores" label="CPU Cores">
              <InputNumber min={1} style={{ width: "100%" }} placeholder="e.g. 32" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="ram_gb" label="RAM (GB)">
              <InputNumber min={1} style={{ width: "100%" }} placeholder="e.g. 128" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="storage_tb" label="Storage (TB)">
              <InputNumber min={0} step={0.5} style={{ width: "100%" }} placeholder="e.g. 4.0" />
            </Form.Item>
          </Col>
        </Row>

        {/* ── IP addresses (optional) ──────────────────────────── */}
        <Divider orientation="left" orientationMargin={0}>
          IP Addresses <Text type="secondary" style={{ fontSize: 12, fontWeight: 400 }}>(optional)</Text>
        </Divider>
        <HostIPListField emptyHint="No IP addresses assigned to this server." />

        {/* ── Services (optional) ──────────────────────────────── */}
        <Divider orientation="left" orientationMargin={0}>
          Services <Text type="secondary" style={{ fontSize: 12, fontWeight: 400 }}>(optional)</Text>
        </Divider>
        <HostServicesField emptyHint="No services recorded on this server." />

        {/* ── Server Images ────────────────────────────────────── */}
        <Divider orientation="left" orientationMargin={0}>
          Server Images
        </Divider>
        <Row gutter={16}>
          <Col span={12}>
            <ImageUploadSlot
              label="Front View"
              slot={frontSlot}
              onChange={setFront}
            />
          </Col>
          <Col span={12}>
            <ImageUploadSlot
              label="Rear View"
              slot={rearSlot}
              onChange={setRear}
            />
          </Col>
        </Row>

        {/* ── Notes ───────────────────────────────────────────── */}
        <Divider orientation="left" orientationMargin={0}>
          Notes
        </Divider>
        <Form.Item name="notes">
          <Input.TextArea
            rows={3}
            placeholder="Any additional information about this server..."
          />
        </Form.Item>

      </Form>
    </Modal>
  );
}
