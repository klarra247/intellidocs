'use client';

import { useState, useRef, useEffect } from 'react';
import { MoreVertical, Share2, Lock } from 'lucide-react';
import { SessionSummary } from '@/lib/types';

interface SessionContextMenuProps {
  session: SessionSummary;
  onShare: () => void;
  onUnshare: () => void;
}

export default function SessionContextMenu({ session, onShare, onUnshare }: SessionContextMenuProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  if (!session.isOwner) return null;

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        className="flex h-6 w-6 items-center justify-center rounded-[4px] opacity-0 transition-opacity group-hover:opacity-100"
        style={{ color: 'var(--text-tertiary)' }}
        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
      >
        <MoreVertical className="h-3.5 w-3.5" strokeWidth={1.6} />
      </button>

      {open && (
        <div
          className="absolute right-0 top-7 z-50 w-36 rounded-[6px] py-1 animate-scale-in"
          style={{
            background: 'var(--bg-primary)',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-md)',
          }}
        >
          {session.isShared ? (
            <button
              onClick={(e) => { e.stopPropagation(); onUnshare(); setOpen(false); }}
              className="flex w-full items-center gap-2 px-3 py-2 text-[12px] transition-colors"
              style={{ color: 'var(--text-secondary)' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <Lock className="h-3.5 w-3.5" strokeWidth={1.6} />
              공유 해제
            </button>
          ) : (
            <button
              onClick={(e) => { e.stopPropagation(); onShare(); setOpen(false); }}
              className="flex w-full items-center gap-2 px-3 py-2 text-[12px] transition-colors"
              style={{ color: 'var(--text-secondary)' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <Share2 className="h-3.5 w-3.5" strokeWidth={1.6} />
              공유하기
            </button>
          )}
        </div>
      )}
    </div>
  );
}
