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
    <div className="flex h-full w-[360px] flex-shrink-0 flex-col border-l border-slate-200 bg-white animate-slide-in-left">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-slate-500" />
          <span className="text-[13px] font-medium text-slate-700">
            코멘트 ({comments.length})
          </span>
        </div>
        <button
          onClick={closeCommentPanel}
          className="flex h-6 w-6 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Comments list */}
      <div className="flex-1 overflow-y-auto">
        {commentsLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
          </div>
        ) : comments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <MessageSquare className="mb-2 h-8 w-8 text-slate-300" />
            <p className="text-[13px] text-slate-400">아직 코멘트가 없습니다</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {comments.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                onUpdate={(commentId, content) =>
                  updateComment(commentPanelMessageId, commentId, content)
                }
                onDelete={(commentId) =>
                  deleteComment(commentPanelMessageId, commentId)
                }
              />
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
