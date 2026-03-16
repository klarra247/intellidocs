'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  ReactFlow,
  Background,
  MiniMap,
  Controls,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type Node,
  type Edge,
  type NodeTypes,
  BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from 'dagre';
import { useGraphStore } from '@/stores/graphStore';
import { useViewerStore } from '@/stores/viewerStore';
import MetricNodeComponent from './MetricNode';
import DocumentNodeComponent from './DocumentNode';
import GraphEmptyState from './GraphEmptyState';
import type { GraphNode as GNode } from '@/lib/types';

const nodeTypes: NodeTypes = {
  metric: MetricNodeComponent,
  document: DocumentNodeComponent,
};

const EDGE_STYLE = { stroke: '#94a3b8', strokeWidth: 1.5 };

const METRIC_WIDTHS: Record<string, number> = { sm: 130, md: 160, lg: 190 };

function metricSize(occurrences?: { length: number }): 'sm' | 'md' | 'lg' {
  const len = occurrences?.length ?? 0;
  if (len >= 4) return 'lg';
  if (len >= 2) return 'md';
  return 'sm';
}

function applyDagreLayout(
  nodes: Node[],
  edges: Edge[],
): { nodes: Node[]; edges: Edge[] } {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: 'LR', ranksep: 80, nodesep: 50, marginx: 40, marginy: 40 });

  nodes.forEach((node) => {
    const isDoc = node.type === 'document';
    const width = isDoc ? 160 : METRIC_WIDTHS[(node.data as Record<string, unknown>)?.size as string] ?? 160;
    const height = isDoc ? 50 : 55;
    g.setNode(node.id, { width, height });
  });

  edges.forEach((edge) => {
    g.setEdge(edge.source, edge.target);
  });

  dagre.layout(g);

  const layoutedNodes = nodes.map((node) => {
    const pos = g.node(node.id);
    const isDoc = node.type === 'document';
    const width = isDoc ? 160 : METRIC_WIDTHS[(node.data as Record<string, unknown>)?.size as string] ?? 160;
    const height = isDoc ? 50 : 55;
    return {
      ...node,
      position: { x: pos.x - width / 2, y: pos.y - height / 2 },
    };
  });

  return { nodes: layoutedNodes, edges };
}

interface Props {
  className?: string;
}

export default function GraphCanvas({ className }: Props) {
  const { nodes: graphNodes, edges: graphEdges, selectedNode, highlightedNodeIds, focusNodeId, loading, rebuilding, selectNode } = useGraphStore();
  const openViewer = useViewerStore((s) => s.openViewer);
  const [rfNodes, setRfNodes, onNodesChange] = useNodesState([] as Node[]);
  const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState([] as Edge[]);
  const { fitView } = useReactFlow();
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  // Build set of connected edge IDs for hovered node
  const hoveredEdgeIds = hoveredNodeId
    ? new Set(graphEdges.filter((e) => e.source === hoveredNodeId || e.target === hoveredNodeId).map((e) => e.id))
    : null;
  const hoveredConnectedNodeIds = hoveredNodeId
    ? new Set(graphEdges.filter((e) => e.source === hoveredNodeId || e.target === hoveredNodeId).flatMap((e) => [e.source, e.target]))
    : null;

  useEffect(() => {
    if (graphNodes.length === 0) {
      setRfNodes([]);
      setRfEdges([]);
      return;
    }

    // Merge search highlight dimming with hover dimming
    const dimmedByHover = hoveredNodeId != null;
    const dimmedBySearch = highlightedNodeIds.size > 0;

    const flowNodes = graphNodes.map((gn) => {
      const size = gn.type === 'metric' ? metricSize(gn.occurrences) : ('sm' as const);

      let dimmed = false;
      if (dimmedBySearch && !highlightedNodeIds.has(gn.id)) dimmed = true;
      if (dimmedByHover && hoveredConnectedNodeIds && !hoveredConnectedNodeIds.has(gn.id)) dimmed = true;

      return {
        id: gn.id,
        type: gn.type,
        position: { x: 0, y: 0 },
        data: {
          label: gn.name,
          // document fields
          fileType: gn.fileType,
          status: gn.status,
          // metric fields
          occurrences: gn.occurrences,
          change: gn.change,
          size,
          // shared
          selected: gn.id === (selectedNode?.id ?? null),
          dimmed,
        },
      };
    });

    const flowEdges = graphEdges.map((ge) => {
      const isDimmed = hoveredEdgeIds != null && !hoveredEdgeIds.has(ge.id);
      return {
        id: ge.id,
        source: ge.source,
        target: ge.target,
        type: 'default',
        style: {
          stroke: EDGE_STYLE.stroke,
          strokeWidth: isDimmed ? 1 : 1.5,
          opacity: isDimmed ? 0.15 : 1,
          transition: 'opacity 0.15s, stroke-width 0.15s',
        },
        label: ge.value || undefined,
        labelStyle: { fontSize: 9, fill: '#64748b', opacity: isDimmed ? 0.15 : 1, transition: 'opacity 0.15s' },
        labelBgStyle: { fill: '#f8fafc', stroke: '#e2e8f0', opacity: isDimmed ? 0.15 : 1, transition: 'opacity 0.15s' },
        labelBgPadding: [3, 1] as [number, number],
      };
    });

    const { nodes: layoutedNodes, edges: layoutedEdges } = applyDagreLayout(flowNodes, flowEdges);

    setRfNodes(layoutedNodes);
    setRfEdges(layoutedEdges);

    setTimeout(() => fitView({ padding: 0.1, duration: 300 }), 50);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graphNodes, graphEdges, selectedNode?.id, highlightedNodeIds, hoveredNodeId]);

  // Zoom to focused node (from search Enter)
  useEffect(() => {
    if (!focusNodeId) return;
    const node = rfNodes.find((n) => n.id === focusNodeId);
    if (node) {
      fitView({ nodes: [{ id: focusNodeId }], padding: 0.5, duration: 400 });
    }
  }, [focusNodeId, rfNodes, fitView]);

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      const gNode = graphNodes.find((n) => n.id === node.id);
      if (gNode) selectNode(gNode);
    },
    [graphNodes, selectNode]
  );

  const onNodeDoubleClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      const gNode = graphNodes.find((n) => n.id === node.id);
      if (!gNode) return;
      if (gNode.type === 'document') {
        // Document node id is "doc_<uuid>", extract the UUID
        const docId = gNode.id.replace(/^doc_/, '');
        openViewer(docId);
      } else if (gNode.type === 'metric' && gNode.occurrences?.length) {
        const firstOcc = gNode.occurrences[0];
        const highlight = firstOcc.pageNumber
          ? { chunkIndex: 0, pageNumber: firstOcc.pageNumber, sectionTitle: null }
          : undefined;
        openViewer(firstOcc.documentId, highlight);
      }
    },
    [graphNodes, openViewer]
  );

  const onNodeMouseEnter = useCallback((_: React.MouseEvent, node: Node) => {
    setHoveredNodeId(node.id);
  }, []);

  const onNodeMouseLeave = useCallback(() => {
    setHoveredNodeId(null);
  }, []);

  const onPaneClick = useCallback(() => {
    selectNode(null);
  }, [selectNode]);

  if (loading) {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-200 border-t-primary-600" />
      </div>
    );
  }

  if (graphNodes.length === 0) {
    return (
      <div className={className}>
        <GraphEmptyState rebuilding={rebuilding} />
      </div>
    );
  }

  return (
    <div className={className}>
      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onNodeDoubleClick={onNodeDoubleClick}
        onNodeMouseEnter={onNodeMouseEnter}
        onNodeMouseLeave={onNodeMouseLeave}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        fitView
        minZoom={0.2}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="#e2e8f0" />
        <Controls
          showInteractive={false}
          className="!bg-white !border-slate-200 !shadow-card [&>button]:!border-slate-200 [&>button]:!bg-white [&>button:hover]:!bg-slate-50"
        />
        <MiniMap
          nodeStrokeWidth={3}
          nodeColor={(node) => {
            if (node.type === 'metric') {
              const change = (node.data as Record<string, unknown>)?.change as { direction?: string } | null;
              if (change?.direction === 'increase') return '#86efac';
              if (change?.direction === 'decrease') return '#fca5a5';
              return '#e5e7eb';
            }
            return '#e2e8f0'; // document
          }}
          className="!bg-slate-50 !border-slate-200"
          maskColor="rgba(0,0,0,0.05)"
        />
      </ReactFlow>
    </div>
  );
}
