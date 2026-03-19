'use client';

import { useState } from 'react';
import { AlertTriangle, Info, X } from 'lucide-react';
import { useDiscrepancyStore } from '@/stores/discrepancyStore';
import { useEffect } from 'react';

export default function DiscrepancyAlertBanner() {
  const {
    latestAutoResult,
    alertDismissed,
    fetchAutoLatest,
    openDetail,
    dismissAlert,
  } = useDiscrepancyStore();

  const [detailHover, setDetailHover] = useState(false);
  const [dismissHover, setDismissHover] = useState(false);

  useEffect(() => {
    fetchAutoLatest();
  }, [fetchAutoLatest]);

  if (!latestAutoResult || alertDismissed) return null;

  const summary = latestAutoResult.resultData?.summary;
  if (!summary || summary.discrepanciesFound === 0) return null;

  const hasHighSeverity =
    (summary.bySeverity['WARNING'] ?? 0) > 0 ||
    (summary.bySeverity['CRITICAL'] ?? 0) > 0;

  return (
    <div
      className="flex items-center gap-3 rounded-[8px] px-4 py-3"
      style={{
        background: hasHighSeverity ? 'var(--bg-secondary)' : 'var(--accent-light)',
        border: `1px solid ${hasHighSeverity ? 'var(--warning)' : 'var(--accent)'}`,
      }}
    >
      {hasHighSeverity ? (
        <AlertTriangle className="h-4 w-4 shrink-0" style={{ color: 'var(--warning)' }} />
      ) : (
        <Info className="h-4 w-4 shrink-0" style={{ color: 'var(--accent)' }} />
      )}

      <p
        className="flex-1 text-[13px]"
        style={{ color: hasHighSeverity ? 'var(--text-primary)' : 'var(--accent)' }}
      >
        {hasHighSeverity
          ? `${summary.discrepanciesFound}건의 수치 불일치가 발견되었습니다`
          : `경미한 수치 차이 ${summary.discrepanciesFound}건이 발견되었습니다`}
      </p>

      <button
        onClick={() => openDetail(latestAutoResult)}
        onMouseEnter={() => setDetailHover(true)}
        onMouseLeave={() => setDetailHover(false)}
        className="shrink-0 text-[12px] font-medium underline underline-offset-2"
        style={{
          color: hasHighSeverity
            ? detailHover ? 'var(--text-primary)' : 'var(--warning)'
            : detailHover ? 'var(--accent-hover)' : 'var(--accent)',
        }}
      >
        상세 보기
      </button>

      <button
        onClick={dismissAlert}
        onMouseEnter={() => setDismissHover(true)}
        onMouseLeave={() => setDismissHover(false)}
        className="shrink-0 rounded-[6px] p-1"
        style={{
          color: hasHighSeverity
            ? dismissHover ? 'var(--warning)' : 'var(--text-tertiary)'
            : dismissHover ? 'var(--accent)' : 'var(--text-tertiary)',
          background: dismissHover
            ? hasHighSeverity ? 'var(--bg-hover)' : 'var(--accent-light)'
            : 'transparent',
        }}
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
