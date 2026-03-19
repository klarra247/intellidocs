'use client';

import { useEffect, useRef } from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface DeleteConfirmModalProps {
  filename: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function DeleteConfirmModal({
  filename,
  onConfirm,
  onCancel,
}: DeleteConfirmModalProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    cancelRef.current?.focus();

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 animate-fade-in"
        style={{ background: 'rgba(0, 0, 0, 0.2)' }}
        onClick={onCancel}
      />

      {/* Modal */}
      <div
        className="animate-scale-in relative mx-4 w-full max-w-sm rounded-[8px] p-6"
        style={{
          background: 'var(--bg-primary)',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        {/* Close button */}
        <button
          onClick={onCancel}
          className="absolute right-3 top-3 rounded-[4px] p-1.5 transition-colors"
          style={{ color: 'var(--text-tertiary)' }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          <X className="h-4 w-4" />
        </button>

        {/* Icon */}
        <div
          className="mx-auto flex h-10 w-10 items-center justify-center rounded-full"
          style={{ background: '#fdf2f2' }}
        >
          <AlertTriangle className="h-5 w-5" style={{ color: 'var(--error)' }} strokeWidth={2} />
        </div>

        {/* Content */}
        <h3
          className="mt-4 text-center text-[15px] font-semibold"
          style={{ color: 'var(--text-primary)' }}
        >
          문서를 삭제하시겠습니까?
        </h3>
        <p className="mt-1.5 text-center text-[13px] leading-5" style={{ color: 'var(--text-secondary)' }}>
          <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{filename}</span>
          <br />
          삭제 후에는 복구할 수 없습니다.
        </p>

        {/* Actions */}
        <div className="mt-5 flex gap-2.5">
          <button
            ref={cancelRef}
            onClick={onCancel}
            className="flex-1 rounded-[6px] px-4 py-2 text-[13px] font-medium transition-colors"
            style={{
              border: '1px solid var(--border)',
              color: 'var(--text-primary)',
              background: 'var(--bg-primary)',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--bg-primary)')}
          >
            취소
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 rounded-[6px] px-4 py-2 text-[13px] font-medium text-white transition-colors"
            style={{ background: 'var(--error)' }}
          >
            삭제
          </button>
        </div>
      </div>
    </div>
  );
}
