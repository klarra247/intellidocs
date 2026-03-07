'use client';

import DocumentList from '@/components/documents/DocumentList';
import UploadZone from '@/components/documents/UploadZone';
import DiscrepancyAlertBanner from '@/components/discrepancy/DiscrepancyAlertBanner';
import DiscrepancyTriggerButton from '@/components/discrepancy/DiscrepancyTriggerButton';
import DiscrepancyDetailPanel from '@/components/discrepancy/DiscrepancyDetailPanel';

export default function WorkspacePage() {
  return (
    <div className="h-full overflow-auto p-6">
    <div className="mx-auto max-w-5xl space-y-6">
      <DiscrepancyAlertBanner />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            워크스페이스
          </h1>
          <p className="mt-0.5 text-[13px] text-slate-500">
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
