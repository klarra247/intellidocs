'use client';

import { useRef, ReactNode } from 'react';
import { Download } from 'lucide-react';

interface TableRendererProps {
  children?: ReactNode;
}

export default function TableRenderer({ children }: TableRendererProps) {
  const tableRef = useRef<HTMLTableElement>(null);

  const handleDownloadCsv = () => {
    const table = tableRef.current;
    if (!table) return;

    const rows = table.querySelectorAll('tr');
    const csvRows: string[] = [];
    rows.forEach((row) => {
      const cells = row.querySelectorAll('th, td');
      const csvRow = Array.from(cells)
        .map((cell) => `"${cell.textContent?.replace(/"/g, '""') ?? ''}"`)
        .join(',');
      csvRows.push(csvRow);
    });

    const bom = '\uFEFF';
    const blob = new Blob([bom + csvRows.join('\n')], {
      type: 'text/csv;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `table-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="my-3 overflow-hidden rounded-lg border border-slate-200 shadow-card">
      <div className="overflow-x-auto">
        <table ref={tableRef} className="w-full text-[12px]">
          {children}
        </table>
      </div>
      <div className="flex justify-end border-t border-slate-100 bg-slate-50/80 px-3 py-1.5">
        <button
          onClick={handleDownloadCsv}
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-700"
        >
          <Download className="h-3 w-3" />
          CSV 다운로드
        </button>
      </div>
    </div>
  );
}
