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
      <Handle type="target" position={Position.Top} className="!bg-slate-300 !w-2 !h-2" />
      <div
        className={`
          min-w-[130px] rounded-xl border-2 border-slate-300 bg-white px-3 py-2
          shadow-sm transition-all duration-150 cursor-pointer
          ${data.selected ? 'ring-2 ring-primary-400 ring-offset-1' : ''}
          ${data.dimmed ? 'opacity-30' : 'hover:shadow-md'}
        `}
      >
        <div className="flex items-center gap-1.5">
          <Icon className="h-3.5 w-3.5 flex-shrink-0 text-slate-500" strokeWidth={2} />
          <span className="text-xs font-medium text-slate-700 leading-tight">{label}</span>
        </div>
        {data.fileType && (
          <p className="mt-0.5 text-[10px] text-slate-400 pl-5">{data.fileType}</p>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-slate-300 !w-2 !h-2" />
    </>
  );
}

export default memo(DocumentNodeComponent);
