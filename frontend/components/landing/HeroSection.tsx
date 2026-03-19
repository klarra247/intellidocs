'use client';

import Link from 'next/link';

export default function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#0a0f1e]">
      {/* Gradient glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-emerald-500/[0.07] rounded-full blur-[120px]" />
      <div className="absolute top-1/3 left-1/4 w-[400px] h-[400px] bg-teal-500/[0.05] rounded-full blur-[100px]" />
      <div className="absolute bottom-1/4 right-1/4 w-[350px] h-[350px] bg-cyan-500/[0.04] rounded-full blur-[100px]" />

      {/* Subtle grid */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
        }}
      />

      <div className="relative z-10 mx-auto max-w-7xl px-6 pt-32 pb-24">
        <div className="text-center max-w-4xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/[0.08] px-4 py-1.5 mb-8">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-medium text-emerald-300 tracking-wide">
              AI-Powered Document Intelligence
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-[clamp(2.5rem,6vw,4.5rem)] font-extrabold text-white leading-[1.1] tracking-tight">
            문서를 올리고,
            <br />
            <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
              그냥 물어보세요
            </span>
          </h1>

          {/* Sub copy */}
          <p className="mt-6 text-lg md:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
            AI Agent가 여러 문서를 분석하고, 비교하고, 정리합니다.
            <br className="hidden md:block" />
            재무제표, 계약서, 사업보고서 — 어떤 문서든.
          </p>

          {/* CTA buttons */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/auth/register"
              className="group rounded-full bg-emerald-500 px-8 py-3.5 text-[15px] font-semibold text-white hover:bg-emerald-400 transition-all duration-200 hover:shadow-[0_0_32px_rgba(16,185,129,0.3)]"
            >
              무료로 시작하기
              <span className="inline-block ml-1.5 transition-transform group-hover:translate-x-0.5">
                →
              </span>
            </Link>
            <a
              href="#features"
              onClick={(e) => {
                e.preventDefault();
                document
                  .querySelector('#features')
                  ?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="rounded-full border border-white/[0.12] px-8 py-3.5 text-[15px] font-medium text-slate-300 hover:bg-white/[0.04] hover:border-white/20 transition-all duration-200"
            >
              자세히 보기
            </a>
          </div>
        </div>

        {/* Browser mockup */}
        <div className="mt-20 mx-auto max-w-5xl">
          <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-1.5 shadow-2xl shadow-black/40 backdrop-blur-sm">
            {/* Title bar */}
            <div className="flex items-center gap-2 px-4 py-2.5">
              <div className="flex items-center gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]/80" />
                <div className="h-2.5 w-2.5 rounded-full bg-[#febc2e]/80" />
                <div className="h-2.5 w-2.5 rounded-full bg-[#28c840]/80" />
              </div>
              <div className="ml-3 flex-1 max-w-xs">
                <div className="rounded-md bg-white/[0.06] px-3 py-1 text-[11px] text-slate-500 text-center">
                  intellidocs.org
                </div>
              </div>
            </div>
            {/* Content area */}
            <div className="aspect-[16/9] rounded-lg bg-gradient-to-br from-slate-800/60 to-slate-900/60 flex items-center justify-center">
              <div className="text-center">
                <div className="h-16 w-16 mx-auto rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center mb-4">
                  <svg
                    className="h-8 w-8 text-slate-600"
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
                </div>
                <p className="text-sm text-slate-500">앱 스크린샷</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom fade to white */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white to-transparent" />
    </section>
  );
}
