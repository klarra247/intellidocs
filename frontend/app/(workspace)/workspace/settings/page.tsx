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
  const [hoveredTab, setHoveredTab] = useState<string | null>(null);
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
        <h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
          워크스페이스 설정
        </h1>
        <p className="mt-1 text-[13px]" style={{ color: 'var(--text-secondary)' }}>
          {currentWorkspace.name}
        </p>

        {/* Tabs */}
        <div className="mt-6" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex gap-6">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              const isHovered = hoveredTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  onMouseEnter={() => setHoveredTab(tab.id)}
                  onMouseLeave={() => setHoveredTab(null)}
                  className="pb-2.5 text-[13px] font-medium transition-colors"
                  style={{
                    color: isActive
                      ? 'var(--accent)'
                      : isHovered
                        ? 'var(--text-primary)'
                        : 'var(--text-secondary)',
                    borderBottom: isActive ? '2px solid var(--accent)' : '2px solid transparent',
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
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
