'use client';

import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileUp, FileSpreadsheet, FileType2, FileText } from 'lucide-react';
import { useDocumentStore } from '@/stores/documentStore';
import UploadProgress from './UploadProgress';

const ACCEPTED_TYPES: Record<string, string[]> = {
  'application/pdf': ['.pdf'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'text/plain': ['.txt'],
  'text/markdown': ['.md'],
};

const FILE_TYPE_BADGES = [
  { label: 'PDF', color: 'bg-red-50 text-red-600 ring-red-100' },
  { label: 'DOCX', color: 'bg-blue-50 text-blue-600 ring-blue-100' },
  { label: 'XLSX', color: 'bg-emerald-50 text-emerald-600 ring-emerald-100' },
  { label: 'TXT', color: 'bg-slate-50 text-slate-600 ring-slate-200' },
  { label: 'MD', color: 'bg-purple-50 text-purple-600 ring-purple-100' },
];

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
        className={`group relative cursor-pointer overflow-hidden rounded-xl border-2 border-dashed transition-all duration-200 ${
          isDragReject
            ? 'border-red-300 bg-red-50'
            : isDragActive
              ? 'border-primary-400 bg-primary-50/60 shadow-sm'
              : 'border-slate-200 bg-white hover:border-primary-300 hover:bg-slate-50/50'
        }`}
      >
        <input {...getInputProps()} />

        <div className="flex flex-col items-center py-10">
          {/* Icon */}
          <div
            className={`mb-3 flex h-12 w-12 items-center justify-center rounded-xl transition-all duration-200 ${
              isDragActive
                ? 'bg-primary-100 text-primary-600 scale-110'
                : 'bg-slate-100 text-slate-400 group-hover:bg-primary-50 group-hover:text-primary-500'
            }`}
          >
            {isDragActive ? (
              <FileUp className="h-5 w-5" strokeWidth={2} />
            ) : (
              <Upload className="h-5 w-5" strokeWidth={2} />
            )}
          </div>

          {/* Text */}
          <p
            className={`text-sm font-semibold transition-colors ${
              isDragActive ? 'text-primary-700' : 'text-slate-700'
            }`}
          >
            {isDragReject
              ? '지원하지 않는 형식입니다'
              : isDragActive
                ? '여기에 놓으세요'
                : '클릭하거나 파일을 드래그하여 업로드'}
          </p>
          <p className="mt-1.5 text-xs text-slate-400">
            최대 50MB까지 지원
          </p>

          {/* File type badges */}
          <div className="mt-4 flex gap-1.5">
            {FILE_TYPE_BADGES.map(({ label, color }) => (
              <span
                key={label}
                className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${color}`}
              >
                {label}
              </span>
            ))}
          </div>
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
