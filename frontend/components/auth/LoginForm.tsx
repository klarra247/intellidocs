'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const login = useAuthStore((s) => s.login);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('이메일과 비밀번호를 입력해주세요');
      return;
    }

    setLoading(true);
    try {
      await login(email, password);
      router.push(redirectTo || '/workspace');
    } catch (err) {
      setError(err instanceof Error ? err.message : '로그인에 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div
          className="rounded-[6px] px-3.5 py-2.5 text-[13px]"
          style={{ background: '#fdf2f2', color: 'var(--error)' }}
        >
          {error}
        </div>
      )}

      <div>
        <label
          htmlFor="email"
          className="block text-[13px] font-medium mb-1.5"
          style={{ color: 'var(--text-primary)' }}
        >
          이메일
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
          className="w-full rounded-[6px] px-3 py-[10px] text-[14px] outline-none transition-colors"
          style={{
            border: '1px solid var(--border)',
            color: 'var(--text-primary)',
            background: 'var(--bg-primary)',
          }}
          onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--accent)')}
          onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
        />
      </div>

      <div>
        <label
          htmlFor="password"
          className="block text-[13px] font-medium mb-1.5"
          style={{ color: 'var(--text-primary)' }}
        >
          비밀번호
        </label>
        <div className="relative">
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
            className="w-full rounded-[6px] px-3 py-[10px] pr-10 text-[14px] outline-none transition-colors"
            style={{
              border: '1px solid var(--border)',
              color: 'var(--text-primary)',
              background: 'var(--bg-primary)',
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--accent)')}
            onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
            style={{ color: 'var(--text-tertiary)' }}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="flex w-full items-center justify-center gap-2 rounded-[6px] px-4 py-[10px] text-[14px] font-medium text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ background: 'var(--accent)' }}
        onMouseEnter={(e) => !loading && (e.currentTarget.style.background = 'var(--accent-hover)')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--accent)')}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        로그인
      </button>
    </form>
  );
}
