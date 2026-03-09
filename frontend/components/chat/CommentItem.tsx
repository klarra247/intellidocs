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
    <div className="group px-4 py-3 hover:bg-slate-50 animate-fade-in">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
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
              onClick={() => onDelete(comment.id)}
              className="flex h-5 w-5 items-center justify-center rounded text-slate-400 hover:bg-red-100 hover:text-red-500"
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
        <p className="mt-1 ml-8 whitespace-pre-wrap text-[13px] leading-relaxed text-slate-600">
          {comment.content}
        </p>
      )}
    </div>
  );
}
