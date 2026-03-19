import Link from 'next/link';

export default function Footer() {
  return (
    <footer
      style={{
        background: 'var(--bg-secondary)',
        borderTop: '1px solid var(--border)',
      }}
    >
      <div className="mx-auto max-w-[1100px] px-6 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-5">
            <Link
              href="/"
              className="text-[15px] font-bold"
              style={{ color: 'var(--text-primary)' }}
            >
              IntelliDocs
            </Link>
            <span className="text-[13px]" style={{ color: 'var(--text-tertiary)' }}>
              © 2026 IntelliDocs
            </span>
          </div>

          <div className="flex items-center gap-5">
            <a
              href="https://github.com/klarra247/intellidocs"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[13px] transition-colors"
              style={{ color: 'var(--text-secondary)' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
            >
              GitHub
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
