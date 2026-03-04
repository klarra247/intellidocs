'use client';

import { useEffect } from 'react';
import { AlertTriangle, Info, X } from 'lucide-react';
import { useDiscrepancyStore } from '@/stores/discrepancyStore';

export default function DiscrepancyAlertBanner() {
  const {
    latestAutoResult,
    alertDismissed,
    fetchAutoLatest,
    openDetail,
    dismissAlert,
  } = useDiscrepancyStore();

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
      className={`flex items-center gap-3 rounded-xl px-4 py-3 ${
        hasHighSeverity
          ? 'bg-amber-50 border border-amber-200'
          : 'bg-blue-50 border border-blue-200'
      }`}
    >
      {hasHighSeverity ? (
        <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
      ) : (
        <Info className="h-4 w-4 shrink-0 text-blue-500" />
      )}

      <p
        className={`flex-1 text-[13px] ${
          hasHighSeverity ? 'text-amber-800' : 'text-blue-800'
        }`}
      >
        {hasHighSeverity
          ? `${summary.discrepanciesFound}건의 수치 불일치가 발견되었습니다`
          : `경미한 수치 차이 ${summary.discrepanciesFound}건이 발견되었습니다`}
      </p>

      <button
        onClick={() => openDetail(latestAutoResult)}
        className={`shrink-0 text-[12px] font-medium underline underline-offset-2 ${
          hasHighSeverity
            ? 'text-amber-700 hover:text-amber-900'
            : 'text-blue-700 hover:text-blue-900'
        }`}
      >
        상세 보기
      </button>

      <button
        onClick={dismissAlert}
        className={`shrink-0 rounded-md p-1 ${
          hasHighSeverity
            ? 'text-amber-400 hover:bg-amber-100 hover:text-amber-600'
            : 'text-blue-400 hover:bg-blue-100 hover:text-blue-600'
        }`}
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
