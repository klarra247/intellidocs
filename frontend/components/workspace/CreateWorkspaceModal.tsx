'use client';

import { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { useWorkspaceStore } from '@/stores/workspaceStore';

interface CreateWorkspaceModalProps {
  onClose: () => void;
}

export default function CreateWorkspaceModal({ onClose }: CreateWorkspaceModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const createWorkspace = useWorkspaceStore((s) => s.createWorkspace);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('워크스페이스 이름을 입력해주세요');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await createWorkspace(name.trim(), description.trim() || undefined);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : '워크스페이스 생성에 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {/* Backdrop */}
      <div
        className="animate-fade-in"
        onClick={onClose}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0,0,0,0.4)',
        }}
      />

      {/* Modal */}
      <div
        className="animate-scale-in"
        style={{
          position: 'relative',
          margin: '0 16px',
          width: '100%',
          maxWidth: '448px',
          borderRadius: '12px',
          background: 'var(--bg-primary)',
          padding: '24px',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            right: '12px',
            top: '12px',
            borderRadius: '4px',
            padding: '6px',
            color: 'var(--text-tertiary)',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background 0.15s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          <X className="h-4 w-4" />
        </button>

        <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
          새 워크스페이스 만들기
        </h3>
        <p style={{ marginTop: '4px', fontSize: '13px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
          팀원들과 문서를 공유할 워크스페이스를 만드세요.
        </p>

        <form onSubmit={handleSubmit} style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {error && (
            <div
              style={{
                borderRadius: '6px',
                background: '#fdf2f2',
                padding: '10px 16px',
                fontSize: '13px',
                color: 'var(--error)',
              }}
            >
              {error}
            </div>
          )}

          <div>
            <label
              htmlFor="ws-name"
              style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '6px' }}
            >
              이름 <span style={{ color: 'var(--error)' }}>*</span>
            </label>
            <input
              id="ws-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="프로젝트 워크스페이스"
              autoFocus
              style={{
                width: '100%',
                borderRadius: '6px',
                border: '1px solid var(--border)',
                background: 'var(--bg-primary)',
                padding: '8px 14px',
                fontSize: '14px',
                color: 'var(--text-primary)',
                outline: 'none',
                transition: 'border-color 0.15s',
                boxSizing: 'border-box',
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--accent)')}
              onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
            />
          </div>

          <div>
            <label
              htmlFor="ws-desc"
              style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '6px' }}
            >
              설명
            </label>
            <input
              id="ws-desc"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="워크스페이스에 대한 간단한 설명 (선택)"
              style={{
                width: '100%',
                borderRadius: '6px',
                border: '1px solid var(--border)',
                background: 'var(--bg-primary)',
                padding: '8px 14px',
                fontSize: '14px',
                color: 'var(--text-primary)',
                outline: 'none',
                transition: 'border-color 0.15s',
                boxSizing: 'border-box',
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--accent)')}
              onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
            />
          </div>

          <div style={{ display: 'flex', gap: '10px', paddingTop: '4px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                borderRadius: '6px',
                border: '1px solid var(--border)',
                padding: '8px 16px',
                fontSize: '13px',
                fontWeight: 500,
                color: 'var(--text-primary)',
                background: 'transparent',
                cursor: 'pointer',
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              취소
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                borderRadius: '6px',
                border: 'none',
                padding: '8px 16px',
                fontSize: '13px',
                fontWeight: 600,
                color: '#ffffff',
                background: 'var(--accent)',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.5 : 1,
                transition: 'opacity 0.15s',
              }}
            >
              {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              만들기
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
