'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FileText, MessageSquare, FolderOpen } from 'lucide-react';

const navItems = [
  { href: '/workspace', label: '문서 관리', icon: FolderOpen },
  { href: '/workspace/chat', label: 'AI 채팅', icon: MessageSquare },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-[220px] flex-col border-r border-slate-200/80 bg-white">
      {/* Logo */}
      <div className="flex h-14 items-center gap-2.5 px-5">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-600">
          <FileText className="h-3.5 w-3.5 text-white" strokeWidth={2.5} />
        </div>
        <span className="text-[15px] font-bold tracking-tight text-slate-900">
          IntelliDocs
        </span>
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
        <p className="text-[11px] font-medium text-slate-400">
          Document Intelligence
        </p>
      </div>
    </aside>
  );
}
