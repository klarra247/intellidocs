'use client';

import { useState } from 'react';
import { ChatSource } from '@/lib/types';
import SourceGroup from './SourceGroup';

interface SourceBadgeGroupProps {
  sources: ChatSource[];
}

const MAX_VISIBLE = 3;

export default function SourceBadgeGroup({ sources }: SourceBadgeGroupProps) {
  const [expanded, setExpanded] = useState(false);

  // Group sources by documentId
  const groups = new Map<string, ChatSource[]>();
  for (const source of sources) {
    const existing = groups.get(source.documentId);
    if (existing) {
      existing.push(source);
    } else {
      groups.set(source.documentId, [source]);
    }
  }

  const entries = Array.from(groups.entries());
  const visible = expanded ? entries : entries.slice(0, MAX_VISIBLE);
  const hiddenCount = entries.length - MAX_VISIBLE;

  return (
    <>
      {visible.map(([docId, docSources]) => (
        <SourceGroup
          key={docId}
          documentId={docId}
          filename={docSources[0].filename}
          sources={docSources}
        />
      ))}
      {hiddenCount > 0 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-700"
        >
          {expanded ? '접기' : `+${hiddenCount} 더보기`}
        </button>
      )}
    </>
  );
}
