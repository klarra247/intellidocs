'use client';

import { useEffect, useState } from 'react';
import { X, Search, AlertCircle } from 'lucide-react';
import { useDiscrepancyStore } from '@/stores/discrepancyStore';
import { useDocumentStore } from '@/stores/documentStore';
import DiscrepancyProgressBar from './DiscrepancyProgressBar';

export default function DiscrepancyTriggerButton() {
  const {
    triggerModalOpen,
    setTriggerModalOpen,
    startDetection,
    activeJob,
  } = useDiscrepancyStore();
  const { documents } = useDocumentStore();

  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
  const [targetFields, setTargetFields] = useState('');
  const [tolerance, setTolerance] = useState(0.1);

  const indexedDocs = documents.filter((d) => d.status === 'INDEXED');
  const canStart = selectedDocs.length >= 2 && !activeJob;

  useEffect(() => {
    if (!triggerModalOpen) {
      setSelectedDocs([]);
      setTargetFields('');
      setTolerance(0.1);
    }
  }, [triggerModalOpen]);

  useEffect(() => {
    if (triggerModalOpen) {
      const handleEsc = (e: KeyboardEvent) => {
        if (e.key === 'Escape') setTriggerModalOpen(false);
      };
      document.addEventListener('keydown', handleEsc);
      return () => document.removeEventListener('keydown', handleEsc);
    }
  }, [triggerModalOpen, setTriggerModalOpen]);

  const toggleDoc = (id: string) => {
    setSelectedDocs((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id],
    );
  };

  const handleStart = () => {
    if (!canStart) return;
    const fields = targetFields
      .split(',')
      .map((f) => f.trim())
      .filter(Boolean);

    startDetection({
      documentIds: selectedDocs,
      targetFields: fields.length > 0 ? fields : undefined,
      tolerance: tolerance / 100, // UI is % → API expects decimal
    });
  };

  return (
    <>
      <button
        onClick={() => setTriggerModalOpen(true)}
        className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:border-slate-300"
      >
        <Search className="h-3.5 w-3.5" />
        수치 일관성 검사
      </button>

      {triggerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-slate-900/30 animate-fade-in"
            onClick={() => !activeJob && setTriggerModalOpen(false)}
          />

          <div className="animate-scale-in relative mx-4 w-full max-w-lg rounded-2xl bg-white p-6 shadow-modal max-h-[85vh] overflow-y-auto">
            <button
              onClick={() => !activeJob && setTriggerModalOpen(false)}
              className="absolute right-3 top-3 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>

            <h3 className="text-[15px] font-semibold text-slate-900">
              수치 일관성 검사
            </h3>
            <p className="mt-1 text-[13px] text-slate-500">
              문서 간 수치를 비교하여 불일치를 탐지합니다
            </p>

            {/* Document selection */}
            <div className="mt-5 space-y-1.5">
              <label className="text-[12px] font-medium text-slate-500 uppercase tracking-wide">
                비교 대상 문서{' '}
                <span className="text-red-400 normal-case">(2개 이상 필수)</span>
              </label>
              {indexedDocs.length > 0 ? (
                <div className="max-h-32 overflow-y-auto rounded-lg border border-slate-200 p-2 space-y-1">
                  {indexedDocs.map((doc) => (
                    <label
                      key={doc.id}
                      className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-slate-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedDocs.includes(doc.id)}
                        onChange={() => toggleDoc(doc.id)}
                        disabled={!!activeJob}
                        className="h-3.5 w-3.5 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="text-[12px] text-slate-700 truncate">
                        {doc.originalFilename}
                      </span>
                    </label>
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-slate-200 px-3 py-4 text-center">
                  <p className="text-[12px] text-slate-400">
                    분석 가능한 문서가 없습니다
                  </p>
                </div>
              )}
            </div>

            {/* Target fields */}
            <div className="mt-4 space-y-1.5">
              <label className="text-[12px] font-medium text-slate-500 uppercase tracking-wide">
                검사 항목{' '}
                <span className="text-slate-400 normal-case">(선택)</span>
              </label>
              <input
                type="text"
                value={targetFields}
                onChange={(e) => setTargetFields(e.target.value)}
                disabled={!!activeJob}
                placeholder="예: 매출, 영업이익, 부채비율 (비워두면 자동 탐색)"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px] text-slate-900 placeholder:text-slate-400 focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-400 disabled:opacity-50"
              />
            </div>

            {/* Tolerance */}
            <div className="mt-4 space-y-1.5">
              <label className="text-[12px] font-medium text-slate-500 uppercase tracking-wide">
                허용 오차
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="0.01"
                  max="10"
                  step="0.01"
                  value={tolerance}
                  onChange={(e) => setTolerance(Number(e.target.value))}
                  disabled={!!activeJob}
                  className="flex-1"
                />
                <span className="w-14 text-right text-[13px] font-mono text-slate-700">
                  {tolerance.toFixed(2)}%
                </span>
              </div>
            </div>

            {/* Validation hint */}
            {selectedDocs.length > 0 && selectedDocs.length < 2 && (
              <div className="mt-3 flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2">
                <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                <p className="text-[12px] text-red-600">
                  2개 이상의 문서를 선택해 주세요.
                </p>
              </div>
            )}

            {/* Progress */}
            {activeJob && (
              <div className="mt-4">
                <DiscrepancyProgressBar />
              </div>
            )}

            {/* Actions */}
            <div className="mt-5 flex gap-2.5">
              <button
                onClick={() => !activeJob && setTriggerModalOpen(false)}
                disabled={!!activeJob}
                className="flex-1 rounded-lg border border-slate-200 px-4 py-2 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                취소
              </button>
              <button
                onClick={handleStart}
                disabled={!canStart}
                className="flex-1 rounded-lg bg-primary-600 px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                검사 시작
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
