'use client';

import { useEffect, useRef, useState } from 'react';
import { X, FileBarChart, GitCompare, FileText, AlertCircle } from 'lucide-react';
import { useReportStore } from '@/stores/reportStore';
import { useDocumentStore } from '@/stores/documentStore';
import { ReportType } from '@/lib/types';

const reportTypes: { type: ReportType; label: string; desc: string; icon: typeof FileBarChart }[] = [
  { type: 'FINANCIAL_ANALYSIS', label: '재무 분석', desc: '수익성/안정성/성장성/효율성 4축 분석', icon: FileBarChart },
  { type: 'COMPARISON', label: '비교 분석', desc: '문서 간 핵심 지표 비교', icon: GitCompare },
  { type: 'SUMMARY', label: '종합 요약', desc: '핵심 내용 종합 정리', icon: FileText },
];

export default function ReportGenerateModal() {
  const { setModalOpen, generateReport } = useReportStore();
  const { documents } = useDocumentStore();

  const [selectedType, setSelectedType] = useState<ReportType>('FINANCIAL_ANALYSIS');
  const [title, setTitle] = useState('');
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
  const [prompt, setPrompt] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [closeHover, setCloseHover] = useState(false);
  const [cancelHover, setCancelHover] = useState(false);

  const cancelRef = useRef<HTMLButtonElement>(null);

  const indexedDocs = documents.filter((d) => d.status === 'INDEXED');

  useEffect(() => {
    cancelRef.current?.focus();
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setModalOpen(false);
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [setModalOpen]);

  const getValidationError = (): string | null => {
    if (!title.trim()) return null;
    if (indexedDocs.length === 0) return '분석 가능한 문서가 없습니다. 문서를 업로드하고 파싱이 완료된 후 시도해 주세요.';
    if (selectedDocs.length === 0) return '분석할 문서를 1개 이상 선택해 주세요.';
    if (selectedType === 'COMPARISON' && selectedDocs.length < 2) return '비교 분석을 위해 2개 이상의 문서를 선택해 주세요.';
    if (title.trim().length > 200) return '리포트 제목은 200자 이하로 입력해 주세요.';
    if (prompt.length > 1000) return '추가 지시사항은 1000자 이하로 입력해 주세요.';
    return null;
  };

  const validationError = getValidationError();
  const canSubmit = title.trim().length > 0 && !validationError && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    await generateReport(
      selectedType,
      title.trim(),
      selectedDocs,
      prompt.trim() || undefined,
    );
    setSubmitting(false);
  };

  const toggleDoc = (id: string) => {
    setSelectedDocs((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id],
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="modal-backdrop absolute inset-0 animate-fade-in"
        style={{ background: 'rgba(0,0,0,0.3)' }}
        onClick={() => setModalOpen(false)}
      />

      <div
        className="animate-scale-in relative mx-4 w-full max-w-lg rounded-[12px] p-6 max-h-[85vh] overflow-y-auto"
        style={{ background: 'var(--bg-primary)', boxShadow: 'var(--shadow-lg)' }}
      >
        <button
          onClick={() => setModalOpen(false)}
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
          리포트 생성
        </h3>
        <p className="mt-1 text-[13px]" style={{ color: 'var(--text-secondary)' }}>
          AI가 문서를 분석하여 PDF 리포트를 생성합니다
        </p>

        {/* Report Type Selection */}
        <div className="mt-5 space-y-2">
          <label className="text-[12px] font-medium uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
            리포트 유형
          </label>
          <div className="grid grid-cols-3 gap-2">
            {reportTypes.map(({ type, label, desc, icon: Icon }) => (
              <ReportTypeButton
                key={type}
                selected={selectedType === type}
                onClick={() => setSelectedType(type)}
                icon={Icon}
                label={label}
                desc={desc}
              />
            ))}
          </div>
        </div>

        {/* Title */}
        <div className="mt-4 space-y-1.5">
          <label className="text-[12px] font-medium uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
            리포트 제목
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
            placeholder="예: 2024년 재무 분석 리포트"
            className="w-full rounded-[6px] px-3 py-2 text-[13px] focus:outline-none"
            style={{
              border: '1px solid var(--border)',
              color: 'var(--text-primary)',
              background: 'var(--bg-primary)',
            }}
          />
        </div>

        {/* Document Selection */}
        <div className="mt-4 space-y-1.5">
          <label className="text-[12px] font-medium uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
            분석 대상 문서
            {selectedType === 'COMPARISON' && (
              <span className="normal-case ml-1" style={{ color: 'var(--error)' }}>(2개 이상 필수)</span>
            )}
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
              <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                문서를 업로드하고 파싱이 완료되면 여기에 표시됩니다
              </p>
            </div>
          )}
        </div>

        {/* Custom prompt */}
        <div className="mt-4 space-y-1.5">
          <label className="text-[12px] font-medium uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
            추가 지시사항 <span className="normal-case" style={{ color: 'var(--text-tertiary)' }}>(선택)</span>
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            maxLength={1000}
            placeholder="예: 2023년 대비 2024년 변화에 집중해서 분석해 주세요"
            rows={2}
            className="w-full rounded-[6px] px-3 py-2 text-[13px] focus:outline-none resize-none"
            style={{
              border: '1px solid var(--border)',
              color: 'var(--text-primary)',
              background: 'var(--bg-primary)',
            }}
          />
        </div>

        {/* Validation Error */}
        {validationError && title.trim() && (
          <div
            className="mt-3 flex items-start gap-2 rounded-[6px] px-3 py-2"
            style={{ background: 'var(--bg-secondary)' }}
          >
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" style={{ color: 'var(--error)' }} />
            <p className="text-[12px]" style={{ color: 'var(--error)' }}>{validationError}</p>
          </div>
        )}

        {/* Actions */}
        <div className="mt-5 flex gap-2.5">
          <button
            ref={cancelRef}
            onClick={() => setModalOpen(false)}
            onMouseEnter={() => setCancelHover(true)}
            onMouseLeave={() => setCancelHover(false)}
            className="flex-1 rounded-[6px] px-4 py-2 text-[13px] font-medium transition-colors"
            style={{
              border: '1px solid var(--border)',
              color: 'var(--text-primary)',
              background: cancelHover ? 'var(--bg-secondary)' : 'var(--bg-primary)',
            }}
          >
            취소
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="flex-1 rounded-[6px] px-4 py-2 text-[13px] font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: 'var(--accent)',
              color: '#ffffff',
            }}
          >
            {submitting ? '생성 중...' : '리포트 생성'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ReportTypeButton({
  selected,
  onClick,
  icon: Icon,
  label,
  desc,
}: {
  selected: boolean;
  onClick: () => void;
  icon: typeof FileBarChart;
  label: string;
  desc: string;
}) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="flex flex-col items-center gap-1.5 rounded-[8px] p-3 text-center transition-all"
      style={{
        border: `2px solid ${selected ? 'var(--accent)' : hover ? 'var(--border-strong)' : 'var(--border)'}`,
        background: selected ? 'var(--accent-light)' : hover ? 'var(--bg-secondary)' : 'var(--bg-primary)',
      }}
    >
      <Icon
        className="h-5 w-5"
        style={{ color: selected ? 'var(--accent)' : 'var(--text-tertiary)' }}
        strokeWidth={2}
      />
      <span
        className="text-[12px] font-medium"
        style={{ color: selected ? 'var(--accent)' : 'var(--text-primary)' }}
      >
        {label}
      </span>
      <span className="text-[10px] leading-tight" style={{ color: 'var(--text-tertiary)' }}>
        {desc}
      </span>
    </button>
  );
}

function DocCheckboxLabel({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: () => void;
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
        className="h-3.5 w-3.5 rounded"
        style={{ accentColor: 'var(--accent)' }}
      />
      <span className="text-[12px] truncate" style={{ color: 'var(--text-primary)' }}>
        {label}
      </span>
    </label>
  );
}
