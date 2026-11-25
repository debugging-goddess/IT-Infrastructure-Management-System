import { Form, Input, Button, Space } from "antd";
import { PlusOutlined, MinusCircleOutlined } from "@ant-design/icons";

const IP_REGEX = /^(\d{1,3}\.){3}\d{1,3}$|^[0-9a-fA-F:]+$/;

interface Props {
  /** Shown under the list when it is empty */
  emptyHint?: string;
}

/**
 * Editable list of IP addresses for a server or VM.
 * Must be rendered inside an antd <Form>. Binds to the `ips` field:
 * an array of { id?: number; address: string }.
 */
export default function HostIPListField({ emptyHint }: Props) {
  return (
    <Form.List
      name="ips"
      rules={[
        {
          validator: async (_, rows: { address?: string }[] | undefined) => {
            const addrs = (rows ?? [])
              .map((r) => r?.address?.trim())
              .filter((a): a is string => !!a);
            if (new Set(addrs).size !== addrs.length) {
              return Promise.reject(new Error("The same IP address is listed twice"));
            }
          },
        },
      ]}
    >
      {(fields, { add, remove }, { errors }) => (
        <>
          {fields.length === 0 && emptyHint && (
            <div style={{ color: "#8c8c8c", fontSize: 13, marginBottom: 8 }}>{emptyHint}</div>
          )}

          {fields.map(({ key, name }) => (
            <Space key={key} align="start" style={{ display: "flex", marginBottom: 0 }}>
              {/* Carries the record id of an existing IP so edits update it in place */}
              <Form.Item name={[name, "id"]} hidden>
                <Input />
              </Form.Item>
              <Form.Item
                name={[name, "address"]}
                style={{ width: 300, marginBottom: 12 }}
                rules={[
                  { required: true, message: "Enter an IP address or remove this row" },
                  { pattern: IP_REGEX, message: "Enter a valid IPv4 or IPv6 address" },
                ]}
              >
                <Input placeholder="e.g. 192.168.1.10" />
              </Form.Item>
              <Button
                type="text"
                danger
                icon={<MinusCircleOutlined />}
                aria-label="Remove IP address"
                onClick={() => remove(name)}
              />
            </Space>
          ))}

          <Form.ErrorList errors={errors} />
          <Button type="dashed" icon={<PlusOutlined />} onClick={() => add({})}>
            Add IP address
          </Button>
        </>
      )}
    </Form.List>
  );
}
