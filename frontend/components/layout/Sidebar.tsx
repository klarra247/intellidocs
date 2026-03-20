'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  FileText,
  MessageSquare,
  Share2,
  Bell,
  Settings,
} from 'lucide-react';
import WorkspaceSwitcher from '@/components/workspace/WorkspaceSwitcher';
import { useWorkspaceStore } from '@/stores/workspaceStore';

const navItems = [
  { href: '/workspace', label: '문서', icon: FileText, tourId: 'nav-documents' },
  { href: '/workspace/chat', label: 'AI 채팅', icon: MessageSquare, tourId: 'nav-chat' },
  { href: '/workspace/knowledge-graph', label: 'Knowledge Graph', icon: Share2, tourId: 'nav-knowledge-graph' },
  { href: '/workspace/notifications', label: '알림', icon: Bell },
  { href: '/workspace/settings', label: '설정', icon: Settings, teamOnly: true },
];

export default function Sidebar() {
  const pathname = usePathname();
  const currentWorkspace = useWorkspaceStore((s) => s.currentWorkspace);
  const isTeam = currentWorkspace?.type === 'TEAM';

  return (
    <aside
      className="flex w-[240px] flex-col"
      style={{ background: 'var(--bg-secondary)', borderRight: '1px solid var(--border)' }}
    >
      {/* Workspace Switcher */}
      <div className="px-3 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
        <WorkspaceSwitcher />
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 pt-2">
        <div className="space-y-0.5">
          {navItems.filter((item) => !('teamOnly' in item && item.teamOnly) || isTeam).map(({ href, label, icon: Icon, tourId }) => {
            const active =
              href === '/workspace'
                ? pathname === '/workspace'
                : pathname.startsWith(href);

            return (
              <Link
                key={href}
                href={href}
                data-tour={tourId}
                className="group flex items-center gap-2.5 rounded-[4px] px-2 py-1.5 text-[13px] transition-colors"
                style={{
                  background: active ? 'var(--bg-active)' : 'transparent',
                  color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                  fontWeight: active ? 500 : 400,
                }}
                onMouseEnter={(e) => {
                  if (!active) e.currentTarget.style.background = 'var(--bg-hover)';
                }}
                onMouseLeave={(e) => {
                  if (!active) e.currentTarget.style.background = 'transparent';
                }}
              >
                <Icon
                  className="h-4 w-4 shrink-0"
                  style={{ color: active ? 'var(--text-primary)' : 'var(--text-tertiary)' }}
                  strokeWidth={active ? 2.2 : 1.8}
                />
                {label}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Footer */}
      <div className="px-4 py-3" style={{ borderTop: '1px solid var(--border)' }}>
        <p className="text-[11px] font-medium" style={{ color: 'var(--text-tertiary)' }}>
          IntelliDocs
        </p>
      </div>
    </aside>
  );
}
