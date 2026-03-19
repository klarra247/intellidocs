'use client';

import { useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { ReactFlowProvider } from '@xyflow/react';
import { useGraphStore } from '@/stores/graphStore';
import { useDocumentStore } from '@/stores/documentStore';
import GraphFilters from '@/components/knowledge-graph/GraphFilters';
import MetricDetailPanel from '@/components/knowledge-graph/MetricDetailPanel';
import GraphStats from '@/components/knowledge-graph/GraphStats';

const GraphCanvas = dynamic(() => import('@/components/knowledge-graph/GraphCanvas'), {
  ssr: false,
  loading: () => (
    <div className="flex flex-1 items-center justify-center">
      <div
        className="h-8 w-8 animate-spin rounded-full border-2"
        style={{ borderColor: '#e8f0fe', borderTopColor: '#2383e2' }}
      />
    </div>
  ),
});

export default function KnowledgeGraphPage() {
  const { fetchGraph, stats, selectedNode, nodes, reset } = useGraphStore();
  const documents = useDocumentStore((s) => s.documents);
  const pollRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    fetchGraph();
    return () => reset();
  }, [fetchGraph, reset]);

  // Auto-poll when documents exist but graph is empty (extraction in progress)
  const hasIndexedDocs = documents.some((d) => d.status === 'INDEXED');
  const isEmpty = nodes.length === 0;

  useEffect(() => {
    if (isEmpty && hasIndexedDocs) {
      pollRef.current = setInterval(() => {
        fetchGraph();
      }, 10000);
      return () => clearInterval(pollRef.current);
    }
    if (pollRef.current) {
      clearInterval(pollRef.current);
    }
  }, [isEmpty, hasIndexedDocs, fetchGraph]);

  return (
    <div className="flex h-full flex-col">
      <GraphFilters />
      <div className="flex flex-1 overflow-hidden">
        <ReactFlowProvider>
          <GraphCanvas className="flex-1" />
        </ReactFlowProvider>
        {selectedNode && <MetricDetailPanel />}
      </div>
      {stats.totalMetrics > 0 && <GraphStats stats={stats} />}
    </div>
  );
}
