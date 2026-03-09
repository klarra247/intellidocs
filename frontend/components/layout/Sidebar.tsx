'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FileText, MessageSquare, FolderOpen, FileBarChart } from 'lucide-react';
import WorkspaceSwitcher from '@/components/workspace/WorkspaceSwitcher';

const navItems = [
  { href: '/workspace', label: '문서 관리', icon: FolderOpen },
  { href: '/workspace/chat', label: 'AI 채팅', icon: MessageSquare },
  { href: '/workspace/reports', label: '리포트', icon: FileBarChart },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-[220px] flex-col border-r border-slate-200/80 bg-white">
      {/* Workspace Switcher */}
      <div className="border-b border-slate-100 px-2.5 py-2.5">
        <WorkspaceSwitcher />
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 pt-2">
        <div className="space-y-0.5">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active =
              href === '/workspace'
                ? pathname === '/workspace'
                : pathname.startsWith(href);

            return (
              <Link
                key={href}
                href={href}
                className={`group flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-150 ${
                  active
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Icon
                  className={`h-[15px] w-[15px] transition-colors ${
                    active
                      ? 'text-primary-600'
                      : 'text-slate-400 group-hover:text-slate-600'
                  }`}
                  strokeWidth={2}
                />
                {label}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Footer */}
      <div className="border-t border-slate-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-5 w-5 items-center justify-center rounded bg-primary-600">
            <FileText className="h-2.5 w-2.5 text-white" strokeWidth={2.5} />
          </div>
          <p className="text-[11px] font-medium text-slate-400">
            IntelliDocs
          </p>
        </div>
      </div>
    </aside>
  );
}
