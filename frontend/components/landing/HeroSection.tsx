'use client';

import Link from 'next/link';

export default function HeroSection() {
  return (
    <section className="pt-32 pb-16 md:pt-40 md:pb-24" style={{ background: 'var(--bg-primary)' }}>
      <div className="mx-auto max-w-[1100px] px-6">
        {/* Text */}
        <div className="text-center max-w-[680px] mx-auto">
          <h1
            className="text-[36px] md:text-[48px] font-bold leading-[1.15] tracking-heading"
            style={{ color: 'var(--text-primary)' }}
          >
            문서를 올리고,
            <br />
            그냥 물어보세요
          </h1>

          <p
            className="mt-5 text-[17px] md:text-[19px] leading-[1.6]"
            style={{ color: 'var(--text-secondary)' }}
          >
            AI Agent가 여러 문서를 분석하고, 비교하고, 정리합니다.
            <br className="hidden md:block" />
            재무제표, 계약서, 사업보고서 — 어떤 문서든.
          </p>

          {/* CTA */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/auth/register"
              className="rounded-button px-6 py-[10px] text-[15px] font-medium text-white transition-colors"
              style={{ background: 'var(--accent)' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--accent-hover)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--accent)')}
            >
              무료로 시작하기
            </Link>
            <a
              href="#features"
              onClick={(e) => {
                e.preventDefault();
                document.querySelector('#features')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="rounded-button px-6 py-[10px] text-[15px] font-medium transition-colors"
              style={{
                color: 'var(--text-primary)',
                border: '1px solid var(--border)',
                background: 'transparent',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              자세히 보기
            </a>
          </div>
        </div>

        {/* App screenshot mockup */}
        <div className="mt-16 md:mt-20 mx-auto max-w-[960px]">
          <div
            className="rounded-[16px] overflow-hidden"
            style={{ boxShadow: 'var(--shadow-lg)' }}
          >
            <div
              className="aspect-[16/9] flex items-center justify-center"
              style={{ background: 'var(--bg-secondary)' }}
            >
              <div className="text-center">
                <svg
                  className="h-12 w-12 mx-auto mb-3"
                  style={{ color: 'var(--text-tertiary)' }}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <p className="text-[14px]" style={{ color: 'var(--text-tertiary)' }}>
                  앱 스크린샷
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
