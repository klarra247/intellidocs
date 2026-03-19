'use client';

import { useScrollReveal } from './useScrollReveal';

export default function KnowledgeGraphSection() {
  const { ref, isVisible } = useScrollReveal();

  return (
    <section
      className="py-16 md:py-24"
      style={{ background: 'var(--bg-secondary)' }}
    >
      <div
        ref={ref}
        className={`mx-auto max-w-[1100px] px-6 transition-all duration-600 ease-out ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
        }`}
      >
        {/* Header */}
        <div className="text-center mb-12">
          <h2
            className="text-[28px] md:text-[36px] font-bold tracking-heading"
            style={{ color: 'var(--text-primary)' }}
          >
            문서 간 관계를 한눈에
          </h2>
          <p
            className="mt-3 text-[16px] max-w-lg mx-auto"
            style={{ color: 'var(--text-secondary)' }}
          >
            업로드된 문서에서 공통 지표를 자동 추출하고,
            문서 간 연결을 시각화합니다.
          </p>
        </div>

        {/* Screenshot placeholder */}
        <div className="mx-auto max-w-[960px]">
          <div
            className="rounded-[12px] overflow-hidden"
            style={{
              boxShadow: 'var(--shadow-md)',
              background: 'var(--bg-primary)',
            }}
          >
            <div className="aspect-[16/9] flex items-center justify-center">
              <div className="text-center">
                {/* Simple graph illustration */}
                <svg
                  className="h-16 w-16 mx-auto mb-3"
                  style={{ color: 'var(--text-tertiary)' }}
                  fill="none"
                  viewBox="0 0 64 64"
                  stroke="currentColor"
                >
                  <circle cx="32" cy="12" r="6" strokeWidth="1.5" />
                  <circle cx="12" cy="48" r="6" strokeWidth="1.5" />
                  <circle cx="52" cy="48" r="6" strokeWidth="1.5" />
                  <circle cx="32" cy="34" r="4" strokeWidth="1.5" />
                  <line x1="32" y1="18" x2="32" y2="30" strokeWidth="1" />
                  <line x1="28" y1="36" x2="16" y2="44" strokeWidth="1" />
                  <line x1="36" y1="36" x2="48" y2="44" strokeWidth="1" />
                </svg>
                <p className="text-[14px]" style={{ color: 'var(--text-tertiary)' }}>
                  Knowledge Graph Screenshot
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
