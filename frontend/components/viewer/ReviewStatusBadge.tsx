'use client';

import { ReviewStatus } from '@/lib/types';

interface ReviewStatusBadgeProps {
  status: ReviewStatus;
  size?: 'sm' | 'md';
}

const config: Record<Exclude<ReviewStatus, 'NONE'>, { label: string; bg: string; color: string }> = {
  IN_REVIEW: {
    label: '검토 중',
    bg: 'color-mix(in srgb, var(--warning) 10%, transparent)',
    color: 'var(--warning)',
  },
  APPROVED: {
    label: '승인됨 \u2713',
    bg: 'color-mix(in srgb, var(--success) 10%, transparent)',
    color: 'var(--success)',
  },
  REJECTED: {
    label: '반려됨 \u2717',
    bg: 'color-mix(in srgb, var(--error) 10%, transparent)',
    color: 'var(--error)',
  },
};

export default function ReviewStatusBadge({ status, size = 'md' }: ReviewStatusBadgeProps) {
  if (status === 'NONE') return null;

  const c = config[status];
  const sizeClass = size === 'sm'
    ? 'px-1.5 py-0.5 text-[10px]'
    : 'px-2 py-0.5 text-[11px]';

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${sizeClass}`}
      style={{ backgroundColor: c.bg, color: c.color }}
    >
      {c.label}
    </span>
  );
}
