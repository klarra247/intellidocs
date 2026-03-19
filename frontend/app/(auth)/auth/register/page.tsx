'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/stores/authStore';
import RegisterForm from '@/components/auth/RegisterForm';
import GoogleLoginButton from '@/components/auth/GoogleLoginButton';

export default function RegisterPage() {
  const { isAuthenticated, isLoading } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push('/workspace');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading || isAuthenticated) return null;

  return (
    <div className="w-full max-w-[400px] px-6 animate-fade-in">
      {/* Logo */}
      <div className="mb-8 text-center">
        <h1
          className="text-[22px] font-bold tracking-heading"
          style={{ color: 'var(--text-primary)' }}
        >
          IntelliDocs
        </h1>
        <p className="mt-1.5 text-[14px]" style={{ color: 'var(--text-secondary)' }}>
          새 계정을 만들어보세요
        </p>
      </div>

      <RegisterForm />

      {/* Divider */}
      <div className="my-6 flex items-center gap-3">
        <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
        <span className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>또는</span>
        <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
      </div>

      <GoogleLoginButton />

      {/* Login link */}
      <p className="mt-8 text-center text-[14px]" style={{ color: 'var(--text-secondary)' }}>
        이미 계정이 있으신가요?{' '}
        <Link href="/auth/login" className="font-medium" style={{ color: 'var(--accent)' }}>
          로그인
        </Link>
      </p>
    </div>
  );
}
