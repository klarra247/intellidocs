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

  // --- Validation ---
  const getValidationError = (): string | null => {
    if (!title.trim()) return null; // 제목 미입력은 버튼 비활성화로 처리
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
        className="modal-backdrop absolute inset-0 bg-slate-900/30 animate-fade-in"
        onClick={() => setModalOpen(false)}
      />

      <div className="animate-scale-in relative mx-4 w-full max-w-lg rounded-2xl bg-white p-6 shadow-modal max-h-[85vh] overflow-y-auto">
        <button
          onClick={() => setModalOpen(false)}
          className="absolute right-3 top-3 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        >
          <X className="h-4 w-4" />
        </button>

        <h3 className="text-[15px] font-semibold text-slate-900">
          리포트 생성
        </h3>
        <p className="mt-1 text-[13px] text-slate-500">
          AI가 문서를 분석하여 PDF 리포트를 생성합니다
        </p>

        {/* Report Type Selection */}
        <div className="mt-5 space-y-2">
          <label className="text-[12px] font-medium text-slate-500 uppercase tracking-wide">
            리포트 유형
          </label>
          <div className="grid grid-cols-3 gap-2">
            {reportTypes.map(({ type, label, desc, icon: Icon }) => (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`flex flex-col items-center gap-1.5 rounded-xl border-2 p-3 text-center transition-all ${
                  selectedType === type
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <Icon
                  className={`h-5 w-5 ${selectedType === type ? 'text-primary-600' : 'text-slate-400'}`}
                  strokeWidth={2}
                />
                <span className={`text-[12px] font-medium ${selectedType === type ? 'text-primary-700' : 'text-slate-700'}`}>
                  {label}
                </span>
                <span className="text-[10px] text-slate-400 leading-tight">
                  {desc}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Title */}
        <div className="mt-4 space-y-1.5">
          <label className="text-[12px] font-medium text-slate-500 uppercase tracking-wide">
            리포트 제목
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
            placeholder="예: 2024년 재무 분석 리포트"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px] text-slate-900 placeholder:text-slate-400 focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-400"
          />
        </div>

        {/* Document Selection */}
        <div className="mt-4 space-y-1.5">
          <label className="text-[12px] font-medium text-slate-500 uppercase tracking-wide">
            분석 대상 문서
            {selectedType === 'COMPARISON' && (
              <span className="text-red-400 normal-case ml-1">(2개 이상 필수)</span>
            )}
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
              <p className="text-[11px] text-slate-400 mt-0.5">
                문서를 업로드하고 파싱이 완료되면 여기에 표시됩니다
              </p>
            </div>
          )}
        </div>

        {/* Custom prompt */}
        <div className="mt-4 space-y-1.5">
          <label className="text-[12px] font-medium text-slate-500 uppercase tracking-wide">
            추가 지시사항 <span className="text-slate-400 normal-case">(선택)</span>
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            maxLength={1000}
            placeholder="예: 2023년 대비 2024년 변화에 집중해서 분석해 주세요"
            rows={2}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-[13px] text-slate-900 placeholder:text-slate-400 focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-400 resize-none"
          />
        </div>

        {/* Validation Error */}
        {validationError && title.trim() && (
          <div className="mt-3 flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2">
            <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
            <p className="text-[12px] text-red-600">{validationError}</p>
          </div>
        )}

        {/* Actions */}
        <div className="mt-5 flex gap-2.5">
          <button
            ref={cancelRef}
            onClick={() => setModalOpen(false)}
            className="flex-1 rounded-lg border border-slate-200 px-4 py-2 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            취소
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="flex-1 rounded-lg bg-primary-600 px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? '생성 중...' : '리포트 생성'}
          </button>
        </div>
      </div>
    </div>
  );
}
