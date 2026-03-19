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
  const [closeHover, setCloseHover] = useState(false);
  const [showMoreHover, setShowMoreHover] = useState(false);
  const [matchBtnHover, setMatchBtnHover] = useState(false);

  if (!detailOpen || !detailResult) return null;

  const data = detailResult.resultData;

  if (!data) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div
          className="absolute inset-0 animate-fade-in"
          style={{ background: 'rgba(0,0,0,0.3)' }}
          onClick={closeDetail}
        />
        <div
          className="animate-scale-in relative mx-4 w-full max-w-2xl rounded-[12px] p-6"
          style={{ background: 'var(--bg-primary)', boxShadow: 'var(--shadow-lg)' }}
        >
          <p className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>결과를 불러오는 중...</p>
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
        className="absolute inset-0 animate-fade-in"
        style={{ background: 'rgba(0,0,0,0.3)' }}
        onClick={closeDetail}
      />

      <div
        className="animate-scale-in relative mx-4 w-full max-w-2xl rounded-[12px] max-h-[85vh] flex flex-col"
        style={{ background: 'var(--bg-primary)', boxShadow: 'var(--shadow-lg)' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <div>
            <h3 className="text-[15px] font-semibold" style={{ color: 'var(--text-primary)' }}>
              수치 일관성 검사 결과
            </h3>
            <p className="mt-0.5 text-[12px]" style={{ color: 'var(--text-tertiary)' }}>
              {new Date(detailResult.createdAt).toLocaleString('ko-KR')}
            </p>
          </div>
          <button
            onClick={closeDetail}
            onMouseEnter={() => setCloseHover(true)}
            onMouseLeave={() => setCloseHover(false)}
            className="rounded-[6px] p-1.5"
            style={{
              color: closeHover ? 'var(--text-secondary)' : 'var(--text-tertiary)',
              background: closeHover ? 'var(--bg-hover)' : 'transparent',
            }}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          {/* Zero discrepancies */}
          {noDiscrepancies && (
            <div
              className="flex items-center gap-3 rounded-[8px] px-4 py-4"
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--success)',
              }}
            >
              <CheckCircle2 className="h-5 w-5 shrink-0" style={{ color: 'var(--success)' }} />
              <div>
                <p className="text-[14px] font-medium" style={{ color: 'var(--text-primary)' }}>
                  모든 항목이 일치합니다
                </p>
                <p className="text-[12px] mt-0.5" style={{ color: 'var(--success)' }}>
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
              color="default"
            />
            <SummaryCard
              label="불일치"
              value={summary.discrepanciesFound}
              color={summary.discrepanciesFound > 0 ? 'error' : 'success'}
            />
            <div
              className="rounded-[8px] px-3 py-2.5"
              style={{ border: '1px solid var(--border)' }}
            >
              <p className="text-[11px] font-medium" style={{ color: 'var(--text-tertiary)' }}>
                심각도별
              </p>
              <div className="mt-1.5 flex items-center gap-1.5">
                {(['CRITICAL', 'WARNING', 'INFO'] as const).map((sev) => {
                  const count = summary.bySeverity[sev] ?? 0;
                  if (count === 0) return null;
                  return (
                    <span key={sev} className="flex items-center gap-0.5">
                      <DiscrepancySeverityBadge severity={sev} />
                      <span className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                        {count}
                      </span>
                    </span>
                  );
                })}
                {summary.discrepanciesFound === 0 && (
                  <span className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>-</span>
                )}
              </div>
            </div>
          </div>

          {/* Discrepancy list */}
          {discrepancies.length > 0 && (
            <div className="space-y-3">
              <h4
                className="text-[12px] font-medium uppercase tracking-wide"
                style={{ color: 'var(--text-secondary)' }}
              >
                불일치 항목
              </h4>
              {visibleDiscrepancies.map((d, i) => (
                <div
                  key={i}
                  className="rounded-[8px] p-4 space-y-3"
                  style={{ border: '1px solid var(--border)' }}
                >
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-3.5 w-3.5" style={{ color: 'var(--text-tertiary)' }} />
                    <span className="text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>
                      {d.field}
                    </span>
                    {d.period && d.period !== 'N/A' && (
                      <span className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
                        ({d.period})
                      </span>
                    )}
                    <DiscrepancySeverityBadge
                      severity={d.severity as DiscrepancySeverity}
                    />
                  </div>

                  {/* Entry table */}
                  <div
                    className="overflow-hidden rounded-[6px]"
                    style={{ border: '1px solid var(--border)' }}
                  >
                    <table className="w-full text-[12px]">
                      <thead>
                        <tr style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
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
                            style={{
                              borderTop: '1px solid var(--border)',
                              color: 'var(--text-primary)',
                            }}
                          >
                            <td className="px-3 py-1.5 truncate max-w-[200px]">
                              {entry.filename}
                            </td>
                            <td className="px-3 py-1.5 text-right font-mono">
                              {entry.value}
                            </td>
                            <td
                              className="px-3 py-1.5 text-right"
                              style={{ color: 'var(--text-tertiary)' }}
                            >
                              {entry.page ?? '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <p className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>
                    차이:{' '}
                    <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                      {d.difference} ({d.differencePercent.toFixed(2)}%)
                    </span>
                  </p>
                </div>
              ))}

              {hasMore && (
                <button
                  onClick={() => setShowAll(!showAll)}
                  onMouseEnter={() => setShowMoreHover(true)}
                  onMouseLeave={() => setShowMoreHover(false)}
                  className="w-full rounded-[6px] py-2 text-[12px] font-medium transition-colors"
                  style={{
                    border: '1px solid var(--border)',
                    color: 'var(--text-secondary)',
                    background: showMoreHover ? 'var(--bg-secondary)' : 'var(--bg-primary)',
                  }}
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
                onMouseEnter={() => setMatchBtnHover(true)}
                onMouseLeave={() => setMatchBtnHover(false)}
                className="flex w-full items-center gap-2 text-[12px] font-medium"
                style={{
                  color: matchBtnHover ? 'var(--text-secondary)' : 'var(--text-tertiary)',
                }}
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
                        className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px]"
                        style={{ background: 'var(--bg-secondary)', color: 'var(--success)' }}
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
  color: 'default' | 'error' | 'success';
}) {
  const valueColorMap = {
    default: 'var(--text-primary)',
    error: 'var(--error)',
    success: 'var(--success)',
  };

  return (
    <div
      className="rounded-[8px] px-3 py-2.5"
      style={{ border: '1px solid var(--border)' }}
    >
      <p className="text-[11px] font-medium" style={{ color: 'var(--text-tertiary)' }}>{label}</p>
      <p className="mt-0.5 text-lg font-bold" style={{ color: valueColorMap[color] }}>
        {value}
      </p>
    </div>
  );
}
