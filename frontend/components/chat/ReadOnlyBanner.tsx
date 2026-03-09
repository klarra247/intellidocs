'use client';

import { Eye } from 'lucide-react';

interface ReadOnlyBannerProps {
  creatorName: string | null;
}

export default function ReadOnlyBanner({ creatorName }: ReadOnlyBannerProps) {
  return (
    <div className="flex items-center gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2">
      <Eye className="h-4 w-4 text-amber-600" />
      <span className="text-[13px] text-amber-700">
        {creatorName ?? '다른 사용자'}님이 공유한 대화입니다 (읽기 전용)
      </span>
    </div>
  );
}
