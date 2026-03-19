'use client';

import { useEffect } from 'react';
import { Plus } from 'lucide-react';
import { useReportStore } from '@/stores/reportStore';
import { useDocumentStore } from '@/stores/documentStore';
import ReportGenerateModal from '@/components/reports/ReportGenerateModal';
import ReportListPanel from '@/components/reports/ReportListPanel';

export default function ReportsPage() {
  const { modalOpen, setModalOpen } = useReportStore();
  const { fetchDocuments, documents } = useDocumentStore();

  useEffect(() => {
    if (documents.length === 0) {
      fetchDocuments();
    }
  }, [fetchDocuments, documents.length]);

  return (
    <div className="h-full overflow-auto p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
              리포트
            </h1>
            <p className="mt-0.5 text-[13px]" style={{ color: 'var(--text-secondary)' }}>
              AI가 문서를 분석하여 PDF 리포트를 생성합니다
            </p>
          </div>
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-1.5 rounded-[6px] px-3.5 py-2 text-[13px] font-medium transition-colors"
            style={{ background: 'var(--accent)', color: '#fff' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--accent-hover)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--accent)')}
          >
            <Plus className="h-4 w-4" strokeWidth={2.5} />
            리포트 생성
          </button>
        </div>

        <ReportListPanel />
      </div>

      {modalOpen && <ReportGenerateModal />}
    </div>
  );
}
