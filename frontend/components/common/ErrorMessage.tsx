'use client';

import { useState } from 'react';

interface ErrorMessageProps {
  message: string;
  onRetry?: () => void;
}

export default function ErrorMessage({ message, onRetry }: ErrorMessageProps) {
  const [retryHover, setRetryHover] = useState(false);

  return (
    <div
      className="animate-fade-in rounded-[8px] px-5 py-4"
      style={{
        backgroundColor: 'color-mix(in srgb, var(--error) 8%, var(--bg-primary))',
        border: '1px solid color-mix(in srgb, var(--error) 20%, var(--bg-primary))',
      }}
    >
      <p className="text-[13px] font-medium" style={{ color: 'var(--error)' }}>{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-2 text-[12px] font-medium underline underline-offset-2"
          style={{
            color: retryHover ? 'var(--error)' : 'color-mix(in srgb, var(--error) 80%, var(--bg-primary))',
            textDecorationColor: 'color-mix(in srgb, var(--error) 30%, var(--bg-primary))',
          }}
          onMouseEnter={() => setRetryHover(true)}
          onMouseLeave={() => setRetryHover(false)}
        >
          다시 시도
        </button>
      )}
    </div>
  );
}
