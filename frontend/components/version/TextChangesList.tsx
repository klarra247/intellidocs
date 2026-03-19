'use client';

import { useState } from 'react';
import { PlusCircle, MinusCircle, PenLine } from 'lucide-react';
import { TextChange } from '@/lib/types';

interface TextChangesListProps {
  changes: TextChange[];
  onClickChange?: (change: TextChange) => void;
}

const INITIAL_COUNT = 10;

const typeConfig: Record<string, { borderColor: string; icon: typeof PlusCircle; iconColor: string; label: string }> = {
  ADDED: { borderColor: 'var(--success)', icon: PlusCircle, iconColor: 'var(--success)', label: '추가' },
  REMOVED: { borderColor: 'var(--error)', icon: MinusCircle, iconColor: 'var(--error)', label: '삭제' },
  MODIFIED: { borderColor: 'var(--warning)', icon: PenLine, iconColor: 'var(--warning)', label: '수정' },
};

export default function TextChangesList({ changes, onClickChange }: TextChangesListProps) {
  const [showAll, setShowAll] = useState(false);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [hoveredMore, setHoveredMore] = useState(false);

  if (changes.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>내용 변경 없음</p>
      </div>
    );
  }

  const visible = showAll ? changes : changes.slice(0, INITIAL_COUNT);
  const hasMore = changes.length > INITIAL_COUNT;

  return (
    <div className="space-y-2">
      {visible.map((c, i) => {
        const config = typeConfig[c.type] ?? typeConfig.MODIFIED;
        return (
          <div
            key={i}
            onClick={() => onClickChange?.(c)}
            onMouseEnter={() => setHoveredIdx(i)}
            onMouseLeave={() => setHoveredIdx(null)}
            className="rounded-[6px] px-3 py-2.5 cursor-pointer transition-colors"
            style={{
              border: '1px solid var(--border)',
              borderLeft: `3px solid ${config.borderColor}`,
              backgroundColor: hoveredIdx === i ? 'var(--bg-secondary)' : 'transparent',
            }}
          >
            <div className="flex items-center gap-1.5">
              <config.icon className="h-3.5 w-3.5" style={{ color: config.iconColor }} />
              <span className="text-[11px] font-medium" style={{ color: 'var(--text-secondary)' }}>{config.label}</span>
              {c.targetPageNumber != null && (
                <span className="text-[10px] ml-auto" style={{ color: 'var(--text-tertiary)' }}>
                  p.{c.targetPageNumber}
                </span>
              )}
            </div>
            <p className="mt-1 text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>
              {c.sectionTitle}
            </p>
            <p className="mt-0.5 text-[12px] line-clamp-2" style={{ color: 'var(--text-secondary)' }}>
              {c.summary}
            </p>
          </div>
        );
      })}

      {hasMore && (
        <button
          onClick={() => setShowAll(!showAll)}
          onMouseEnter={() => setHoveredMore(true)}
          onMouseLeave={() => setHoveredMore(false)}
          className="w-full rounded-[6px] py-2 text-[12px] font-medium transition-colors"
          style={{
            border: '1px solid var(--border)',
            color: 'var(--text-secondary)',
            backgroundColor: hoveredMore ? 'var(--bg-secondary)' : 'transparent',
          }}
        >
          {showAll ? '접기' : `${changes.length - INITIAL_COUNT}건 더 보기`}
        </button>
      )}
    </div>
  );
}
