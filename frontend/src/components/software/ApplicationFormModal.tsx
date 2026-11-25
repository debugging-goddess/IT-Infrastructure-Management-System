import { useEffect, useState } from "react";
import {
  Modal, Form, Input, Select, InputNumber,
  Row, Col, Divider, message, Radio,
} from "antd";
import {
  useCreateApplication, useUpdateApplication,
  useVMOptions, useServerOptionsForApps, useApplicationOptions,
} from "@/hooks/useApplications";
import OwnerSelect from "@/components/common/OwnerSelect";
import { ALL_APP_STATUSES } from "@/utils/appStatus";
import type { Application, ApplicationFormData } from "@/types";

interface Props {
  open: boolean;
  application?: Application | null;
  onClose: () => void;
}

type DeployTarget = "vm" | "server" | "none";

export default function ApplicationFormModal({ open, application, onClose }: Props) {
  const [form] = Form.useForm<ApplicationFormData>();
  const isEdit = !!application;

  const [deployTarget, setDeployTarget] = useState<DeployTarget>("none");

  const create  = useCreateApplication();
  const update  = useUpdateApplication();
  const loading = create.isPending || update.isPending;

  const { data: vmOptions = [],     isLoading: loadingVMs }     = useVMOptions();
  const { data: serverOptions = [], isLoading: loadingServers } = useServerOptionsForApps();
  const { data: appOptions = [],    isLoading: loadingApps }    = useApplicationOptions(application?.id);

  // Populate form when modal opens
  useEffect(() => {
    if (!open) return;
    if (application) {
      form.setFieldsValue({
        name:         application.name,
        version:      application.version,
        description:  application.description,
        status:       application.status,
        vm:           application.vm     ?? undefined,
        server:       application.server ?? undefined,
        port:         application.port   ?? undefined,
        url:          application.url,
        dependencies: application.dependencies,
        notes:        application.notes,
        owner:        application.owner ?? undefined,
      });
      // Determine which deployment target is active
      if (application.vm)        setDeployTarget("vm");
      else if (application.server) setDeployTarget("server");
      else                       setDeployTarget("none");
    } else {
      form.resetFields();
      form.setFieldValue("status", "running");
      setDeployTarget("none");
    }
  }, [open, application, form]);

  // When the deployment target changes, clear the other field
  const handleTargetChange = (target: DeployTarget) => {
    setDeployTarget(target);
    if (target === "vm")        form.setFieldValue("server", undefined);
    else if (target === "server") form.setFieldValue("vm", undefined);
    else { form.setFieldValue("vm", undefined); form.setFieldValue("server", undefined); }
  };

  const handleOk = async () => {
    let values: ApplicationFormData;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }

    // Normalise the deployment target — ensure only one is set
    const payload: ApplicationFormData = {
      ...values,
      // Clearing the dropdown gives undefined, which would mean "leave unchanged"; send null to remove the owner
      owner:  values.owner ?? null,
      vm:     deployTarget === "vm"     ? values.vm     ?? null : null,
      server: deployTarget === "server" ? values.server ?? null : null,
      dependencies: values.dependencies ?? [],
    };

    try {
      if (isEdit && application) {
        await update.mutateAsync({ id: application.id, data: payload });
        message.success(`Application "${values.name}" updated`);
      } else {
        await create.mutateAsync(payload);
        message.success(`Application "${values.name}" added`);
      }
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

  const filterOption = (input: string, option?: { label: string }) =>
    (option?.label ?? "").toLowerCase().includes(input.toLowerCase());

  return (
    <Modal
      title={isEdit ? `Edit Application — ${application?.name}` : "Add New Application"}
      open={open}
      onOk={handleOk}
      onCancel={onClose}
      okText={isEdit ? "Save Changes" : "Add Application"}
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
          <Col span={16}>
            <Form.Item
              name="name"
              label="Application Name"
              rules={[{ required: true, message: "Application name is required" }]}
            >
              <Input placeholder="e.g. Customer Portal, Billing API" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="version" label="Version">
              <Input placeholder="e.g. 2.4.1" />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item name="description" label="Description">
          <Input.TextArea rows={2} placeholder="What does this application do?" />
        </Form.Item>

        {/* ── Deployment ───────────────────────────────────────── */}
        <Divider orientation="left" orientationMargin={0}>
          Deployment
        </Divider>
        <Form.Item label="Deployed On">
          <Radio.Group
            value={deployTarget}
            onChange={(e) => handleTargetChange(e.target.value)}
            optionType="button"
            buttonStyle="solid"
          >
            <Radio.Button value="none">Not deployed</Radio.Button>
            <Radio.Button value="vm">Virtual Machine</Radio.Button>
            <Radio.Button value="server">Physical Server</Radio.Button>
          </Radio.Group>
        </Form.Item>

        {deployTarget === "vm" && (
          <Form.Item
            name="vm"
            label="Host VM"
            rules={[{ required: true, message: "Select the VM this app runs on" }]}
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

        {deployTarget === "server" && (
          <Form.Item
            name="server"
            label="Host Server"
            rules={[{ required: true, message: "Select the server this app runs on" }]}
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

        <Row gutter={16}>
          <Col span={8}>
            <Form.Item name="port" label="Port">
              <InputNumber min={1} max={65535} style={{ width: "100%" }} placeholder="e.g. 8080" />
            </Form.Item>
          </Col>
          <Col span={16}>
            <Form.Item
              name="url"
              label="URL"
              rules={[{ type: "url", message: "Enter a valid URL" }]}
            >
              <Input placeholder="e.g. https://portal.example.com" />
            </Form.Item>
          </Col>
        </Row>

        {/* ── Status & Dependencies ────────────────────────────── */}
        <Divider orientation="left" orientationMargin={0}>
          Status & Dependencies
        </Divider>
        <Row gutter={16}>
          <Col span={10}>
            <Form.Item
              name="status"
              label="Status"
              rules={[{ required: true, message: "Status is required" }]}
            >
              <Select options={ALL_APP_STATUSES} placeholder="Select status" />
            </Form.Item>
          </Col>
          <Col span={14}>
            <Form.Item
              name="dependencies"
              label="Depends On"
              tooltip="Other applications this one requires to function"
            >
              <Select
                mode="multiple"
                allowClear
                placeholder="Select dependency applications"
                loading={loadingApps}
                options={appOptions}
                filterOption={filterOption}
                maxTagCount="responsive"
              />
            </Form.Item>
          </Col>
        </Row>

        {/* ── Ownership ───────────────────────────────────────── */}
        <Divider orientation="left" orientationMargin={0}>
          Ownership
        </Divider>
        <Row gutter={16}>
          <Col span={12}>
            <OwnerSelect />
          </Col>
        </Row>

        {/* ── Notes ───────────────────────────────────────────── */}
        <Divider orientation="left" orientationMargin={0}>
          Notes
        </Divider>
        <Form.Item name="notes">
          <Input.TextArea rows={2} placeholder="Any additional information..." />
        </Form.Item>

      </Form>
    </Modal>
  );
}
