'use client';

import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileUp } from 'lucide-react';
import { useDocumentStore } from '@/stores/documentStore';
import UploadProgress from './UploadProgress';

const ACCEPTED_TYPES: Record<string, string[]> = {
  'application/pdf': ['.pdf'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'text/plain': ['.txt'],
  'text/markdown': ['.md'],
};

const FILE_TYPES = ['PDF', 'DOCX', 'XLSX', 'TXT', 'MD'];

export default function UploadZone() {
  const { uploadDocument, uploadingFiles } = useDocumentStore();

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      for (const file of acceptedFiles) {
        uploadDocument(file);
      }
    },
    [uploadDocument],
  );

  const { getRootProps, getInputProps, isDragActive, isDragReject } =
    useDropzone({
      onDrop,
      accept: ACCEPTED_TYPES,
      multiple: true,
    });

  const uploadEntries = Array.from(uploadingFiles.values());

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        {...getRootProps()}
        className="group relative cursor-pointer overflow-hidden rounded-[6px] transition-all duration-200"
        style={{
          border: `2px dashed ${isDragReject ? 'var(--error)' : isDragActive ? 'var(--accent)' : 'var(--border)'}`,
          background: isDragReject
            ? '#fdf2f2'
            : isDragActive
              ? 'var(--accent-light)'
              : 'var(--bg-primary)',
        }}
        onMouseEnter={(e) => {
          if (!isDragActive && !isDragReject) {
            e.currentTarget.style.borderColor = 'var(--border-strong)';
            e.currentTarget.style.background = 'var(--bg-secondary)';
          }
        }}
        onMouseLeave={(e) => {
          if (!isDragActive && !isDragReject) {
            e.currentTarget.style.borderColor = 'var(--border)';
            e.currentTarget.style.background = 'var(--bg-primary)';
          }
        }}
      >
        <input {...getInputProps()} />

        <div className="flex flex-col items-center py-8">
          {/* Icon */}
          <div
            className="mb-3 flex h-10 w-10 items-center justify-center rounded-[8px]"
            style={{
              background: isDragActive ? 'var(--accent-light)' : 'var(--bg-secondary)',
              color: isDragActive ? 'var(--accent)' : 'var(--text-tertiary)',
            }}
          >
            {isDragActive ? (
              <FileUp className="h-5 w-5" strokeWidth={1.8} />
            ) : (
              <Upload className="h-5 w-5" strokeWidth={1.8} />
            )}
          </div>

          {/* Text */}
          <p
            className="text-[14px] font-medium"
            style={{ color: isDragActive ? 'var(--accent)' : 'var(--text-primary)' }}
          >
            {isDragReject
              ? '지원하지 않는 형식입니다'
              : isDragActive
                ? '여기에 놓으세요'
                : '클릭하거나 파일을 드래그하여 업로드'}
          </p>
          <p className="mt-1 text-[12px]" style={{ color: 'var(--text-tertiary)' }}>
            {FILE_TYPES.join(', ')} · 최대 50MB
          </p>
        </div>
      </div>

      {/* Upload queue */}
      {uploadEntries.length > 0 && (
        <div className="space-y-2">
          {uploadEntries.map((entry) => (
            <UploadProgress key={entry.id} entry={entry} />
          ))}
        </div>
      )}
    </div>
  );
}
