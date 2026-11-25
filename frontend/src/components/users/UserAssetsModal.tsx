import { useEffect, useMemo } from "react";
import { Modal, Form, Select, Alert, Spin, Typography, message } from "antd";
import { CloudServerOutlined, DesktopOutlined, AppstoreOutlined } from "@ant-design/icons";
import type { ReactNode } from "react";
import { useAssignableAssets, useSetUserAssets, type AssignableAsset } from "@/hooks/useUsers";
import type { User, SetUserAssetsPayload } from "@/types";

const { Text } = Typography;

type Kind = "servers" | "vms" | "applications";
type Selection = Record<Kind, number[]>;

const KINDS: { key: Kind; label: string; icon: ReactNode; placeholder: string }[] = [
  { key: "servers",      label: "Servers",        icon: <CloudServerOutlined style={{ color: "#1677ff" }} />, placeholder: "Select servers" },
  { key: "vms",          label: "Virtual Machines", icon: <DesktopOutlined style={{ color: "#52c41a" }} />,    placeholder: "Select virtual machines" },
  { key: "applications", label: "Applications",   icon: <AppstoreOutlined style={{ color: "#fa8c16" }} />,    placeholder: "Select applications" },
];

const EMPTY: Selection = { servers: [], vms: [], applications: [] };

interface Props {
  open: boolean;
  user: User | null;
  onClose: () => void;
}

export default function UserAssetsModal({ open, user, onClose }: Props) {
  const [form] = Form.useForm<Selection>();
  const { data, isLoading } = useAssignableAssets(open && !!user);
  const save = useSetUserAssets();

  // What this user owns right now, per kind
  const initial = useMemo<Selection>(() => {
    if (!data || !user) return EMPTY;
    return {
      servers:      data.servers.filter((a) => a.owner === user.id).map((a) => a.value),
      vms:          data.vms.filter((a) => a.owner === user.id).map((a) => a.value),
      applications: data.applications.filter((a) => a.owner === user.id).map((a) => a.value),
    };
  }, [data, user]);

  useEffect(() => {
    if (open) form.setFieldsValue(initial);
  }, [open, initial, form]);

  // Live: how many of the current picks belong to somebody else (they would be moved)
  const picked = Form.useWatch([], form) as Partial<Selection> | undefined;
  const takenFromOthers = useMemo(() => {
    if (!data || !user || !picked) return 0;
    let n = 0;
    for (const { key } of KINDS) {
      const selected = new Set(picked[key] ?? []);
      n += data[key].filter((a) => selected.has(a.value) && a.owner && a.owner !== user.id).length;
    }
    return n;
  }, [data, user, picked]);

  const optionsFor = (assets: AssignableAsset[] | undefined) =>
    [...(assets ?? [])]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((a) => ({
        value: a.value,
        label:
          a.owner && a.owner !== user?.id
            ? `${a.name} — currently ${a.owner_name ?? "another user"}`
            : a.name,
      }));

  const handleOk = async () => {
    if (!user) return;
    const values = { ...EMPTY, ...form.getFieldsValue() };

    // Send only what changed, so nothing the dialog did not show can be released by accident
    const payload: SetUserAssetsPayload = {};
    for (const { key } of KINDS) {
      const wanted = values[key] ?? [];
      const assign  = wanted.filter((id) => !initial[key].includes(id));
      const release = initial[key].filter((id) => !wanted.includes(id));
      if (assign.length || release.length) payload[key] = { assign, release };
    }

    if (Object.keys(payload).length === 0) {
      message.info("No changes to save");
      onClose();
      return;
    }

    try {
      const result = await save.mutateAsync({ id: user.id, data: payload });
      const assigned = Object.values(result.changes).reduce((n, c) => n + c.assigned, 0);
      const released = Object.values(result.changes).reduce((n, c) => n + c.released, 0);
      const parts = [
        assigned ? `${assigned} assigned` : "",
        released ? `${released} released` : "",
      ].filter(Boolean);
      message.success(`${user.full_name}: ${parts.join(", ")}`);
      onClose();
    } catch (err: unknown) {
      const data = (err as { response?: { data?: Record<string, string | string[]> } })?.response?.data;
      if (data) {
        message.error({
          content: Object.entries(data)
            .map(([field, errors]) => `${field}: ${Array.isArray(errors) ? errors.join(", ") : errors}`)
            .join("\n"),
          duration: 6,
        });
      } else {
        message.error("Something went wrong. Please try again.");
      }
    }
  };

  return (
    <Modal
      title={user ? `Manage assets — ${user.full_name}` : "Manage assets"}
      open={open}
      onOk={handleOk}
      onCancel={onClose}
      okText="Save"
      cancelText="Cancel"
      confirmLoading={save.isPending}
      okButtonProps={{ disabled: isLoading }}
      width={640}
      destroyOnClose
    >
      <Text type="secondary" style={{ display: "block", marginBottom: 16 }}>
        Choose the servers, VMs and applications this person is responsible for. Removing an item
        leaves it without an owner.
      </Text>

      {isLoading ? (
        <div style={{ textAlign: "center", padding: "40px 0" }}><Spin /></div>
      ) : (
        <Form form={form} layout="vertical">
          {KINDS.map(({ key, label, icon, placeholder }) => (
            <Form.Item
              key={key}
              name={key}
              label={<span>{icon} {label}</span>}
            >
              <Select
                mode="multiple"
                allowClear
                showSearch
                maxTagCount="responsive"
                placeholder={placeholder}
                options={optionsFor(data?.[key])}
                filterOption={(input, option) =>
                  String(option?.label ?? "").toLowerCase().includes(input.toLowerCase())
                }
                notFoundContent={`No ${label.toLowerCase()} yet`}
              />
            </Form.Item>
          ))}

          {takenFromOthers > 0 && (
            <Alert
              type="warning"
              showIcon
              message={`${takenFromOthers} selected item${takenFromOthers === 1 ? "" : "s"} currently belong${takenFromOthers === 1 ? "s" : ""} to someone else and will be moved to ${user?.full_name}.`}
            />
          )}
        </Form>
      )}
    </Modal>
  );
}
