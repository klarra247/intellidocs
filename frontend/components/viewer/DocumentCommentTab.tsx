'use client';

import { useEffect, useState } from 'react';
import { useDocumentCommentStore } from '@/stores/documentCommentStore';
import DocumentCommentItem from './DocumentCommentItem';
import DocumentCommentInput from './DocumentCommentInput';

export default function DocumentCommentTab() {
  const comments = useDocumentCommentStore((s) => s.comments);
  const totalCount = useDocumentCommentStore((s) => s.totalCount);
  const unresolvedCount = useDocumentCommentStore((s) => s.unresolvedCount);
  const loading = useDocumentCommentStore((s) => s.loading);
  const filter = useDocumentCommentStore((s) => s.filter);
  const setFilter = useDocumentCommentStore((s) => s.setFilter);
  const documentId = useDocumentCommentStore((s) => s.documentId);
  const loadComments = useDocumentCommentStore((s) => s.loadComments);

  const [allBtnHover, setAllBtnHover] = useState(false);
  const [unresolvedBtnHover, setUnresolvedBtnHover] = useState(false);

  useEffect(() => {
    if (documentId) loadComments();
  }, [documentId]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex h-full flex-col">
      {/* Filter bar */}
      <div
        className="flex items-center gap-1 px-4 py-2"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <button
          onClick={() => setFilter('all')}
          className="rounded-[6px] px-2.5 py-1 text-[11px] font-medium transition-colors"
          style={{
            backgroundColor: filter === 'all' ? 'var(--accent-light)' : (allBtnHover ? 'var(--bg-hover)' : 'transparent'),
            color: filter === 'all' ? 'var(--accent)' : (allBtnHover ? 'var(--text-primary)' : 'var(--text-secondary)'),
          }}
          onMouseEnter={() => setAllBtnHover(true)}
          onMouseLeave={() => setAllBtnHover(false)}
        >
          전체 ({totalCount})
        </button>
        <button
          onClick={() => setFilter('unresolved')}
          className="rounded-[6px] px-2.5 py-1 text-[11px] font-medium transition-colors"
          style={{
            backgroundColor: filter === 'unresolved' ? 'color-mix(in srgb, var(--warning) 10%, transparent)' : (unresolvedBtnHover ? 'var(--bg-hover)' : 'transparent'),
            color: filter === 'unresolved' ? 'var(--warning)' : (unresolvedBtnHover ? 'var(--text-primary)' : 'var(--text-secondary)'),
          }}
          onMouseEnter={() => setUnresolvedBtnHover(true)}
          onMouseLeave={() => setUnresolvedBtnHover(false)}
        >
          미해결 ({unresolvedCount})
        </button>
      </div>

      {/* Comment list */}
      <div className="flex-1 overflow-auto">
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div
              className="h-5 w-5 animate-spin rounded-full"
              style={{ border: '2px solid var(--border)', borderTopColor: 'var(--accent)' }}
            />
          </div>
        )}

        {!loading && comments.length === 0 && (
          <div className="flex items-center justify-center py-12">
            <p className="text-[13px]" style={{ color: 'var(--text-tertiary)' }}>아직 코멘트가 없습니다</p>
          </div>
        )}

        {!loading && comments.length > 0 && (
          <div>
            {comments.map((comment, idx) => (
              <div key={comment.id} style={idx > 0 ? { borderTop: '1px solid var(--border)' } : undefined}>
                <DocumentCommentItem comment={comment} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Comment input */}
      <DocumentCommentInput />
    </div>
  );
}
