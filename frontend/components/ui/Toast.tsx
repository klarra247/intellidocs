'use client';

import { CheckCircle, XCircle } from 'lucide-react';
import { useChatStore } from '@/stores/chatStore';

export default function Toast() {
  const toast = useChatStore((s) => s.toast);

  if (!toast) return null;

  const isSuccess = toast.type === 'success';

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-slide-up">
      <div
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          borderRadius: '8px',
          padding: '10px 16px',
          background: 'var(--bg-primary)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-md)',
          overflow: 'hidden',
        }}
      >
        {/* Left status bar */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: '3px',
            background: isSuccess ? 'var(--success)' : 'var(--error)',
          }}
        />
        {isSuccess ? (
          <CheckCircle
            className="h-4 w-4 flex-shrink-0"
            style={{ color: 'var(--success)' }}
          />
        ) : (
          <XCircle
            className="h-4 w-4 flex-shrink-0"
            style={{ color: 'var(--error)' }}
          />
        )}
        <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>
          {toast.message}
        </span>
      </div>
    </div>
  );
}
