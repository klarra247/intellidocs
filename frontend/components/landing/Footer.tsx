import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-[#070b14] border-t border-white/[0.04]">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <Link
              href="/"
              className="text-lg font-extrabold text-white tracking-tight"
            >
              Intelli<span className="text-emerald-400">Docs</span>
            </Link>
            <span className="text-sm text-slate-600">
              © 2026 IntelliDocs
            </span>
          </div>

          <div className="flex items-center gap-6">
            <a
              href="https://github.com/klarra247/intellidocs"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-slate-500 hover:text-slate-300 transition-colors"
            >
              GitHub
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
