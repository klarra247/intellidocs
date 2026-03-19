'use client';

import { Eye } from 'lucide-react';

interface ReadOnlyBannerProps {
  creatorName: string | null;
}

export default function ReadOnlyBanner({ creatorName }: ReadOnlyBannerProps) {
  return (
    <div
      className="flex items-center gap-2 px-4 py-2"
      style={{
        background: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border)',
      }}
    >
      <Eye className="h-4 w-4" style={{ color: 'var(--text-tertiary)' }} strokeWidth={1.6} />
      <span className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>
        {creatorName ?? '다른 사용자'}님이 공유한 대화입니다 (읽기 전용)
      </span>
    </div>
  );
}
