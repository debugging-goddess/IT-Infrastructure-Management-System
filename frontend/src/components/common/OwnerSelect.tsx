import { Form, Select } from "antd";
import { useUserOptions } from "@/hooks/useUsers";

/**
 * "Owner" dropdown for the Server, VM and Application forms.
 * Binds to the `owner` field (a user id, or empty for no owner). Must be inside an antd <Form>.
 */
export default function OwnerSelect() {
  const { data: options = [], isLoading } = useUserOptions();

  return (
    <Form.Item
      name="owner"
      label="Owner"
      tooltip="The person to contact when something goes wrong. You can also assign assets from the Users page."
    >
      <Select
        showSearch
        allowClear
        loading={isLoading}
        placeholder="Select an owner (optional)"
        options={options}
        filterOption={(input, option) =>
          String(option?.label ?? "").toLowerCase().includes(input.toLowerCase())
        }
      />
    </Form.Item>
  );
}
