'use client';

import { X, FileText, TrendingUp, TrendingDown, ExternalLink } from 'lucide-react';
import { useGraphStore } from '@/stores/graphStore';
import { useViewerStore } from '@/stores/viewerStore';

export default function MetricDetailPanel() {
  const { selectedNode, selectedMetricDetail, nodes, edges } = useGraphStore();
  const openViewer = useViewerStore((s) => s.openViewer);

  if (!selectedNode) return null;

  const close = () => useGraphStore.getState().selectNode(null);

  // === Metric node selected ===
  if (selectedNode.type === 'metric') {
    const detail = selectedMetricDetail;
    const occurrences = detail?.occurrences ?? selectedNode.occurrences ?? [];
    const change = detail?.change ?? selectedNode.change;

    // Build set of document IDs currently visible in the graph
    const visibleDocIds = new Set(
      nodes.filter((n) => n.type === 'document').map((n) => n.id.replace(/^doc_/, '')),
    );

    return (
      <div className="w-[320px] border-l border-slate-200 bg-white overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <h3 className="text-sm font-bold text-slate-800">{selectedNode.name}</h3>
          <button onClick={close} className="rounded p-1 hover:bg-slate-100">
            <X className="h-4 w-4 text-slate-400" />
          </button>
        </div>

        {/* Change summary */}
        {change && (
          <div className={`mx-4 mt-3 rounded-lg px-3 py-2 text-center ${
            change.direction === 'increase' ? 'bg-green-50' :
            change.direction === 'decrease' ? 'bg-red-50' : 'bg-gray-50'
          }`}>
            <div className="flex items-center justify-center gap-1.5">
              {change.direction === 'increase' ? (
                <TrendingUp className="h-4 w-4 text-green-600" />
              ) : change.direction === 'decrease' ? (
                <TrendingDown className="h-4 w-4 text-red-600" />
              ) : null}
              <span className={`text-sm font-bold ${
                change.direction === 'increase' ? 'text-green-700' :
                change.direction === 'decrease' ? 'text-red-700' : 'text-slate-700'
              }`}>
                {change.from} → {change.to}
                {change.changePercent != null && (
                  <span className="ml-1 text-xs font-medium">
                    ({change.changePercent > 0 ? '+' : ''}{change.changePercent}%)
                  </span>
                )}
              </span>
            </div>
          </div>
        )}

        {/* Occurrences table */}
        <div className="px-4 mt-3">
          <p className="text-[11px] font-medium text-slate-500 mb-2">문서별 값</p>
          <div className="rounded-lg border border-slate-200 overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-500">
                  <th className="px-3 py-1.5 text-left font-medium">문서</th>
                  <th className="px-3 py-1.5 text-left font-medium">기간</th>
                  <th className="px-3 py-1.5 text-right font-medium">값</th>
                </tr>
              </thead>
              <tbody>
                {occurrences.map((occ, i) => {
                  const isVisible = visibleDocIds.has(occ.documentId);
                  return (
                    <tr
                      key={i}
                      className={`border-t border-slate-100 cursor-pointer transition-opacity ${
                        isVisible ? 'hover:bg-slate-50' : 'opacity-40'
                      }`}
                      onClick={() => {
                        if (occ.documentId) {
                          const highlight = occ.pageNumber
                            ? { chunkIndex: 0, pageNumber: occ.pageNumber, sectionTitle: null }
                            : undefined;
                          openViewer(occ.documentId, highlight);
                        }
                      }}
                    >
                      <td className={`px-3 py-1.5 truncate max-w-[120px] ${isVisible ? 'text-slate-700' : 'text-slate-400'}`}>
                        <div className="flex items-center gap-1">
                          <FileText className={`h-3 w-3 flex-shrink-0 ${isVisible ? 'text-slate-400' : 'text-slate-300'}`} />
                          <span className="truncate">{occ.documentName || '?'}</span>
                        </div>
                      </td>
                      <td className={`px-3 py-1.5 ${isVisible ? 'text-slate-500' : 'text-slate-300'}`}>{occ.period || '-'}</td>
                      <td className={`px-3 py-1.5 text-right font-medium ${isVisible ? 'text-slate-800' : 'text-slate-400'}`}>
                        {occ.value || '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="h-4" />
      </div>
    );
  }

  // === Document node selected ===
  if (selectedNode.type === 'document') {
    // Find metrics connected to this document
    const docId = selectedNode.id; // "doc_{uuid}"
    const connectedEdges = edges.filter((e) => e.source === docId);
    const connectedMetricIds = new Set(connectedEdges.map((e) => e.target));
    const connectedMetrics = nodes.filter((n) => connectedMetricIds.has(n.id));

    // Build metric-value pairs from edges
    const metricValues = connectedEdges.map((edge) => {
      const metricNode = nodes.find((n) => n.id === edge.target);
      return {
        name: metricNode?.name ?? edge.target.replace(/^metric_/, ''),
        value: edge.value ?? '-',
        period: edge.period ?? '-',
      };
    });

    const realDocId = docId.replace(/^doc_/, '');

    return (
      <div className="w-[320px] border-l border-slate-200 bg-white overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="h-4 w-4 text-slate-400 flex-shrink-0" />
            <h3 className="text-sm font-bold text-slate-800 truncate">{selectedNode.name}</h3>
          </div>
          <button onClick={close} className="rounded p-1 hover:bg-slate-100">
            <X className="h-4 w-4 text-slate-400" />
          </button>
        </div>

        {/* File info */}
        <div className="px-4 mt-3 flex items-center gap-2">
          {selectedNode.fileType && (
            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
              {selectedNode.fileType}
            </span>
          )}
          <span className="text-[11px] text-slate-400">
            지표 {connectedMetrics.length}개
          </span>
        </div>

        {/* Metric list */}
        <div className="px-4 mt-3">
          <p className="text-[11px] font-medium text-slate-500 mb-2">추출된 지표</p>
          <div className="space-y-1.5">
            {metricValues.map((mv, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 hover:bg-slate-50 cursor-pointer"
                onClick={() => {
                  const metricNode = connectedMetrics[i];
                  if (metricNode) useGraphStore.getState().selectNode(metricNode);
                }}
              >
                <div>
                  <p className="text-xs font-medium text-slate-700">{mv.name}</p>
                  <p className="text-[10px] text-slate-400">{mv.period}</p>
                </div>
                <span className="text-xs font-bold text-slate-800">{mv.value}</span>
              </div>
            ))}
            {metricValues.length === 0 && (
              <p className="text-xs text-slate-400 py-2">추출된 지표 없음</p>
            )}
          </div>
        </div>

        {/* Open document button */}
        <div className="px-4 mt-4">
          <button
            onClick={() => openViewer(realDocId)}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            문서 열기
          </button>
        </div>

        <div className="h-4" />
      </div>
    );
  }

  return null;
}
