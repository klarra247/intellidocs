'use client';

import { useRef } from 'react';
import { useVersionStore } from '@/stores/versionStore';
import { Upload, Loader2 } from 'lucide-react';

interface VersionUploadButtonProps {
  documentId: string;
}

export default function VersionUploadButton({ documentId }: VersionUploadButtonProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploading, uploadNewVersion } = useVersionStore();

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadNewVersion(documentId, file);
    // Reset input so same file can be selected again
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept=".pdf,.docx,.xlsx,.txt,.md"
        onChange={handleFileChange}
      />
      <button
        onClick={handleClick}
        disabled={uploading}
        className="w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-2.5 text-[12px] font-medium text-slate-600 hover:border-primary-300 hover:bg-primary-50 hover:text-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {uploading ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            업로드 중...
          </>
        ) : (
          <>
            <Upload className="h-3.5 w-3.5" />
            새 버전 업로드
          </>
        )}
      </button>
    </>
  );
}
