'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FileText } from 'lucide-react';
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
    <div className="w-full max-w-md animate-slide-up">
      <div className="rounded-2xl border border-slate-200/80 bg-white p-8 shadow-sm">
        {/* Logo */}
        <div className="mb-6 flex flex-col items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-600">
            <FileText className="h-5 w-5 text-white" strokeWidth={2.5} />
          </div>
          <h1 className="text-lg font-bold text-slate-900">IntelliDocs</h1>
          <p className="text-[13px] text-slate-500">새 계정을 만들어보세요</p>
        </div>

        <RegisterForm />

        {/* Divider */}
        <div className="my-5 flex items-center gap-3">
          <div className="flex-1 border-t border-slate-200" />
          <span className="text-[12px] text-slate-400">또는</span>
          <div className="flex-1 border-t border-slate-200" />
        </div>

        <GoogleLoginButton />

        {/* Login link */}
        <p className="mt-6 text-center text-[13px] text-slate-500">
          이미 계정이 있으신가요?{' '}
          <Link href="/auth/login" className="font-medium text-primary-600 hover:text-primary-700">
            로그인
          </Link>
        </p>
      </div>
    </div>
  );
}
