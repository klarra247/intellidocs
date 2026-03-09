'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import GeneralTab from '@/components/workspace/settings/GeneralTab';
import MembersTab from '@/components/workspace/settings/MembersTab';
import DangerTab from '@/components/workspace/settings/DangerTab';

const tabs = [
  { id: 'general', label: '일반' },
  { id: 'members', label: '멤버' },
  { id: 'danger', label: '위험' },
] as const;

type TabId = (typeof tabs)[number]['id'];

export default function WorkspaceSettingsPage() {
  const [activeTab, setActiveTab] = useState<TabId>('general');
  const { currentWorkspace, fetchWorkspaceDetail, workspaceDetail } = useWorkspaceStore();
  const router = useRouter();

  useEffect(() => {
    if (!currentWorkspace) return;
    if (currentWorkspace.type === 'PERSONAL') {
      router.replace('/workspace');
      return;
    }
    fetchWorkspaceDetail(currentWorkspace.id);
  }, [currentWorkspace, fetchWorkspaceDetail, router]);

  if (!currentWorkspace || currentWorkspace.type === 'PERSONAL') return null;

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-lg font-bold text-slate-900">워크스페이스 설정</h1>
        <p className="mt-1 text-[13px] text-slate-500">{currentWorkspace.name}</p>

        {/* Tabs */}
        <div className="mt-6 border-b border-slate-200">
          <div className="flex gap-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`pb-2.5 text-[13px] font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'border-b-2 border-primary-600 text-primary-700'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="mt-6">
          {activeTab === 'general' && <GeneralTab />}
          {activeTab === 'members' && <MembersTab />}
          {activeTab === 'danger' && <DangerTab />}
        </div>
      </div>
    </div>
  );
}
