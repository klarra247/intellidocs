'use client';

import { useState, useRef, KeyboardEvent } from 'react';
import { Pencil, Trash2, Check, X } from 'lucide-react';
import { DocumentCommentResponse } from '@/lib/types';
import { useDocumentCommentStore } from '@/stores/documentCommentStore';
import { useViewerStore } from '@/stores/viewerStore';

interface DocumentCommentItemProps {
  comment: DocumentCommentResponse;
}

export default function DocumentCommentItem({ comment }: DocumentCommentItemProps) {
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const updateComment = useDocumentCommentStore((s) => s.updateComment);
  const deleteComment = useDocumentCommentStore((s) => s.deleteComment);
  const resolveComment = useDocumentCommentStore((s) => s.resolveComment);
  const unresolveComment = useDocumentCommentStore((s) => s.unresolveComment);

  const handleSave = () => {
    const content = editContent.trim();
    if (!content || content === comment.content) {
      setEditing(false);
      setEditContent(comment.content);
      return;
    }
    updateComment(comment.id, content);
    setEditing(false);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.nativeEvent.isComposing) return;
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    }
    if (e.key === 'Escape') {
      setEditing(false);
      setEditContent(comment.content);
    }
  };

  const handleLocationClick = () => {
    const setActiveTab = useViewerStore.getState().setActiveTab;
    setActiveTab('document');
    if (comment.pageNumber != null) {
      useViewerStore.getState().navigateToPage(comment.pageNumber);
    }
    if (comment.chunkIndex != null) {
      useViewerStore.getState().navigateToHighlight({
        chunkIndex: comment.chunkIndex,
        pageNumber: comment.pageNumber,
        sectionTitle: null,
      });
    }
  };

  const handleResolveToggle = () => {
    if (comment.resolved) {
      unresolveComment(comment.id);
    } else {
      resolveComment(comment.id);
    }
  };

  const timeAgo = (dateStr: string) => {
    if (!dateStr) return '방금 전';
    const time = new Date(dateStr).getTime();
    if (isNaN(time)) return '방금 전';
    const diff = Date.now() - time;
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return '방금 전';
    if (minutes < 60) return `${minutes}분 전`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}시간 전`;
    const days = Math.floor(hours / 24);
    return `${days}일 전`;
  };

  const hasLocation = comment.pageNumber != null || comment.chunkIndex != null;

  return (
    <div className={`group px-4 py-3 hover:bg-slate-50 animate-fade-in ${comment.resolved ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          {/* Resolve checkbox */}
          <input
            type="checkbox"
            checked={comment.resolved}
            onChange={handleResolveToggle}
            className="h-3.5 w-3.5 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
            title={comment.resolved ? '미해결로 변경' : '해결됨으로 표시'}
          />
          {/* Avatar */}
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-100 text-[10px] font-semibold text-primary-700">
            {comment.userName.charAt(0).toUpperCase()}
          </div>
          <span className="text-[12px] font-medium text-slate-700">{comment.userName}</span>
          <span className="text-[11px] text-slate-400">{timeAgo(comment.createdAt)}</span>
          {comment.updatedAt !== comment.createdAt && (
            <span className="text-[10px] text-slate-400">(수정됨)</span>
          )}
        </div>
        {comment.isOwner && !editing && (
          <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            <button
              onClick={() => { setEditing(true); setEditContent(comment.content); }}
              className="flex h-5 w-5 items-center justify-center rounded text-slate-400 hover:bg-slate-200 hover:text-slate-600"
            >
              <Pencil className="h-3 w-3" />
            </button>
            <button
              onClick={() => deleteComment(comment.id)}
              className="flex h-5 w-5 items-center justify-center rounded text-slate-400 hover:bg-red-100 hover:text-red-500"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>

      {/* Location badge */}
      {hasLocation && (
        <div className="mt-1.5 ml-9">
          <button
            onClick={handleLocationClick}
            className="inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 hover:bg-slate-200 transition-colors"
          >
            {comment.pageNumber != null && <span>p.{comment.pageNumber}</span>}
            {comment.pageNumber != null && comment.chunkIndex != null && <span>/</span>}
            {comment.chunkIndex != null && <span>청크 {comment.chunkIndex}</span>}
          </button>
        </div>
      )}

      {editing ? (
        <div className="mt-2 ml-9">
          <textarea
            ref={textareaRef}
            value={editContent}
            onChange={(e) => setEditContent(e.target.value.slice(0, 2000))}
            onKeyDown={handleKeyDown}
            rows={2}
            className="w-full resize-none rounded-lg border border-primary-300 bg-white px-3 py-2 text-[13px] leading-relaxed text-slate-800 outline-none focus:ring-2 focus:ring-primary-100"
            autoFocus
          />
          <div className="mt-1 flex items-center gap-1">
            <button
              onClick={handleSave}
              className="flex h-6 items-center gap-1 rounded px-2 text-[11px] font-medium text-primary-600 hover:bg-primary-50"
            >
              <Check className="h-3 w-3" /> 저장
            </button>
            <button
              onClick={() => { setEditing(false); setEditContent(comment.content); }}
              className="flex h-6 items-center gap-1 rounded px-2 text-[11px] font-medium text-slate-500 hover:bg-slate-100"
            >
              <X className="h-3 w-3" /> 취소
            </button>
          </div>
        </div>
      ) : (
        <p className={`mt-1 ml-9 whitespace-pre-wrap text-[13px] leading-relaxed text-slate-600 ${comment.resolved ? 'line-through' : ''}`}>
          {comment.content}
        </p>
      )}
    </div>
  );
}
