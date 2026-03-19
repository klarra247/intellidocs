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
  const [btnHover, setBtnHover] = useState(false);
  const [closeHover, setCloseHover] = useState(false);
  const [cancelHover, setCancelHover] = useState(false);

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
      tolerance: tolerance / 100,
    });
  };

  return (
    <>
      <button
        onClick={() => setTriggerModalOpen(true)}
        onMouseEnter={() => setBtnHover(true)}
        onMouseLeave={() => setBtnHover(false)}
        className="flex items-center gap-1.5 rounded-[6px] px-3 py-1.5 text-[13px] font-medium transition-colors"
        style={{
          border: `1px solid ${btnHover ? 'var(--border-strong)' : 'var(--border)'}`,
          background: btnHover ? 'var(--bg-secondary)' : 'var(--bg-primary)',
          color: 'var(--text-primary)',
        }}
      >
        <Search className="h-3.5 w-3.5" />
        수치 일관성 검사
      </button>

      {triggerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 animate-fade-in"
            style={{ background: 'rgba(0,0,0,0.3)' }}
            onClick={() => !activeJob && setTriggerModalOpen(false)}
          />

          <div
            className="animate-scale-in relative mx-4 w-full max-w-lg rounded-[12px] p-6 max-h-[85vh] overflow-y-auto"
            style={{ background: 'var(--bg-primary)', boxShadow: 'var(--shadow-lg)' }}
          >
            <button
              onClick={() => !activeJob && setTriggerModalOpen(false)}
              onMouseEnter={() => setCloseHover(true)}
              onMouseLeave={() => setCloseHover(false)}
              className="absolute right-3 top-3 rounded-[6px] p-1.5"
              style={{
                color: closeHover ? 'var(--text-secondary)' : 'var(--text-tertiary)',
                background: closeHover ? 'var(--bg-hover)' : 'transparent',
              }}
            >
              <X className="h-4 w-4" />
            </button>

            <h3 className="text-[15px] font-semibold" style={{ color: 'var(--text-primary)' }}>
              수치 일관성 검사
            </h3>
            <p className="mt-1 text-[13px]" style={{ color: 'var(--text-secondary)' }}>
              문서 간 수치를 비교하여 불일치를 탐지합니다
            </p>

            {/* Document selection */}
            <div className="mt-5 space-y-1.5">
              <label className="text-[12px] font-medium uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
                비교 대상 문서{' '}
                <span className="normal-case" style={{ color: 'var(--error)' }}>(2개 이상 필수)</span>
              </label>
              {indexedDocs.length > 0 ? (
                <div
                  className="max-h-32 overflow-y-auto rounded-[6px] p-2 space-y-1"
                  style={{ border: '1px solid var(--border)' }}
                >
                  {indexedDocs.map((doc) => (
                    <DocCheckboxLabel
                      key={doc.id}
                      checked={selectedDocs.includes(doc.id)}
                      onChange={() => toggleDoc(doc.id)}
                      disabled={!!activeJob}
                      label={doc.originalFilename}
                    />
                  ))}
                </div>
              ) : (
                <div
                  className="rounded-[6px] px-3 py-4 text-center"
                  style={{ border: '1px dashed var(--border)' }}
                >
                  <p className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>
                    분석 가능한 문서가 없습니다
                  </p>
                </div>
              )}
            </div>

            {/* Target fields */}
            <div className="mt-4 space-y-1.5">
              <label className="text-[12px] font-medium uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
                검사 항목{' '}
                <span className="normal-case" style={{ color: 'var(--text-tertiary)' }}>(선택)</span>
              </label>
              <input
                type="text"
                value={targetFields}
                onChange={(e) => setTargetFields(e.target.value)}
                disabled={!!activeJob}
                placeholder="예: 매출, 영업이익, 부채비율 (비워두면 자동 탐색)"
                className="w-full rounded-[6px] px-3 py-2 text-[13px] focus:outline-none disabled:opacity-50"
                style={{
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                  background: 'var(--bg-primary)',
                }}
              />
            </div>

            {/* Tolerance */}
            <div className="mt-4 space-y-1.5">
              <label className="text-[12px] font-medium uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
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
                <span className="w-14 text-right text-[13px] font-mono" style={{ color: 'var(--text-primary)' }}>
                  {tolerance.toFixed(2)}%
                </span>
              </div>
            </div>

            {/* Validation hint */}
            {selectedDocs.length > 0 && selectedDocs.length < 2 && (
              <div
                className="mt-3 flex items-start gap-2 rounded-[6px] px-3 py-2"
                style={{ background: 'var(--bg-secondary)' }}
              >
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" style={{ color: 'var(--error)' }} />
                <p className="text-[12px]" style={{ color: 'var(--error)' }}>
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
                onMouseEnter={() => setCancelHover(true)}
                onMouseLeave={() => setCancelHover(false)}
                className="flex-1 rounded-[6px] px-4 py-2 text-[13px] font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                  background: cancelHover && !activeJob ? 'var(--bg-secondary)' : 'var(--bg-primary)',
                }}
              >
                취소
              </button>
              <button
                onClick={handleStart}
                disabled={!canStart}
                className="flex-1 rounded-[6px] px-4 py-2 text-[13px] font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: 'var(--accent)',
                  color: '#ffffff',
                }}
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

function DocCheckboxLabel({
  checked,
  onChange,
  disabled,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  disabled: boolean;
  label: string;
}) {
  const [hover, setHover] = useState(false);
  return (
    <label
      className="flex items-center gap-2 rounded-[6px] px-2 py-1.5 cursor-pointer"
      style={{ background: hover ? 'var(--bg-hover)' : 'transparent' }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className="h-3.5 w-3.5 rounded"
        style={{ accentColor: 'var(--accent)' }}
      />
      <span className="text-[12px] truncate" style={{ color: 'var(--text-primary)' }}>
        {label}
      </span>
    </label>
  );
}
