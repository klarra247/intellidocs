'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Plus, Loader2, MessageSquare, FileText } from 'lucide-react';
import { useChatStore } from '@/stores/chatStore';
import { useDocumentStore } from '@/stores/documentStore';
import SessionItem from './SessionItem';

export default function SessionList() {
  const {
    sessions,
    sessionsLoading,
    sessionId,
    loadSessions,
    selectSession,
    shareSession,
    unshareSession,
    clearChat,
  } = useChatStore();
  const documents = useDocumentStore((s) => s.documents);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const mySessions = sessions.filter((s) => s.isOwner);
  const sharedSessions = sessions.filter((s) => !s.isOwner);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2.5"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <span className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>
          채팅 세션
        </span>
        <button
          onClick={clearChat}
          className="flex h-7 w-7 items-center justify-center rounded-[4px] transition-colors"
          style={{ color: 'var(--text-tertiary)' }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          title="새 채팅"
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={1.6} />
        </button>
      </div>

      {/* Session list */}
      <div className="flex-1 overflow-y-auto px-2 py-2">
        {sessionsLoading && sessions.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin" style={{ color: 'var(--text-tertiary)' }} />
          </div>
        ) : sessions.length === 0 ? (
          documents.length > 0 ? (
            <div className="flex flex-col items-center px-4 py-10">
              <MessageSquare className="h-10 w-10" style={{ color: 'var(--text-tertiary)' }} strokeWidth={1.2} />
              <p className="mt-3 text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>
                AI에게 문서에 대해 물어보세요
              </p>
              <p className="mt-1 text-[12px] text-center" style={{ color: 'var(--text-secondary)' }}>
                업로드된 문서를 기반으로 AI가 답변합니다
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center px-4 py-10">
              <FileText className="h-10 w-10" style={{ color: 'var(--text-tertiary)' }} strokeWidth={1.2} />
              <p className="mt-3 text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>
                먼저 문서를 업로드해주세요
              </p>
              <Link href="/workspace" className="mt-2 text-[12px] font-medium" style={{ color: 'var(--accent)' }}>
                문서 업로드하러 가기
              </Link>
            </div>
          )
        ) : (
          <>
            {/* My sessions */}
            {mySessions.length > 0 && (
              <div className="mb-3">
                <p
                  className="mb-1 px-3 text-[11px] font-medium"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  내 채팅
                </p>
                <div className="space-y-0.5">
                  {mySessions.map((s) => (
                    <SessionItem
                      key={s.id}
                      session={s}
                      isActive={sessionId === s.id}
                      onClick={() => selectSession(s.id)}
                      onShare={() => shareSession(s.id)}
                      onUnshare={() => unshareSession(s.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Shared sessions */}
            {sharedSessions.length > 0 && (
              <div>
                <p
                  className="mb-1 px-3 text-[11px] font-medium"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  공유된 채팅
                </p>
                <div className="space-y-0.5">
                  {sharedSessions.map((s) => (
                    <SessionItem
                      key={s.id}
                      session={s}
                      isActive={sessionId === s.id}
                      onClick={() => selectSession(s.id)}
                      onShare={() => shareSession(s.id)}
                      onUnshare={() => unshareSession(s.id)}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
