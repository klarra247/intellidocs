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

  if (score <= 1) return { label: '약함', color: 'bg-red-400', width: 'w-1/3' };
  if (score <= 3) return { label: '보통', color: 'bg-amber-400', width: 'w-2/3' };
  return { label: '강함', color: 'bg-emerald-400', width: 'w-full' };
}

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

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-[13px] text-red-600">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="name" className="block text-[13px] font-medium text-slate-700">
          이름
        </label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="홍길동"
          autoComplete="name"
          className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-[14px] text-slate-900 placeholder:text-slate-400 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100 transition-colors"
        />
      </div>

      <div>
        <label htmlFor="reg-email" className="block text-[13px] font-medium text-slate-700">
          이메일
        </label>
        <input
          id="reg-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
          className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-[14px] text-slate-900 placeholder:text-slate-400 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100 transition-colors"
        />
      </div>

      <div>
        <label htmlFor="reg-password" className="block text-[13px] font-medium text-slate-700">
          비밀번호
        </label>
        <div className="relative mt-1.5">
          <input
            id="reg-password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="영문, 숫자, 특수문자 포함 8자 이상"
            autoComplete="new-password"
            className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 pr-10 text-[14px] text-slate-900 placeholder:text-slate-400 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100 transition-colors"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {password && (
          <div className="mt-2 flex items-center gap-2">
            <div className="h-1.5 flex-1 rounded-full bg-slate-100">
              <div className={`h-full rounded-full transition-all ${strength.color} ${strength.width}`} />
            </div>
            <span className="text-[11px] font-medium text-slate-500">{strength.label}</span>
          </div>
        )}
      </div>

      <div>
        <label htmlFor="confirm-password" className="block text-[13px] font-medium text-slate-700">
          비밀번호 확인
        </label>
        <input
          id="confirm-password"
          type={showPassword ? 'text' : 'password'}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="비밀번호를 다시 입력해주세요"
          autoComplete="new-password"
          className={`mt-1.5 w-full rounded-lg border bg-white px-3.5 py-2.5 text-[14px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-colors ${
            passwordMismatch
              ? 'border-red-300 focus:border-red-400 focus:ring-red-100'
              : 'border-slate-200 focus:border-primary-400 focus:ring-primary-100'
          }`}
        />
        {passwordMismatch && (
          <p className="mt-1 text-[12px] text-red-500">비밀번호가 일치하지 않습니다</p>
        )}
      </div>

      <button
        type="submit"
        disabled={loading}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-[14px] font-semibold text-white transition-colors hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        회원가입
      </button>
    </form>
  );
}
