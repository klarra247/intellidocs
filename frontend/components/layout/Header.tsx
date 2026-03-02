'use client';

import { usePathname } from 'next/navigation';
import { FileText, MessageSquare } from 'lucide-react';

const pageConfig: Record<string, { title: string; icon: typeof FileText }> = {
  '/workspace': { title: '문서 관리', icon: FileText },
  '/workspace/chat': { title: 'AI 채팅', icon: MessageSquare },
};

export default function Header() {
  const pathname = usePathname();
  const config = pageConfig[pathname];
  const Icon = config?.icon;

  return (
    <header className="flex h-14 items-center gap-3 border-b border-slate-200/80 bg-white px-6">
      {Icon && (
        <Icon className="h-4 w-4 text-slate-400" strokeWidth={2} />
      )}
      <h2 className="text-sm font-semibold text-slate-700">
        {config?.title ?? 'IntelliDocs'}
      </h2>
    </header>
  );
}
