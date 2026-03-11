'use client';

import { useState } from 'react';
import { PlusCircle, MinusCircle, PenLine } from 'lucide-react';
import { TextChange } from '@/lib/types';

interface TextChangesListProps {
  changes: TextChange[];
  onClickChange?: (change: TextChange) => void;
}

const INITIAL_COUNT = 10;

const typeConfig: Record<string, { border: string; icon: typeof PlusCircle; iconColor: string; label: string }> = {
  ADDED: { border: 'border-l-green-500', icon: PlusCircle, iconColor: 'text-green-500', label: '추가' },
  REMOVED: { border: 'border-l-red-500', icon: MinusCircle, iconColor: 'text-red-500', label: '삭제' },
  MODIFIED: { border: 'border-l-yellow-500', icon: PenLine, iconColor: 'text-yellow-500', label: '수정' },
};

export default function TextChangesList({ changes, onClickChange }: TextChangesListProps) {
  const [showAll, setShowAll] = useState(false);

  if (changes.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-[12px] text-slate-400">내용 변경 없음</p>
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
            className={`rounded-lg border border-slate-200 border-l-[3px] ${config.border} px-3 py-2.5 hover:bg-slate-50 cursor-pointer transition-colors`}
          >
            <div className="flex items-center gap-1.5">
              <config.icon className={`h-3.5 w-3.5 ${config.iconColor}`} />
              <span className="text-[11px] font-medium text-slate-500">{config.label}</span>
              {c.targetPageNumber != null && (
                <span className="text-[10px] text-slate-400 ml-auto">
                  p.{c.targetPageNumber}
                </span>
              )}
            </div>
            <p className="mt-1 text-[13px] font-medium text-slate-800">
              {c.sectionTitle}
            </p>
            <p className="mt-0.5 text-[12px] text-slate-500 line-clamp-2">
              {c.summary}
            </p>
          </div>
        );
      })}

      {hasMore && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="w-full rounded-lg border border-slate-200 py-2 text-[12px] font-medium text-slate-500 hover:bg-slate-50 transition-colors"
        >
          {showAll ? '접기' : `${changes.length - INITIAL_COUNT}건 더 보기`}
        </button>
      )}
    </div>
  );
}
