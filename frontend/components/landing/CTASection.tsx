import Link from 'next/link';

export default function CTASection() {
  return (
    <section className="py-20 md:py-28" style={{ background: 'var(--bg-secondary)' }}>
      <div className="mx-auto max-w-[600px] px-6 text-center">
        <h2
          className="text-[28px] md:text-[36px] font-bold tracking-heading"
          style={{ color: 'var(--text-primary)' }}
        >
          지금 바로 시작하세요
        </h2>
        <p
          className="mt-3 text-[16px]"
          style={{ color: 'var(--text-secondary)' }}
        >
          문서를 올리고, 물어보세요. 무료입니다.
        </p>
        <div className="mt-8">
          <Link
            href="/auth/register"
            className="inline-block rounded-button px-6 py-[10px] text-[15px] font-medium text-white transition-colors"
            style={{ background: 'var(--accent)' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--accent-hover)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--accent)')}
          >
            무료로 시작하기
          </Link>
        </div>
      </div>
    </section>
  );
}
