'use client';

import { useEffect } from 'react';
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

  useEffect(() => {
    if (documentId) loadComments();
  }, [documentId]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex h-full flex-col">
      {/* Filter bar */}
      <div className="flex items-center gap-1 border-b border-slate-100 px-4 py-2">
        <button
          onClick={() => setFilter('all')}
          className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition-colors ${
            filter === 'all'
              ? 'bg-primary-50 text-primary-700'
              : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
          }`}
        >
          전체 ({totalCount})
        </button>
        <button
          onClick={() => setFilter('unresolved')}
          className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition-colors ${
            filter === 'unresolved'
              ? 'bg-amber-50 text-amber-700'
              : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
          }`}
        >
          미해결 ({unresolvedCount})
        </button>
      </div>

      {/* Comment list */}
      <div className="flex-1 overflow-auto">
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-primary-600" />
          </div>
        )}

        {!loading && comments.length === 0 && (
          <div className="flex items-center justify-center py-12">
            <p className="text-[13px] text-slate-400">아직 코멘트가 없습니다</p>
          </div>
        )}

        {!loading && comments.length > 0 && (
          <div className="divide-y divide-slate-100">
            {comments.map((comment) => (
              <DocumentCommentItem key={comment.id} comment={comment} />
            ))}
          </div>
        )}
      </div>

      {/* Comment input */}
      <DocumentCommentInput />
    </div>
  );
}
