'use client';

import { useState } from 'react';
import { X, ArrowRight, BarChart3, FileEdit } from 'lucide-react';
import { useVersionStore } from '@/stores/versionStore';
import { useViewerStore } from '@/stores/viewerStore';
import DiffSummaryCard from './DiffSummaryCard';
import NumericChangesTable from './NumericChangesTable';
import TextChangesList from './TextChangesList';
import type { NumericChange, TextChange } from '@/lib/types';

type DiffTab = 'numeric' | 'text';

export default function DiffViewer() {
  const { currentDiff, clearDiff } = useVersionStore();
  const [activeTab, setActiveTab] = useState<DiffTab>('numeric');

  if (!currentDiff) return null;

  const data = currentDiff.resultData;

  const handleNumericClick = (change: NumericChange) => {
    const targetDocId = currentDiff.targetDocumentId;
    // Open viewer without highlight (avoid hardcoded chunkIndex: 0),
    // then navigate to correct page + show diff compare bar
    useViewerStore.getState().openViewer(targetDocId).then(() => {
      const store = useViewerStore.getState();
      if (change.targetPageNumber != null) {
        store.setCurrentPage(change.targetPageNumber);
      }
      store.setDiffCompare({
        field: change.field,
        sourceValue: change.sourceValue,
        targetValue: change.targetValue,
      });
    });
  };

  const handleTextClick = (change: TextChange) => {
    const targetDocId = currentDiff.targetDocumentId;
    useViewerStore.getState().openViewer(targetDocId).then(() => {
      if (change.targetPageNumber != null) {
        useViewerStore.getState().setCurrentPage(change.targetPageNumber);
      }
    });
  };

  if (!data) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-slate-900/30 animate-fade-in" onClick={clearDiff} />
        <div className="animate-scale-in relative mx-4 w-full max-w-3xl rounded-2xl bg-white p-6 shadow-modal">
          <p className="text-[13px] text-slate-500">결과를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  const { numericChanges, textChanges, summary, metadata } = data;
  const noChanges = numericChanges.length === 0 && textChanges.length === 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-slate-900/30 animate-fade-in" onClick={clearDiff} />

      <div className="animate-scale-in relative mx-4 w-full max-w-3xl rounded-2xl bg-white shadow-modal max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="min-w-0 flex-1">
            <h3 className="text-[15px] font-semibold text-slate-900">
              버전 비교 결과
            </h3>
            <div className="mt-1 flex items-center gap-2 text-[12px] text-slate-500">
              <span className="truncate max-w-[180px]">{metadata.sourceFilename}</span>
              <ArrowRight className="h-3 w-3 shrink-0 text-slate-400" />
              <span className="truncate max-w-[180px]">{metadata.targetFilename}</span>
            </div>
            <p className="mt-0.5 text-[11px] text-slate-400">
              {new Date(metadata.processedAt).toLocaleString('ko-KR')}
            </p>
          </div>
          <button
            onClick={clearDiff}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          {/* No changes */}
          {noChanges && (
            <div className="flex items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-6">
              <p className="text-[14px] font-medium text-emerald-700">
                두 버전이 동일합니다
              </p>
            </div>
          )}

          <DiffSummaryCard summary={summary} />

          {/* Tabs */}
          {!noChanges && (
            <>
              <div className="flex border-b border-slate-200">
                <button
                  onClick={() => setActiveTab('numeric')}
                  className={`flex items-center gap-1.5 px-4 py-2 text-[12px] font-medium transition-colors ${
                    activeTab === 'numeric'
                      ? 'border-b-2 border-primary-600 text-primary-700'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <BarChart3 className="h-3.5 w-3.5" /> 수치 변경
                  {numericChanges.length > 0 && (
                    <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                      {numericChanges.length}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('text')}
                  className={`flex items-center gap-1.5 px-4 py-2 text-[12px] font-medium transition-colors ${
                    activeTab === 'text'
                      ? 'border-b-2 border-primary-600 text-primary-700'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <FileEdit className="h-3.5 w-3.5" /> 내용 변경
                  {textChanges.length > 0 && (
                    <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                      {textChanges.length}
                    </span>
                  )}
                </button>
              </div>

              <div className="mt-1">
                {activeTab === 'numeric' && (
                  <NumericChangesTable
                    changes={numericChanges}
                    onClickChange={handleNumericClick}
                  />
                )}
                {activeTab === 'text' && (
                  <TextChangesList
                    changes={textChanges}
                    onClickChange={handleTextClick}
                  />
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
