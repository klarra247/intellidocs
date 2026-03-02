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
        className="modal-backdrop absolute inset-0 bg-slate-900/30 animate-fade-in"
        onClick={onCancel}
      />

      {/* Modal */}
      <div className="animate-scale-in relative mx-4 w-full max-w-sm rounded-2xl bg-white p-6 shadow-modal">
        {/* Close button */}
        <button
          onClick={onCancel}
          className="absolute right-3 top-3 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Icon */}
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-red-50">
          <AlertTriangle className="h-5 w-5 text-red-500" strokeWidth={2} />
        </div>

        {/* Content */}
        <h3 className="mt-4 text-center text-[15px] font-semibold text-slate-900">
          문서를 삭제하시겠습니까?
        </h3>
        <p className="mt-1.5 text-center text-[13px] leading-5 text-slate-500">
          <span className="font-medium text-slate-700">{filename}</span>
          <br />
          삭제 후에는 복구할 수 없습니다.
        </p>

        {/* Actions */}
        <div className="mt-5 flex gap-2.5">
          <button
            ref={cancelRef}
            onClick={onCancel}
            className="flex-1 rounded-lg border border-slate-200 px-4 py-2 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            취소
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 rounded-lg bg-red-500 px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-red-600"
          >
            삭제
          </button>
        </div>
      </div>
    </div>
  );
}
