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
  const [hoveredClose, setHoveredClose] = useState(false);

  if (!currentDiff) return null;

  const data = currentDiff.resultData;

  const handleNumericClick = (change: NumericChange) => {
    const targetDocId = currentDiff.targetDocumentId;
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
        <div
          className="absolute inset-0 animate-fade-in"
          style={{ backgroundColor: 'rgba(55, 53, 47, 0.3)' }}
          onClick={clearDiff}
        />
        <div
          className="animate-scale-in relative mx-4 w-full max-w-3xl rounded-[12px] p-6"
          style={{
            backgroundColor: 'var(--bg-primary)',
            boxShadow: 'var(--shadow-lg)',
          }}
        >
          <p className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>결과를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  const { numericChanges, textChanges, summary, metadata } = data;
  const noChanges = numericChanges.length === 0 && textChanges.length === 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 animate-fade-in"
        style={{ backgroundColor: 'rgba(55, 53, 47, 0.3)' }}
        onClick={clearDiff}
      />

      <div
        className="animate-scale-in relative mx-4 w-full max-w-3xl rounded-[12px] max-h-[85vh] flex flex-col"
        style={{
          backgroundColor: 'var(--bg-primary)',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <div className="min-w-0 flex-1">
            <h3 className="text-[15px] font-semibold" style={{ color: 'var(--text-primary)' }}>
              버전 비교 결과
            </h3>
            <div className="mt-1 flex items-center gap-2 text-[12px]" style={{ color: 'var(--text-secondary)' }}>
              <span className="truncate max-w-[180px]">{metadata.sourceFilename}</span>
              <ArrowRight className="h-3 w-3 shrink-0" style={{ color: 'var(--text-tertiary)' }} />
              <span className="truncate max-w-[180px]">{metadata.targetFilename}</span>
            </div>
            <p className="mt-0.5 text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
              {new Date(metadata.processedAt).toLocaleString('ko-KR')}
            </p>
          </div>
          <button
            onClick={clearDiff}
            onMouseEnter={() => setHoveredClose(true)}
            onMouseLeave={() => setHoveredClose(false)}
            className="rounded-[6px] p-1.5 transition-colors"
            style={{
              color: 'var(--text-tertiary)',
              backgroundColor: hoveredClose ? 'var(--bg-hover)' : 'transparent',
            }}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          {/* No changes */}
          {noChanges && (
            <div
              className="flex items-center justify-center rounded-[8px] px-4 py-6"
              style={{
                border: '1px solid var(--success)',
                backgroundColor: 'color-mix(in srgb, var(--success) 8%, var(--bg-primary))',
              }}
            >
              <p className="text-[14px] font-medium" style={{ color: 'var(--success)' }}>
                두 버전이 동일합니다
              </p>
            </div>
          )}

          <DiffSummaryCard summary={summary} />

          {/* Tabs */}
          {!noChanges && (
            <>
              <div className="flex" style={{ borderBottom: '1px solid var(--border)' }}>
                <button
                  onClick={() => setActiveTab('numeric')}
                  className="flex items-center gap-1.5 px-4 py-2 text-[12px] font-medium transition-colors"
                  style={{
                    color: activeTab === 'numeric' ? 'var(--accent)' : 'var(--text-secondary)',
                    borderBottom: activeTab === 'numeric' ? '2px solid var(--accent)' : '2px solid transparent',
                  }}
                >
                  <BarChart3 className="h-3.5 w-3.5" /> 수치 변경
                  {numericChanges.length > 0 && (
                    <span
                      className="rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
                      style={{
                        backgroundColor: 'var(--bg-active)',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      {numericChanges.length}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('text')}
                  className="flex items-center gap-1.5 px-4 py-2 text-[12px] font-medium transition-colors"
                  style={{
                    color: activeTab === 'text' ? 'var(--accent)' : 'var(--text-secondary)',
                    borderBottom: activeTab === 'text' ? '2px solid var(--accent)' : '2px solid transparent',
                  }}
                >
                  <FileEdit className="h-3.5 w-3.5" /> 내용 변경
                  {textChanges.length > 0 && (
                    <span
                      className="rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
                      style={{
                        backgroundColor: 'var(--bg-active)',
                        color: 'var(--text-secondary)',
                      }}
                    >
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
