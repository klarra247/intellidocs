'use client';

import { useRef, useState, useEffect, ReactNode } from 'react';
import { Download, BarChart3, Table2 } from 'lucide-react';
import ChartRenderer, { detectChartType, type TableData } from './ChartRenderer';

interface TableRendererProps {
  children?: ReactNode;
}

function extractTableData(table: HTMLTableElement): TableData | null {
  const headerCells = table.querySelectorAll('thead th');
  if (headerCells.length === 0) return null;

  const headers = Array.from(headerCells).map((c) => c.textContent?.trim() || '');
  if (headers.length < 2) return null;

  const bodyRows = table.querySelectorAll('tbody tr');
  const rows: string[][] = [];
  bodyRows.forEach((row) => {
    const cells = row.querySelectorAll('td');
    if (cells.length === 0) return;
    rows.push(Array.from(cells).map((c) => c.textContent?.trim() || ''));
  });

  if (rows.length < 2) return null;
  return { headers, rows };
}

export default function TableRenderer({ children }: TableRendererProps) {
  const tableRef = useRef<HTMLTableElement>(null);
  const [tableData, setTableData] = useState<TableData | null>(null);
  const [showChart, setShowChart] = useState(false);

  useEffect(() => {
    const table = tableRef.current;
    if (!table) return;
    setTableData(extractTableData(table));
  }, [children]);

  const chartable = tableData != null && detectChartType(tableData.headers, tableData.rows) != null;

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
      {/* Table — always in DOM, hidden when chart is shown */}
      <div className={showChart ? 'hidden' : ''}>
        <div className="overflow-x-auto">
          <table ref={tableRef} className="w-full text-[12px]">
            {children}
          </table>
        </div>
      </div>

      {/* Chart */}
      {showChart && tableData && (
        <div className="px-4 pt-3 pb-1">
          <ChartRenderer tableData={tableData} />
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/80 px-3 py-1.5">
        <div>
          {chartable && (
            <button
              onClick={() => setShowChart((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-700"
            >
              {showChart ? (
                <>
                  <Table2 className="h-3 w-3" />
                  표 보기
                </>
              ) : (
                <>
                  <BarChart3 className="h-3 w-3" />
                  차트 보기
                </>
              )}
            </button>
          )}
        </div>
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
