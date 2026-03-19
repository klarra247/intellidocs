'use client';

import { X, MessageSquare, Loader2 } from 'lucide-react';
import { useChatStore } from '@/stores/chatStore';
import CommentInput from './CommentInput';
import CommentItem from './CommentItem';

export default function CommentPanel() {
  const {
    commentPanelMessageId,
    comments,
    commentsLoading,
    closeCommentPanel,
    createComment,
    updateComment,
    deleteComment,
  } = useChatStore();

  if (!commentPanelMessageId) return null;

  return (
    <div
      className="flex h-full w-[360px] flex-shrink-0 flex-col animate-slide-in-left"
      style={{ borderLeft: '1px solid var(--border)', backgroundColor: 'var(--bg-primary)' }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4" style={{ color: 'var(--text-secondary)' }} />
          <span className="text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>
            코멘트 ({comments.length})
          </span>
        </div>
        <button
          onClick={closeCommentPanel}
          className="flex h-6 w-6 items-center justify-center rounded-[6px]"
          style={{ color: 'var(--text-tertiary)' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
            e.currentTarget.style.color = 'var(--text-secondary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = 'var(--text-tertiary)';
          }}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Comments list */}
      <div className="flex-1 overflow-y-auto">
        {commentsLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin" style={{ color: 'var(--text-tertiary)' }} />
          </div>
        ) : comments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <MessageSquare className="mb-2 h-8 w-8" style={{ color: 'var(--text-tertiary)' }} />
            <p className="text-[13px]" style={{ color: 'var(--text-tertiary)' }}>아직 코멘트가 없습니다</p>
          </div>
        ) : (
          <div style={{ borderColor: 'var(--border)' }}>
            {comments.map((comment, idx) => (
              <div key={comment.id} style={idx > 0 ? { borderTop: '1px solid var(--border)' } : undefined}>
                <CommentItem
                  comment={comment}
                  onUpdate={(commentId, content) =>
                    updateComment(commentPanelMessageId, commentId, content)
                  }
                  onDelete={(commentId) =>
                    deleteComment(commentPanelMessageId, commentId)
                  }
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Input */}
      <CommentInput
        onSubmit={(content) => createComment(commentPanelMessageId, content)}
      />
    </div>
  );
}
