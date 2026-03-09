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
    <div className="flex h-full overflow-hidden">
      {/* Left Panel — SessionList / DocumentSelector */}
      <div
        className={`flex flex-shrink-0 flex-col border-r border-slate-200/80 bg-white transition-all duration-200 ${
          sidebarOpen ? 'w-[260px]' : 'w-0 overflow-hidden border-r-0'
        }`}
      >
        {/* Tab switcher */}
        <div className="flex border-b border-slate-100">
          <button
            onClick={() => setLeftTab('sessions')}
            className={`flex flex-1 items-center justify-center gap-1.5 py-2.5 text-[12px] font-medium transition-colors ${
              leftTab === 'sessions'
                ? 'border-b-2 border-primary-500 text-primary-600'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            세션
          </button>
          <button
            onClick={() => setLeftTab('documents')}
            className={`flex flex-1 items-center justify-center gap-1.5 py-2.5 text-[12px] font-medium transition-colors ${
              leftTab === 'documents'
                ? 'border-b-2 border-primary-500 text-primary-600'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
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
