'use client';

import { useEffect } from 'react';
import { Plus, AlertCircle, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import MessageList from './MessageList';
import ChatInput from './ChatInput';
import { useChatStore } from '@/stores/chatStore';

interface ChatContainerProps {
  sidebarOpen?: boolean;
  onToggleSidebar?: () => void;
}

export default function ChatContainer({ sidebarOpen, onToggleSidebar }: ChatContainerProps) {
  const { error, clearChat, stopStreaming, streaming, messages } = useChatStore();

  // Cleanup SSE on unmount
  useEffect(() => {
    return () => {
      stopStreaming();
    };
  }, [stopStreaming]);

  return (
    <div className="flex h-full flex-col">
      {/* Header bar — always visible */}
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2">
        <div className="flex items-center gap-2">
          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-600"
              title={sidebarOpen ? '패널 닫기' : '문서 선택'}
            >
              {sidebarOpen ? (
                <PanelLeftClose className="h-3.5 w-3.5" />
              ) : (
                <PanelLeftOpen className="h-3.5 w-3.5" />
              )}
            </button>
          )}
          <span className="text-[13px] font-medium text-slate-700">AI 채팅</span>
        </div>
        <button
          onClick={clearChat}
          disabled={streaming || messages.length === 0}
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40"
        >
          <Plus className="h-3.5 w-3.5" />
          새 채팅
        </button>
      </div>

      {/* Messages */}
      <MessageList />

      {/* Error banner */}
      {error && (
        <div className="mx-4 mb-2 flex items-center gap-2 rounded-lg bg-red-50 px-4 py-2.5 text-[13px] text-red-600 animate-slide-up">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span className="flex-1">{error}</span>
        </div>
      )}

      {/* Input */}
      <ChatInput />
    </div>
  );
}
