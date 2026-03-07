'use client';

import { usePathname } from 'next/navigation';
import { FileText, MessageSquare, FileBarChart } from 'lucide-react';
import UserMenu from '@/components/auth/UserMenu';

const pageConfig: Record<string, { title: string; icon: typeof FileText }> = {
  '/workspace': { title: '문서 관리', icon: FileText },
  '/workspace/chat': { title: 'AI 채팅', icon: MessageSquare },
  '/workspace/reports': { title: '리포트', icon: FileBarChart },
};

export default function Header() {
  const pathname = usePathname();
  const config = pageConfig[pathname];
  const Icon = config?.icon;

  return (
    <header className="flex h-14 items-center justify-between border-b border-slate-200/80 bg-white px-6">
      <div className="flex items-center gap-3">
        {Icon && (
          <Icon className="h-4 w-4 text-slate-400" strokeWidth={2} />
        )}
        <h2 className="text-sm font-semibold text-slate-700">
          {config?.title ?? 'IntelliDocs'}
        </h2>
      </div>
      <UserMenu />
    </header>
  );
}
