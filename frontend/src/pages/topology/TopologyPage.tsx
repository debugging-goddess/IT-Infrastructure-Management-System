import { useEffect, useRef, useState } from "react";
import { Card, Typography, Space, Spin, Empty, Button, Select, Row, Col } from "antd";
import {
  PartitionOutlined, ReloadOutlined, CloudServerOutlined,
  DesktopOutlined, AppstoreOutlined,
} from "@ant-design/icons";
import cytoscape, { type Core, type ElementDefinition } from "cytoscape";
import { useTopology } from "@/hooks/useDashboard";
import type { Topology } from "@/types";

const { Title, Text } = Typography;

// Node fill color by resource type
const TYPE_COLOR: Record<string, string> = {
  server:      "#1677ff",
  vm:          "#52c41a",
  application: "#fa8c16",
};

// A red ring for anything in a bad/ended state
const BAD_STATUSES = new Set(["decommissioned", "failed", "stopped", "degraded"]);

function buildElements(topology: Topology): ElementDefinition[] {
  const nodes: ElementDefinition[] = topology.nodes.map((n) => ({
    data: {
      id: n.id,
      label: n.label,
      type: n.type,
      status: n.status,
      bad: BAD_STATUSES.has(n.status) ? "1" : "0",
    },
  }));
  const edges: ElementDefinition[] = topology.edges.map((e) => ({
    data: {
      id: e.id,
      source: e.source,
      target: e.target,
      type: e.type,
    },
  }));
  return [...nodes, ...edges];
}

const LAYOUTS = [
  { value: "breadthfirst", label: "Hierarchy" },
  { value: "cose",         label: "Force-directed" },
  { value: "circle",       label: "Circle" },
  { value: "grid",         label: "Grid" },
];

export default function TopologyPage() {
  const { data, isLoading, refetch, isFetching } = useTopology();
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);
  const [layout, setLayout] = useState("breadthfirst");

  useEffect(() => {
    if (!containerRef.current || !data) return;

    // Destroy any previous instance before re-rendering
    cyRef.current?.destroy();

    const cy = cytoscape({
      container: containerRef.current,
      elements: buildElements(data),
      style: [
        {
          selector: "node",
          style: {
            "background-color": (ele) => TYPE_COLOR[ele.data("type")] ?? "#8c8c8c",
            label: "data(label)",
            color: "#333",
            "font-size": 11,
            "text-valign": "bottom",
            "text-margin-y": 4,
            width: 34,
            height: 34,
            "border-width": 3,
            "border-color": (ele) => (ele.data("bad") === "1" ? "#ff4d4f" : "#fff"),
          },
        },
        {
          selector: "edge",
          style: {
            width: 2,
            "line-color": "#c7c7c7",
            "target-arrow-color": "#c7c7c7",
            "target-arrow-shape": "triangle",
            "curve-style": "bezier",
            label: "data(type)",
            "font-size": 9,
            color: "#999",
            "text-rotation": "autorotate",
          },
        },
        {
          selector: 'edge[type = "depends"]',
          style: {
            "line-color": "#fa8c16",
            "target-arrow-color": "#fa8c16",
            "line-style": "dashed",
          },
        },
        {
          selector: "node:selected",
          style: { "border-color": "#1677ff", "border-width": 4 },
        },
      ],
      layout: { name: layout, padding: 30, animate: true } as cytoscape.LayoutOptions,
      minZoom: 0.2,
      maxZoom: 2.5,
    });

    cyRef.current = cy;
    return () => cy.destroy();
  }, [data, layout]);

  const relayout = () => {
    cyRef.current?.layout({ name: layout, padding: 30, animate: true } as cytoscape.LayoutOptions).run();
  };

  const fit = () => cyRef.current?.fit(undefined, 40);

  return (
    <>
      {/* ── Header ─────────────────────────────────────────────── */}
      <div style={{ marginBottom: 16 }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Space align="center">
              <PartitionOutlined style={{ fontSize: 24, color: "#722ed1" }} />
              <div>
                <Title level={4} style={{ margin: 0 }}>Topology</Title>
                <Text type="secondary" style={{ fontSize: 13 }}>
                  How your infrastructure connects — servers host VMs, which run applications
                </Text>
              </div>
            </Space>
          </Col>
          <Col>
            <Space>
              <Select
                value={layout}
                onChange={setLayout}
                options={LAYOUTS}
                style={{ width: 160 }}
              />
              <Button onClick={fit}>Fit</Button>
              <Button onClick={relayout}>Re-layout</Button>
              <Button icon={<ReloadOutlined spin={isFetching} />} onClick={() => refetch()} />
            </Space>
          </Col>
        </Row>
      </div>

      {/* ── Legend ─────────────────────────────────────────────── */}
      <Card size="small" style={{ marginBottom: 16 }} styles={{ body: { padding: "10px 16px" } }}>
        <Space size={24} wrap>
          <Space size={6}><span style={{ width: 12, height: 12, borderRadius: "50%", background: TYPE_COLOR.server, display: "inline-block" }} /><CloudServerOutlined /> Server</Space>
          <Space size={6}><span style={{ width: 12, height: 12, borderRadius: "50%", background: TYPE_COLOR.vm, display: "inline-block" }} /><DesktopOutlined /> Virtual Machine</Space>
          <Space size={6}><span style={{ width: 12, height: 12, borderRadius: "50%", background: TYPE_COLOR.application, display: "inline-block" }} /><AppstoreOutlined /> Application</Space>
          <Space size={6}><span style={{ width: 12, height: 12, borderRadius: "50%", border: "3px solid #ff4d4f", display: "inline-block" }} /> At-risk status</Space>
          <Space size={6}><span style={{ width: 20, borderTop: "2px dashed #fa8c16", display: "inline-block" }} /> Dependency</Space>
        </Space>
      </Card>

      {/* ── Graph ──────────────────────────────────────────────── */}
      <Card styles={{ body: { padding: 0 } }}>
        {isLoading ? (
          <div style={{ textAlign: "center", padding: "100px 0" }}><Spin size="large" /></div>
        ) : data && data.nodes.length > 0 ? (
          <>
            <div
              ref={containerRef}
              style={{ width: "100%", height: "calc(100vh - 320px)", minHeight: 420, background: "#fafafa" }}
            />
            <div style={{ padding: "8px 16px", borderTop: "1px solid #f0f0f0" }}>
              <Space size={16}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {data.counts.servers} servers · {data.counts.vms} VMs · {data.counts.applications} apps · {data.counts.edges} connections
                </Text>
              </Space>
            </div>
          </>
        ) : (
          <Empty
            description="No infrastructure to visualize yet. Add servers, VMs, and applications first."
            style={{ padding: "80px 0" }}
          />
        )}
      </Card>
    </>
  );
}
