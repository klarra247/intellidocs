'use client';

import { useState } from 'react';
import ChatContainer from '@/components/chat/ChatContainer';
import DocumentSelector from '@/components/chat/DocumentSelector';

export default function ChatPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="flex h-full">
      {/* Document Selector Panel */}
      <div
        className={`flex-shrink-0 border-r border-slate-200/80 bg-white transition-all duration-200 ${
          sidebarOpen ? 'w-[240px]' : 'w-0 overflow-hidden border-r-0'
        }`}
      >
        <DocumentSelector />
      </div>

      {/* Chat Area */}
      <div className="flex min-w-0 flex-1 flex-col">
        <ChatContainer
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        />
      </div>
    </div>
  );
}
