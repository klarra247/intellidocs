'use client';

import { useState, useRef, KeyboardEvent } from 'react';
import { Pencil, Trash2, Check, X } from 'lucide-react';
import { CommentResponse } from '@/lib/types';

interface CommentItemProps {
  comment: CommentResponse;
  onUpdate: (commentId: string, content: string) => void;
  onDelete: (commentId: string) => void;
}

export default function CommentItem({ comment, onUpdate, onDelete }: CommentItemProps) {
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [hovered, setHovered] = useState(false);
  const [editBtnHover, setEditBtnHover] = useState(false);
  const [deleteBtnHover, setDeleteBtnHover] = useState(false);
  const [saveBtnHover, setSaveBtnHover] = useState(false);
  const [cancelBtnHover, setCancelBtnHover] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSave = () => {
    const content = editContent.trim();
    if (!content || content === comment.content) {
      setEditing(false);
      setEditContent(comment.content);
      return;
    }
    onUpdate(comment.id, content);
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

  return (
    <div
      className="px-4 py-3 animate-fade-in"
      style={{ backgroundColor: hovered ? 'var(--bg-hover)' : 'transparent' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
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
              onClick={() => onDelete(comment.id)}
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

      {editing ? (
        <div className="mt-2 ml-8">
          <textarea
            ref={textareaRef}
            value={editContent}
            onChange={(e) => setEditContent(e.target.value.slice(0, 1000))}
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
        <p className="mt-1 ml-8 whitespace-pre-wrap text-[13px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          {comment.content}
        </p>
      )}
    </div>
  );
}
