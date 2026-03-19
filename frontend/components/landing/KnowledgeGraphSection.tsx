'use client';

import { useScrollReveal } from './useScrollReveal';

export default function KnowledgeGraphSection() {
  const { ref, isVisible } = useScrollReveal();

  return (
    <section className="relative bg-[#0a0f1e] py-24 md:py-32 overflow-hidden">
      {/* Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-emerald-500/[0.04] rounded-full blur-[140px]" />
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-teal-500/[0.03] rounded-full blur-[100px]" />

      <div
        ref={ref}
        className={`relative z-10 mx-auto max-w-7xl px-6 transition-all duration-700 ease-out ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}
      >
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-[2.75rem] font-bold text-white leading-tight">
            문서 간 관계를{' '}
            <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
              한눈에
            </span>
          </h2>
          <p className="mt-4 text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
            업로드된 문서에서 공통 지표를 자동 추출하고,
            <br className="hidden md:block" />
            문서 간 연결을 시각화합니다.
          </p>
        </div>

        {/* Screenshot placeholder */}
        <div className="mx-auto max-w-5xl">
          <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-1.5 shadow-2xl shadow-black/40">
            <div className="aspect-[16/9] rounded-lg bg-gradient-to-br from-slate-800/60 to-slate-900/60 flex items-center justify-center">
              <div className="text-center">
                <div className="relative mx-auto w-20 h-20 mb-4">
                  {/* Decorative graph nodes */}
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 h-4 w-4 rounded-full bg-emerald-500/30 border border-emerald-500/40" />
                  <div className="absolute bottom-0 left-1 h-3.5 w-3.5 rounded-full bg-teal-500/30 border border-teal-500/40" />
                  <div className="absolute bottom-0 right-1 h-3.5 w-3.5 rounded-full bg-cyan-500/30 border border-cyan-500/40" />
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-5 w-5 rounded-full bg-emerald-500/20 border border-emerald-500/30" />
                  {/* Lines */}
                  <svg
                    className="absolute inset-0 w-full h-full text-emerald-500/20"
                    viewBox="0 0 80 80"
                  >
                    <line
                      x1="40"
                      y1="8"
                      x2="40"
                      y2="40"
                      stroke="currentColor"
                      strokeWidth="1"
                    />
                    <line
                      x1="40"
                      y1="40"
                      x2="12"
                      y2="68"
                      stroke="currentColor"
                      strokeWidth="1"
                    />
                    <line
                      x1="40"
                      y1="40"
                      x2="68"
                      y2="68"
                      stroke="currentColor"
                      strokeWidth="1"
                    />
                  </svg>
                </div>
                <p className="text-sm text-slate-500">
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
