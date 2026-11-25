import { Form, Input, InputNumber, Select, Button, Space } from "antd";
import { PlusOutlined, MinusCircleOutlined } from "@ant-design/icons";

const SERVICE_STATUS_OPTIONS = [
  { value: "running", label: "Running" },
  { value: "stopped", label: "Stopped" },
  { value: "failed",  label: "Failed" },
];

interface Props {
  /** Shown under the list when it is empty */
  emptyHint?: string;
}

/**
 * Editable list of OS-level services (nginx, postgres, sshd...) for a server or VM.
 * Must be rendered inside an antd <Form>. Binds to the `services` field:
 * an array of { id?: number; name: string; port?: number; status: string }.
 */
export default function HostServicesField({ emptyHint }: Props) {
  return (
    <Form.List name="services">
      {(fields, { add, remove }) => (
        <>
          {fields.length === 0 && emptyHint && (
            <div style={{ color: "#8c8c8c", fontSize: 13, marginBottom: 8 }}>{emptyHint}</div>
          )}

          {fields.map(({ key, name }) => (
            <Space key={key} align="start" wrap style={{ display: "flex", marginBottom: 0 }}>
              {/* Carries the record id of an existing service so edits update it in place */}
              <Form.Item name={[name, "id"]} hidden>
                <Input />
              </Form.Item>
              <Form.Item
                name={[name, "name"]}
                style={{ width: 240, marginBottom: 12 }}
                rules={[{ required: true, message: "Enter a service name or remove this row" }]}
              >
                <Input placeholder="e.g. nginx, postgresql, sshd" />
              </Form.Item>
              <Form.Item name={[name, "port"]} style={{ width: 120, marginBottom: 12 }}>
                <InputNumber min={1} max={65535} placeholder="Port" style={{ width: "100%" }} />
              </Form.Item>
              <Form.Item
                name={[name, "status"]}
                style={{ width: 130, marginBottom: 12 }}
                rules={[{ required: true, message: "Pick a status" }]}
              >
                <Select options={SERVICE_STATUS_OPTIONS} placeholder="Status" />
              </Form.Item>
              <Button
                type="text"
                danger
                icon={<MinusCircleOutlined />}
                aria-label="Remove service"
                onClick={() => remove(name)}
              />
            </Space>
          ))}

          <Button
            type="dashed"
            icon={<PlusOutlined />}
            onClick={() => add({ status: "running" })}
          >
            Add service
          </Button>
        </>
      )}
    </Form.List>
  );
}
