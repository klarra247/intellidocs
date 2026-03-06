'use client';

import { useViewerStore } from '@/stores/viewerStore';

export default function ExcelViewer() {
  const previewData = useViewerStore((s) => s.previewData);
  const activeSheet = useViewerStore((s) => s.activeSheet);

  if (!previewData) return null;

  const sheet = previewData.sheets[activeSheet];
  if (!sheet) return null;

  if (sheet.rows.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-[13px] text-slate-400">이 시트에 데이터가 없습니다</p>
      </div>
    );
  }

  return (
    <div className="h-full w-full overflow-auto">
      <table className="excel-table w-full border-collapse text-[12px]">
        <thead>
          <tr className="sticky top-0 z-10 bg-slate-100">
            {/* Row number column header */}
            <th className="w-10 border-b border-r border-slate-200 px-2 py-2 text-right text-[11px] font-semibold text-slate-400">
              #
            </th>
            {sheet.headers.map((header, i) => (
              <th
                key={i}
                className="min-w-[120px] border-b border-slate-200 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-600"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sheet.rows.map((row, rowIdx) => (
            <tr
              key={rowIdx}
              className={rowIdx % 2 === 1 ? 'bg-slate-50/50' : ''}
            >
              {/* Row number */}
              <td className="w-10 border-r border-slate-100 pr-2 text-right text-xs text-slate-400">
                {rowIdx + 1}
              </td>
              {row.map((cell, cellIdx) => (
                <td
                  key={cellIdx}
                  className="min-w-[120px] border-b border-slate-100 px-3 py-2 text-slate-700"
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Truncation notices */}
      {(sheet.truncatedRows || sheet.truncatedCols) && (
        <div className="border-t border-slate-200 bg-slate-50 px-4 py-3 text-center text-[12px] text-slate-500">
          {sheet.truncatedRows && (
            <p>
              ... 외 {sheet.totalRows - sheet.rows.length}행이 더 있습니다
            </p>
          )}
          {sheet.truncatedCols && (
            <p>
              ... 외 {sheet.totalCols - sheet.headers.length}열이 더 있습니다
            </p>
          )}
        </div>
      )}
    </div>
  );
}
