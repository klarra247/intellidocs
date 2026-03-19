'use client';

import { useRef, useState } from 'react';
import { useVersionStore } from '@/stores/versionStore';
import { Upload, Loader2 } from 'lucide-react';

interface VersionUploadButtonProps {
  documentId: string;
}

export default function VersionUploadButton({ documentId }: VersionUploadButtonProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploading, uploadNewVersion } = useVersionStore();
  const [hovered, setHovered] = useState(false);

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
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className="w-full flex items-center justify-center gap-2 rounded-[8px] px-4 py-2.5 text-[12px] font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        style={{
          border: `1px dashed ${hovered && !uploading ? 'var(--accent)' : 'var(--border-strong)'}`,
          backgroundColor: hovered && !uploading ? 'var(--accent-light)' : 'var(--bg-secondary)',
          color: hovered && !uploading ? 'var(--accent)' : 'var(--text-secondary)',
        }}
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
