'use client';

import { useState } from 'react';
import { MessageSquare, FileText } from 'lucide-react';
import ChatContainer from '@/components/chat/ChatContainer';
import DocumentSelector from '@/components/chat/DocumentSelector';
import SessionList from '@/components/chat/SessionList';
import CommentPanel from '@/components/chat/CommentPanel';
import { useChatStore } from '@/stores/chatStore';

type LeftTab = 'sessions' | 'documents';

export default function ChatPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [leftTab, setLeftTab] = useState<LeftTab>('sessions');
  const commentPanelMessageId = useChatStore((s) => s.commentPanelMessageId);

  return (
    <div className="flex h-full overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
      {/* Left Panel — SessionList / DocumentSelector */}
      <div
        className={`flex flex-shrink-0 flex-col transition-all duration-200 ${
          sidebarOpen ? 'w-[260px]' : 'w-0 overflow-hidden'
        }`}
        style={{
          borderRight: sidebarOpen ? '1px solid var(--border)' : 'none',
          background: 'var(--bg-secondary)',
        }}
      >
        {/* Tab switcher */}
        <div className="flex" style={{ borderBottom: '1px solid var(--border)' }}>
          <button
            onClick={() => setLeftTab('sessions')}
            className="flex flex-1 items-center justify-center gap-1.5 py-2.5 text-[12px] font-medium transition-colors"
            style={{
              background: leftTab === 'sessions' ? 'var(--bg-active)' : 'transparent',
              color: leftTab === 'sessions' ? 'var(--text-primary)' : 'var(--text-tertiary)',
            }}
          >
            <MessageSquare className="h-3.5 w-3.5" strokeWidth={1.6} />
            세션
          </button>
          <button
            onClick={() => setLeftTab('documents')}
            className="flex flex-1 items-center justify-center gap-1.5 py-2.5 text-[12px] font-medium transition-colors"
            style={{
              background: leftTab === 'documents' ? 'var(--bg-active)' : 'transparent',
              color: leftTab === 'documents' ? 'var(--text-primary)' : 'var(--text-tertiary)',
            }}
          >
            <FileText className="h-3.5 w-3.5" strokeWidth={1.6} />
            문서
          </button>
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-hidden">
          {leftTab === 'sessions' ? <SessionList /> : <DocumentSelector />}
        </div>
      </div>

      {/* Center — Chat Area */}
      <div className="flex min-w-0 flex-1 flex-col">
        <ChatContainer
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        />
      </div>

      {/* Right Panel — Comment Panel */}
      {commentPanelMessageId && <CommentPanel />}
    </div>
  );
}
