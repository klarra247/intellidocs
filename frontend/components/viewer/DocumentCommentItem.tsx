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
  const [hovered, setHovered] = useState(false);
  const [editBtnHover, setEditBtnHover] = useState(false);
  const [deleteBtnHover, setDeleteBtnHover] = useState(false);
  const [saveBtnHover, setSaveBtnHover] = useState(false);
  const [cancelBtnHover, setCancelBtnHover] = useState(false);
  const [locationHover, setLocationHover] = useState(false);
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
    <div
      className="px-4 py-3 animate-fade-in"
      style={{
        backgroundColor: hovered ? 'var(--bg-hover)' : 'transparent',
        opacity: comment.resolved ? 0.6 : 1,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          {/* Resolve checkbox */}
          <input
            type="checkbox"
            checked={comment.resolved}
            onChange={handleResolveToggle}
            className="h-3.5 w-3.5 rounded"
            style={{ accentColor: 'var(--accent)' }}
            title={comment.resolved ? '미해결로 변경' : '해결됨으로 표시'}
          />
          {/* Avatar */}
          <div
            className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-semibold"
            style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent)' }}
          >
            {comment.userName.charAt(0).toUpperCase()}
          </div>
          <span className="text-[12px] font-medium" style={{ color: 'var(--text-primary)' }}>{comment.userName}</span>
          <span className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>{timeAgo(comment.createdAt)}</span>
          {comment.updatedAt !== comment.createdAt && (
            <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>(수정됨)</span>
          )}
        </div>
        {comment.isOwner && !editing && (
          <div className="flex items-center gap-1" style={{ opacity: hovered ? 1 : 0, transition: 'opacity 0.15s' }}>
            <button
              onClick={() => { setEditing(true); setEditContent(comment.content); }}
              className="flex h-5 w-5 items-center justify-center rounded-[4px]"
              style={{
                color: editBtnHover ? 'var(--text-secondary)' : 'var(--text-tertiary)',
                backgroundColor: editBtnHover ? 'var(--bg-active)' : 'transparent',
              }}
              onMouseEnter={() => setEditBtnHover(true)}
              onMouseLeave={() => setEditBtnHover(false)}
            >
              <Pencil className="h-3 w-3" />
            </button>
            <button
              onClick={() => deleteComment(comment.id)}
              className="flex h-5 w-5 items-center justify-center rounded-[4px]"
              style={{
                color: deleteBtnHover ? 'var(--error)' : 'var(--text-tertiary)',
                backgroundColor: deleteBtnHover ? 'color-mix(in srgb, var(--error) 10%, transparent)' : 'transparent',
              }}
              onMouseEnter={() => setDeleteBtnHover(true)}
              onMouseLeave={() => setDeleteBtnHover(false)}
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
            className="inline-flex items-center gap-1 rounded-[4px] px-1.5 py-0.5 text-[10px] font-medium transition-colors"
            style={{
              backgroundColor: locationHover ? 'var(--bg-active)' : 'var(--bg-secondary)',
              color: 'var(--text-secondary)',
            }}
            onMouseEnter={() => setLocationHover(true)}
            onMouseLeave={() => setLocationHover(false)}
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
            className="w-full resize-none rounded-[6px] px-3 py-2 text-[13px] leading-relaxed outline-none"
            style={{
              border: '1px solid var(--accent)',
              backgroundColor: 'var(--bg-primary)',
              color: 'var(--text-primary)',
            }}
            autoFocus
          />
          <div className="mt-1 flex items-center gap-1">
            <button
              onClick={handleSave}
              className="flex h-6 items-center gap-1 rounded-[4px] px-2 text-[11px] font-medium"
              style={{
                color: 'var(--accent)',
                backgroundColor: saveBtnHover ? 'var(--accent-light)' : 'transparent',
              }}
              onMouseEnter={() => setSaveBtnHover(true)}
              onMouseLeave={() => setSaveBtnHover(false)}
            >
              <Check className="h-3 w-3" /> 저장
            </button>
            <button
              onClick={() => { setEditing(false); setEditContent(comment.content); }}
              className="flex h-6 items-center gap-1 rounded-[4px] px-2 text-[11px] font-medium"
              style={{
                color: 'var(--text-secondary)',
                backgroundColor: cancelBtnHover ? 'var(--bg-hover)' : 'transparent',
              }}
              onMouseEnter={() => setCancelBtnHover(true)}
              onMouseLeave={() => setCancelBtnHover(false)}
            >
              <X className="h-3 w-3" /> 취소
            </button>
          </div>
        </div>
      ) : (
        <p
          className={`mt-1 ml-9 whitespace-pre-wrap text-[13px] leading-relaxed ${comment.resolved ? 'line-through' : ''}`}
          style={{ color: 'var(--text-secondary)' }}
        >
          {comment.content}
        </p>
      )}
    </div>
  );
}
