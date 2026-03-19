'use client';

import { usePathname } from 'next/navigation';
import { FileText, MessageSquare, FileBarChart, Settings, Bell, Share2 } from 'lucide-react';
import UserMenu from '@/components/auth/UserMenu';
import NotificationBell from '@/components/notifications/NotificationBell';

const pageConfig: Record<string, { title: string; icon: typeof FileText }> = {
  '/workspace': { title: '문서', icon: FileText },
  '/workspace/chat': { title: 'AI 채팅', icon: MessageSquare },
  '/workspace/reports': { title: '리포트', icon: FileBarChart },
  '/workspace/settings': { title: '워크스페이스 설정', icon: Settings },
  '/workspace/notifications': { title: '알림', icon: Bell },
  '/workspace/knowledge-graph': { title: 'Knowledge Graph', icon: Share2 },
};

export default function Header() {
  const pathname = usePathname();
  const config = pageConfig[pathname];

  return (
    <header
      className="flex h-12 items-center justify-between px-6"
      style={{
        background: 'var(--bg-primary)',
        borderBottom: '1px solid var(--border)',
      }}
    >
      <h2 className="text-[14px] font-medium" style={{ color: 'var(--text-primary)' }}>
        {config?.title ?? 'IntelliDocs'}
      </h2>
      <div className="flex items-center gap-2">
        <NotificationBell />
        <UserMenu />
      </div>
    </header>
  );
}
