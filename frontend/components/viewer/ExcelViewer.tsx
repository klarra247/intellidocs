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
        <p className="text-[13px]" style={{ color: 'var(--text-tertiary)' }}>이 시트에 데이터가 없습니다</p>
      </div>
    );
  }

  return (
    <div className="h-full w-full overflow-auto">
      <table className="excel-table w-full border-collapse text-[12px]">
        <thead>
          <tr className="sticky top-0 z-10" style={{ backgroundColor: 'var(--bg-secondary)' }}>
            {/* Row number column header */}
            <th
              className="w-10 px-2 py-2 text-right text-[11px] font-semibold"
              style={{
                borderBottom: '1px solid var(--border)',
                borderRight: '1px solid var(--border)',
                color: 'var(--text-tertiary)',
              }}
            >
              #
            </th>
            {sheet.headers.map((header, i) => (
              <th
                key={i}
                className="min-w-[120px] px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider"
                style={{
                  borderBottom: '1px solid var(--border)',
                  color: 'var(--text-secondary)',
                }}
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
              style={rowIdx % 2 === 1 ? { backgroundColor: 'color-mix(in srgb, var(--bg-secondary) 50%, transparent)' } : undefined}
            >
              {/* Row number */}
              <td
                className="w-10 pr-2 text-right text-xs"
                style={{ borderRight: '1px solid var(--border)', color: 'var(--text-tertiary)' }}
              >
                {rowIdx + 1}
              </td>
              {row.map((cell, cellIdx) => (
                <td
                  key={cellIdx}
                  className="min-w-[120px] px-3 py-2"
                  style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-primary)' }}
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
        <div
          className="px-4 py-3 text-center text-[12px]"
          style={{
            borderTop: '1px solid var(--border)',
            backgroundColor: 'var(--bg-secondary)',
            color: 'var(--text-secondary)',
          }}
        >
          {sheet.truncatedRows && (
            <p>
              전체 {sheet.totalRows}행 중 {sheet.rows.length}행만 표시됩니다
            </p>
          )}
          {sheet.truncatedCols && (
            <p>
              전체 {sheet.totalCols}열 중 {sheet.headers.length}열만 표시됩니다
            </p>
          )}
        </div>
      )}
    </div>
  );
}
