'use client';

import { useEffect } from 'react';
import { CheckCircle, XCircle, X } from 'lucide-react';
import { useChatStore } from '@/stores/chatStore';

export default function Toast() {
  const toast = useChatStore((s) => s.toast);

  if (!toast) return null;

  const isSuccess = toast.type === 'success';

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-slide-up">
      <div
        className={`flex items-center gap-2.5 rounded-xl px-4 py-3 shadow-lg ${
          isSuccess
            ? 'bg-emerald-600 text-white'
            : 'bg-red-600 text-white'
        }`}
      >
        {isSuccess ? (
          <CheckCircle className="h-4 w-4 flex-shrink-0" />
        ) : (
          <XCircle className="h-4 w-4 flex-shrink-0" />
        )}
        <span className="text-[13px] font-medium">{toast.message}</span>
      </div>
    </div>
  );
}
