'use client';

import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { FileText, FileSpreadsheet, FileType2 } from 'lucide-react';

const FILE_ICONS: Record<string, typeof FileText> = {
  PDF: FileText,
  XLSX: FileSpreadsheet,
  DOCX: FileType2,
  TXT: FileText,
  MD: FileText,
};

interface DocumentNodeData {
  label: string;
  fileType?: string;
  status?: string;
  selected?: boolean;
  dimmed?: boolean;
  [key: string]: unknown;
}

function DocumentNodeComponent({ data }: NodeProps & { data: DocumentNodeData }) {
  const Icon = FILE_ICONS[data.fileType ?? ''] ?? FileText;
  const label = data.label.length > 18 ? data.label.slice(0, 17) + '...' : data.label;

  return (
    <>
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: '#d4d4d0', width: 8, height: 8 }}
      />
      <div
        style={{
          minWidth: 130,
          borderRadius: 8,
          border: data.selected ? '1px solid #2383e2' : '1px solid #e9e9e7',
          background: '#ffffff',
          boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
          padding: '6px 12px',
          cursor: 'pointer',
          transition: 'all 0.15s',
          opacity: data.dimmed ? 0.3 : 1,
          outline: data.selected ? '2px solid #2383e2' : 'none',
          outlineOffset: data.selected ? 1 : 0,
        }}
      >
        <div className="flex items-center gap-1.5">
          <Icon style={{ height: 14, width: 14, flexShrink: 0, color: '#b4b4b0' }} strokeWidth={2} />
          <span style={{ fontSize: 12, fontWeight: 500, color: '#37352f', lineHeight: 1.3 }}>{label}</span>
        </div>
        {data.fileType && (
          <p style={{ marginTop: 2, fontSize: 10, color: '#b4b4b0', paddingLeft: 20 }}>{data.fileType}</p>
        )}
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: '#d4d4d0', width: 8, height: 8 }}
      />
    </>
  );
}

export default memo(DocumentNodeComponent);
