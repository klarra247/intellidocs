import { create } from 'zustand';
import { knowledgeGraphApi } from '@/lib/api';
import type { GraphNode, GraphEdge, GraphStats, MetricDetailResponse } from '@/lib/types';

interface GraphFilters {
  documentIds: string[];
  changeDirection: string | null; // 'increase' | 'decrease' | null
  multiDocOnly: boolean;
}

interface GraphState {
  nodes: GraphNode[];
  edges: GraphEdge[];
  stats: GraphStats;
  loading: boolean;
  rebuilding: boolean;
  selectedNode: GraphNode | null;
  selectedMetricDetail: MetricDetailResponse | null;
  highlightedNodeIds: Set<string>;
  focusNodeId: string | null;
  filters: GraphFilters;

  fetchGraph: () => Promise<void>;
  selectNode: (node: GraphNode | null) => void;
  setFilter: (partial: Partial<GraphFilters>) => void;
  searchMetrics: (query: string) => Promise<GraphNode[]>;
  focusNode: (nodeId: string) => void;
  rebuildGraph: () => Promise<void>;
  reset: () => void;
}

const defaultStats: GraphStats = {
  totalDocuments: 0,
  totalMetrics: 0,
  totalEdges: 0,
  crossDocumentMetrics: 0,
};

export const useGraphStore = create<GraphState>((set, get) => ({
  nodes: [],
  edges: [],
  stats: defaultStats,
  loading: false,
  rebuilding: false,
  selectedNode: null,
  selectedMetricDetail: null,
  highlightedNodeIds: new Set<string>(),
  focusNodeId: null,
  filters: { documentIds: [], changeDirection: null, multiDocOnly: false },

  fetchGraph: async () => {
    set({ loading: true });
    try {
      const { filters } = get();
      const params: { documentIds?: string[]; changeDirection?: string } = {};
      if (filters.documentIds.length > 0) params.documentIds = filters.documentIds;
      if (filters.changeDirection) params.changeDirection = filters.changeDirection;

      const res = await knowledgeGraphApi.getGraph(params);
      let nodes = res.nodes;
      let edges = res.edges;

      // Client-side multiDocOnly filter
      if (filters.multiDocOnly) {
        const multiDocMetricIds = new Set(
          nodes
            .filter((n) => n.type === 'metric' && (n.occurrences?.length ?? 0) >= 2)
            .map((n) => n.id),
        );
        // Keep document nodes that connect to multi-doc metrics
        const connectedDocIds = new Set(
          edges
            .filter((e) => multiDocMetricIds.has(e.target))
            .map((e) => e.source),
        );
        nodes = nodes.filter(
          (n) =>
            (n.type === 'metric' && multiDocMetricIds.has(n.id)) ||
            (n.type === 'document' && connectedDocIds.has(n.id)),
        );
        edges = edges.filter((e) => multiDocMetricIds.has(e.target));
      }

      set({ nodes, edges, stats: res.stats, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  selectNode: (node) => {
    set({ selectedNode: node, selectedMetricDetail: null });
    if (node && node.type === 'metric') {
      // Extract normalizedMetric from id: "metric_매출액" → "매출액"
      const normalizedMetric = node.id.replace(/^metric_/, '');
      knowledgeGraphApi.getMetricDetail(normalizedMetric).then((detail) => {
        set({ selectedMetricDetail: detail });
      }).catch(() => {});
    }
  },

  setFilter: (partial) => {
    set((state) => ({
      filters: { ...state.filters, ...partial },
    }));
  },

  searchMetrics: async (query) => {
    if (!query.trim()) {
      set({ highlightedNodeIds: new Set<string>() });
      return [];
    }
    try {
      const res = await knowledgeGraphApi.search(query);
      const ids = new Set<string>(res.results.map((n) => n.id));
      set({ highlightedNodeIds: ids });
      return res.results;
    } catch {
      return [];
    }
  },

  focusNode: (nodeId) => {
    set({ focusNodeId: nodeId });
    setTimeout(() => set({ focusNodeId: null }), 500);
  },

  rebuildGraph: async () => {
    set({ rebuilding: true });
    try {
      await knowledgeGraphApi.rebuild();
      // Poll for results after rebuild
      setTimeout(() => {
        get().fetchGraph();
        set({ rebuilding: false });
      }, 5000);
    } catch {
      set({ rebuilding: false });
    }
  },

  reset: () => {
    set({
      nodes: [],
      edges: [],
      stats: defaultStats,
      loading: false,
      rebuilding: false,
      selectedNode: null,
      selectedMetricDetail: null,
      highlightedNodeIds: new Set<string>(),
      focusNodeId: null,
      filters: { documentIds: [], changeDirection: null, multiDocOnly: false },
    });
  },
}));
