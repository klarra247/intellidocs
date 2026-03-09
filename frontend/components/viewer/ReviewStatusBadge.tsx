'use client';

import { ReviewStatus } from '@/lib/types';

interface ReviewStatusBadgeProps {
  status: ReviewStatus;
  size?: 'sm' | 'md';
}

const config: Record<Exclude<ReviewStatus, 'NONE'>, { label: string; bg: string; text: string }> = {
  IN_REVIEW: { label: '검토 중', bg: 'bg-amber-50', text: 'text-amber-700' },
  APPROVED: { label: '승인됨 \u2713', bg: 'bg-emerald-50', text: 'text-emerald-700' },
  REJECTED: { label: '반려됨 \u2717', bg: 'bg-red-50', text: 'text-red-700' },
};

export default function ReviewStatusBadge({ status, size = 'md' }: ReviewStatusBadgeProps) {
  if (status === 'NONE') return null;

  const c = config[status];
  const sizeClass = size === 'sm'
    ? 'px-1.5 py-0.5 text-[10px]'
    : 'px-2 py-0.5 text-[11px]';

  return (
    <span className={`inline-flex items-center rounded-full font-medium ${c.bg} ${c.text} ${sizeClass}`}>
      {c.label}
    </span>
  );
}
