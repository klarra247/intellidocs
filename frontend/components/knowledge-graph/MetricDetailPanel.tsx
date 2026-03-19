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
      <div
        style={{
          width: 320,
          borderLeft: '1px solid #e9e9e7',
          background: '#ffffff',
          overflowY: 'auto',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #e9e9e7',
            padding: '12px 16px',
          }}
        >
          <h3 style={{ fontSize: 14, fontWeight: 700, color: '#37352f' }}>{selectedNode.name}</h3>
          <button
            onClick={close}
            style={{ borderRadius: 4, padding: 4, cursor: 'pointer', border: 'none', background: 'transparent' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#f0f0ee')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <X style={{ height: 16, width: 16, color: '#b4b4b0' }} />
          </button>
        </div>

        {/* Change summary */}
        {change && (
          <div
            style={{
              margin: '12px 16px 0',
              borderRadius: 8,
              padding: '8px 12px',
              textAlign: 'center',
              background: '#f7f7f5',
            }}
          >
            <div className="flex items-center justify-center gap-1.5">
              {change.direction === 'increase' ? (
                <TrendingUp style={{ height: 16, width: 16, color: '#4dab9a' }} />
              ) : change.direction === 'decrease' ? (
                <TrendingDown style={{ height: 16, width: 16, color: '#e03e3e' }} />
              ) : null}
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: change.direction === 'increase' ? '#4dab9a' : change.direction === 'decrease' ? '#e03e3e' : '#37352f',
                }}
              >
                {change.from} → {change.to}
                {change.changePercent != null && (
                  <span style={{ marginLeft: 4, fontSize: 12, fontWeight: 500 }}>
                    ({change.changePercent > 0 ? '+' : ''}{change.changePercent}%)
                  </span>
                )}
              </span>
            </div>
          </div>
        )}

        {/* Occurrences table */}
        <div style={{ padding: '12px 16px 0' }}>
          <p style={{ fontSize: 11, fontWeight: 500, color: '#787774', marginBottom: 8 }}>문서별 값</p>
          <div style={{ borderRadius: 8, border: '1px solid #e9e9e7', overflow: 'hidden' }}>
            <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f7f7f5' }}>
                  <th style={{ padding: '6px 12px', textAlign: 'left', fontWeight: 500, color: '#787774' }}>문서</th>
                  <th style={{ padding: '6px 12px', textAlign: 'left', fontWeight: 500, color: '#787774' }}>기간</th>
                  <th style={{ padding: '6px 12px', textAlign: 'right', fontWeight: 500, color: '#787774' }}>값</th>
                </tr>
              </thead>
              <tbody>
                {occurrences.map((occ, i) => {
                  const isVisible = visibleDocIds.has(occ.documentId);
                  return (
                    <tr
                      key={i}
                      style={{
                        borderTop: '1px solid #e9e9e7',
                        cursor: 'pointer',
                        opacity: isVisible ? 1 : 0.4,
                        transition: 'background 0.1s',
                      }}
                      onMouseEnter={(e) => { if (isVisible) (e.currentTarget as HTMLTableRowElement).style.background = '#f0f0ee'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'; }}
                      onClick={() => {
                        if (occ.documentId) {
                          const highlight = occ.pageNumber
                            ? { chunkIndex: 0, pageNumber: occ.pageNumber, sectionTitle: null }
                            : undefined;
                          openViewer(occ.documentId, highlight);
                        }
                      }}
                    >
                      <td style={{ padding: '6px 12px', maxWidth: 120, color: isVisible ? '#37352f' : '#b4b4b0' }}>
                        <div className="flex items-center gap-1">
                          <FileText style={{ height: 12, width: 12, flexShrink: 0, color: isVisible ? '#b4b4b0' : '#d4d4d0' }} />
                          <span className="truncate">{occ.documentName || '?'}</span>
                        </div>
                      </td>
                      <td style={{ padding: '6px 12px', color: isVisible ? '#787774' : '#b4b4b0' }}>{occ.period || '-'}</td>
                      <td style={{ padding: '6px 12px', textAlign: 'right', fontWeight: 500, color: isVisible ? '#37352f' : '#b4b4b0' }}>
                        {occ.value || '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ height: 16 }} />
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
      <div
        style={{
          width: 320,
          borderLeft: '1px solid #e9e9e7',
          background: '#ffffff',
          overflowY: 'auto',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #e9e9e7',
            padding: '12px 16px',
          }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <FileText style={{ height: 16, width: 16, color: '#b4b4b0', flexShrink: 0 }} />
            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#37352f' }} className="truncate">{selectedNode.name}</h3>
          </div>
          <button
            onClick={close}
            style={{ borderRadius: 4, padding: 4, cursor: 'pointer', border: 'none', background: 'transparent' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#f0f0ee')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <X style={{ height: 16, width: 16, color: '#b4b4b0' }} />
          </button>
        </div>

        {/* File info */}
        <div className="px-4 mt-3 flex items-center gap-2">
          {selectedNode.fileType && (
            <span
              style={{
                borderRadius: 4,
                background: '#f7f7f5',
                padding: '2px 6px',
                fontSize: 10,
                fontWeight: 500,
                color: '#787774',
                border: '1px solid #e9e9e7',
              }}
            >
              {selectedNode.fileType}
            </span>
          )}
          <span style={{ fontSize: 11, color: '#b4b4b0' }}>
            지표 {connectedMetrics.length}개
          </span>
        </div>

        {/* Metric list */}
        <div style={{ padding: '12px 16px 0' }}>
          <p style={{ fontSize: 11, fontWeight: 500, color: '#787774', marginBottom: 8 }}>추출된 지표</p>
          <div className="space-y-1.5">
            {metricValues.map((mv, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderRadius: 8,
                  border: '1px solid #e9e9e7',
                  padding: '8px 12px',
                  cursor: 'pointer',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#f0f0ee')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                onClick={() => {
                  const metricNode = connectedMetrics[i];
                  if (metricNode) useGraphStore.getState().selectNode(metricNode);
                }}
              >
                <div>
                  <p style={{ fontSize: 12, fontWeight: 500, color: '#37352f' }}>{mv.name}</p>
                  <p style={{ fontSize: 10, color: '#b4b4b0' }}>{mv.period}</p>
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#37352f' }}>{mv.value}</span>
              </div>
            ))}
            {metricValues.length === 0 && (
              <p style={{ fontSize: 12, color: '#b4b4b0', padding: '8px 0' }}>추출된 지표 없음</p>
            )}
          </div>
        </div>

        {/* Open document button */}
        <div style={{ padding: '16px 16px 0' }}>
          <button
            onClick={() => openViewer(realDocId)}
            style={{
              display: 'flex',
              width: '100%',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              borderRadius: 8,
              border: '1px solid #e9e9e7',
              padding: '8px 12px',
              fontSize: 12,
              fontWeight: 500,
              color: '#787774',
              background: 'transparent',
              cursor: 'pointer',
              transition: 'background 0.1s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#f0f0ee')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <ExternalLink style={{ height: 14, width: 14 }} />
            문서 열기
          </button>
        </div>

        <div style={{ height: 16 }} />
      </div>
    );
  }

  return null;
}
