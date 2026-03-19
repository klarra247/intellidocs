'use client';

import DocumentList from '@/components/documents/DocumentList';
import UploadZone from '@/components/documents/UploadZone';
import DiscrepancyAlertBanner from '@/components/discrepancy/DiscrepancyAlertBanner';
import DiscrepancyTriggerButton from '@/components/discrepancy/DiscrepancyTriggerButton';
import DiscrepancyDetailPanel from '@/components/discrepancy/DiscrepancyDetailPanel';

export default function WorkspacePage() {
  return (
    <div className="h-full overflow-auto p-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <DiscrepancyAlertBanner />
        <div className="flex items-center justify-between">
          <div>
            <h1
              className="text-[20px] font-bold tracking-tight"
              style={{ color: 'var(--text-primary)' }}
            >
              문서
            </h1>
            <p className="mt-0.5 text-[13px]" style={{ color: 'var(--text-secondary)' }}>
              문서를 업로드하고 AI에게 질문하세요
            </p>
          </div>
          <DiscrepancyTriggerButton />
        </div>
        <UploadZone />
        <DocumentList />
        <DiscrepancyDetailPanel />
      </div>
    </div>
  );
}
