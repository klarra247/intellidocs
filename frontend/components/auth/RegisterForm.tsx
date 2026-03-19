'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';

function getPasswordStrength(pw: string): { label: string; color: string; width: string } {
  if (!pw) return { label: '', color: '', width: 'w-0' };
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[a-zA-Z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[@$!%*?&]/.test(pw)) score++;

  if (score <= 1) return { label: '약함', color: 'var(--error)', width: '33%' };
  if (score <= 3) return { label: '보통', color: 'var(--warning)', width: '66%' };
  return { label: '강함', color: 'var(--success)', width: '100%' };
}

const inputStyle = {
  border: '1px solid var(--border)',
  color: 'var(--text-primary)',
  background: 'var(--bg-primary)',
};

export default function RegisterForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const register = useAuthStore((s) => s.register);
  const router = useRouter();

  const strength = getPasswordStrength(password);
  const passwordMismatch = confirmPassword.length > 0 && password !== confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name || !email || !password || !confirmPassword) {
      setError('모든 필드를 입력해주세요');
      return;
    }
    if (password !== confirmPassword) {
      setError('비밀번호가 일치하지 않습니다');
      return;
    }
    if (password.length < 8) {
      setError('비밀번호는 8자 이상이어야 합니다');
      return;
    }

    setLoading(true);
    try {
      await register(email, password, name);
      router.push('/workspace');
    } catch (err) {
      setError(err instanceof Error ? err.message : '회원가입에 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.borderColor = passwordMismatch && e.currentTarget.id === 'confirm-password'
      ? 'var(--error)' : 'var(--accent)';
  };
  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.borderColor = passwordMismatch && e.currentTarget.id === 'confirm-password'
      ? 'var(--error)' : 'var(--border)';
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
        <label htmlFor="name" className="block text-[13px] font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
          이름
        </label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="홍길동"
          autoComplete="name"
          className="w-full rounded-[6px] px-3 py-[10px] text-[14px] outline-none transition-colors"
          style={inputStyle}
          onFocus={handleFocus}
          onBlur={handleBlur}
        />
      </div>

      <div>
        <label htmlFor="reg-email" className="block text-[13px] font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
          이메일
        </label>
        <input
          id="reg-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
          className="w-full rounded-[6px] px-3 py-[10px] text-[14px] outline-none transition-colors"
          style={inputStyle}
          onFocus={handleFocus}
          onBlur={handleBlur}
        />
      </div>

      <div>
        <label htmlFor="reg-password" className="block text-[13px] font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
          비밀번호
        </label>
        <div className="relative">
          <input
            id="reg-password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="영문, 숫자, 특수문자 포함 8자 이상"
            autoComplete="new-password"
            className="w-full rounded-[6px] px-3 py-[10px] pr-10 text-[14px] outline-none transition-colors"
            style={inputStyle}
            onFocus={handleFocus}
            onBlur={handleBlur}
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
        {password && (
          <div className="mt-2 flex items-center gap-2">
            <div className="h-1 flex-1 rounded-full" style={{ background: 'var(--bg-hover)' }}>
              <div className="h-full rounded-full transition-all" style={{ background: strength.color, width: strength.width }} />
            </div>
            <span className="text-[11px] font-medium" style={{ color: 'var(--text-secondary)' }}>
              {strength.label}
            </span>
          </div>
        )}
      </div>

      <div>
        <label htmlFor="confirm-password" className="block text-[13px] font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
          비밀번호 확인
        </label>
        <input
          id="confirm-password"
          type={showPassword ? 'text' : 'password'}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="비밀번호를 다시 입력해주세요"
          autoComplete="new-password"
          className="w-full rounded-[6px] px-3 py-[10px] text-[14px] outline-none transition-colors"
          style={{
            ...inputStyle,
            borderColor: passwordMismatch ? 'var(--error)' : 'var(--border)',
          }}
          onFocus={handleFocus}
          onBlur={handleBlur}
        />
        {passwordMismatch && (
          <p className="mt-1 text-[12px]" style={{ color: 'var(--error)' }}>
            비밀번호가 일치하지 않습니다
          </p>
        )}
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
        회원가입
      </button>
    </form>
  );
}
