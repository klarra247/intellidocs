'use client';

import { useState } from 'react';
import {
  X,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
} from 'lucide-react';
import { useDiscrepancyStore } from '@/stores/discrepancyStore';
import DiscrepancySeverityBadge from './DiscrepancySeverityBadge';
import { DiscrepancySeverity } from '@/lib/types';

export default function DiscrepancyDetailPanel() {
  const { detailOpen, detailResult, closeDetail } = useDiscrepancyStore();
  const [showAll, setShowAll] = useState(false);
  const [matchedOpen, setMatchedOpen] = useState(false);

  if (!detailOpen || !detailResult) return null;

  const data = detailResult.resultData;

  // Handle case where result has no data yet (shouldn't happen if opened after COMPLETED)
  if (!data) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div
          className="absolute inset-0 bg-slate-900/30 animate-fade-in"
          onClick={closeDetail}
        />
        <div className="animate-scale-in relative mx-4 w-full max-w-2xl rounded-2xl bg-white p-6 shadow-modal">
          <p className="text-[13px] text-slate-500">결과를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  const { discrepancies, summary, checkedFields } = data;
  const matchedCount = checkedFields.length - discrepancies.length;
  const visibleDiscrepancies = showAll
    ? discrepancies
    : discrepancies.slice(0, 5);
  const hasMore = discrepancies.length > 5;

  const noDiscrepancies = discrepancies.length === 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-slate-900/30 animate-fade-in"
        onClick={closeDetail}
      />

      <div className="animate-scale-in relative mx-4 w-full max-w-2xl rounded-2xl bg-white shadow-modal max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h3 className="text-[15px] font-semibold text-slate-900">
              수치 일관성 검사 결과
            </h3>
            <p className="mt-0.5 text-[12px] text-slate-400">
              {new Date(detailResult.createdAt).toLocaleString('ko-KR')}
            </p>
          </div>
          <button
            onClick={closeDetail}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          {/* Zero discrepancies */}
          {noDiscrepancies && (
            <div className="flex items-center gap-3 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-4">
              <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
              <div>
                <p className="text-[14px] font-medium text-emerald-800">
                  모든 항목이 일치합니다
                </p>
                <p className="text-[12px] text-emerald-600 mt-0.5">
                  {summary.totalFieldsChecked}개 항목을 검사했으며, 허용 오차
                  범위 내에서 모두 일치합니다.
                </p>
              </div>
            </div>
          )}

          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-3">
            <SummaryCard
              label="검사 항목"
              value={summary.totalFieldsChecked}
              color="slate"
            />
            <SummaryCard
              label="불일치"
              value={summary.discrepanciesFound}
              color={summary.discrepanciesFound > 0 ? 'red' : 'emerald'}
            />
            <div className="rounded-xl border border-slate-200 px-3 py-2.5">
              <p className="text-[11px] text-slate-400 font-medium">
                심각도별
              </p>
              <div className="mt-1.5 flex items-center gap-1.5">
                {(['CRITICAL', 'WARNING', 'INFO'] as const).map((sev) => {
                  const count = summary.bySeverity[sev] ?? 0;
                  if (count === 0) return null;
                  return (
                    <span key={sev} className="flex items-center gap-0.5">
                      <DiscrepancySeverityBadge severity={sev} />
                      <span className="text-[11px] text-slate-500">
                        {count}
                      </span>
                    </span>
                  );
                })}
                {summary.discrepanciesFound === 0 && (
                  <span className="text-[12px] text-slate-400">-</span>
                )}
              </div>
            </div>
          </div>

          {/* Discrepancy list */}
          {discrepancies.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-[12px] font-medium text-slate-500 uppercase tracking-wide">
                불일치 항목
              </h4>
              {visibleDiscrepancies.map((d, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-slate-200 p-4 space-y-3"
                >
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-3.5 w-3.5 text-slate-400" />
                    <span className="text-[13px] font-medium text-slate-800">
                      {d.field}
                    </span>
                    {d.period && d.period !== 'N/A' && (
                      <span className="text-[11px] text-slate-400">
                        ({d.period})
                      </span>
                    )}
                    <DiscrepancySeverityBadge
                      severity={d.severity as DiscrepancySeverity}
                    />
                  </div>

                  {/* Entry table */}
                  <div className="overflow-hidden rounded-lg border border-slate-100">
                    <table className="w-full text-[12px]">
                      <thead>
                        <tr className="bg-slate-50 text-slate-500">
                          <th className="px-3 py-1.5 text-left font-medium">
                            파일명
                          </th>
                          <th className="px-3 py-1.5 text-right font-medium">
                            수치
                          </th>
                          <th className="px-3 py-1.5 text-right font-medium">
                            페이지
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {d.entries.map((entry, j) => (
                          <tr
                            key={j}
                            className="border-t border-slate-100 text-slate-700"
                          >
                            <td className="px-3 py-1.5 truncate max-w-[200px]">
                              {entry.filename}
                            </td>
                            <td className="px-3 py-1.5 text-right font-mono">
                              {entry.value}
                            </td>
                            <td className="px-3 py-1.5 text-right text-slate-400">
                              {entry.page ?? '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <p className="text-[12px] text-slate-500">
                    차이:{' '}
                    <span className="font-medium text-slate-700">
                      {d.difference} ({d.differencePercent.toFixed(2)}%)
                    </span>
                  </p>
                </div>
              ))}

              {hasMore && (
                <button
                  onClick={() => setShowAll(!showAll)}
                  className="w-full rounded-lg border border-slate-200 py-2 text-[12px] font-medium text-slate-500 hover:bg-slate-50 transition-colors"
                >
                  {showAll
                    ? '접기'
                    : `${discrepancies.length - 5}건 더 보기`}
                </button>
              )}
            </div>
          )}

          {/* Matched fields (collapsible) */}
          {matchedCount > 0 && (
            <div>
              <button
                onClick={() => setMatchedOpen(!matchedOpen)}
                className="flex w-full items-center gap-2 text-[12px] font-medium text-slate-400 hover:text-slate-600"
              >
                {matchedOpen ? (
                  <ChevronUp className="h-3.5 w-3.5" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5" />
                )}
                일치 항목 ({matchedCount}건)
              </button>
              {matchedOpen && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {checkedFields
                    .filter(
                      (f) => !discrepancies.some((d) => d.field === f),
                    )
                    .map((field) => (
                      <span
                        key={field}
                        className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] text-emerald-700"
                      >
                        <CheckCircle2 className="h-3 w-3" />
                        {field}
                      </span>
                    ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: 'slate' | 'red' | 'emerald';
}) {
  const valueColors = {
    slate: 'text-slate-900',
    red: 'text-red-600',
    emerald: 'text-emerald-600',
  };

  return (
    <div className="rounded-xl border border-slate-200 px-3 py-2.5">
      <p className="text-[11px] text-slate-400 font-medium">{label}</p>
      <p className={`mt-0.5 text-lg font-bold ${valueColors[color]}`}>
        {value}
      </p>
    </div>
  );
}
