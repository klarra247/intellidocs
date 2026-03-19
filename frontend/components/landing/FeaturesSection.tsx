'use client';

import { useScrollReveal } from './useScrollReveal';
import { FileSearch, AlertTriangle, GitCompare, Users } from 'lucide-react';

const features = [
  {
    icon: FileSearch,
    title: 'AI 문서 분석',
    description:
      'PDF, Excel, Word를 업로드하면 AI Agent가 자동으로 분석합니다. 자연어로 질문하면 표, 차트, 요약으로 답합니다.',
    color: 'emerald' as const,
  },
  {
    icon: AlertTriangle,
    title: '수치 불일치 탐지',
    description:
      '같은 항목이 문서마다 다르면 자동으로 찾아냅니다. 사업보고서 452억 vs 재무제표 448억 — 놓치지 않습니다.',
    color: 'amber' as const,
  },
  {
    icon: GitCompare,
    title: '문서 버전 비교',
    description:
      '1분기 → 2분기 뭐가 바뀌었는지, 수치와 내용을 자동으로 비교합니다. 변경점을 한눈에 파악하세요.',
    color: 'blue' as const,
  },
  {
    icon: Users,
    title: '팀 협업',
    description:
      '워크스페이스에서 분석 결과를 공유하고, 코멘트를 남기고, 리뷰합니다. 팀 전체가 같은 맥락을 공유합니다.',
    color: 'violet' as const,
  },
];

const colorMap = {
  emerald: {
    bg: 'bg-emerald-500/10',
    icon: 'text-emerald-500',
    ring: 'ring-emerald-500/20',
  },
  amber: {
    bg: 'bg-amber-500/10',
    icon: 'text-amber-500',
    ring: 'ring-amber-500/20',
  },
  blue: {
    bg: 'bg-blue-500/10',
    icon: 'text-blue-500',
    ring: 'ring-blue-500/20',
  },
  violet: {
    bg: 'bg-violet-500/10',
    icon: 'text-violet-500',
    ring: 'ring-violet-500/20',
  },
};

function FeatureRow({
  feature,
  index,
}: {
  feature: (typeof features)[0];
  index: number;
}) {
  const { ref, isVisible } = useScrollReveal(0.2);
  const isReversed = index % 2 !== 0;
  const Icon = feature.icon;
  const colors = colorMap[feature.color];

  return (
    <div
      ref={ref}
      className={`flex flex-col ${
        isReversed ? 'md:flex-row-reverse' : 'md:flex-row'
      } items-center gap-12 md:gap-20 transition-all duration-700 ease-out ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
      }`}
    >
      {/* Text */}
      <div className="flex-1 space-y-5">
        <div
          className={`inline-flex h-12 w-12 items-center justify-center rounded-xl ${colors.bg} ring-1 ${colors.ring}`}
        >
          <Icon className={`h-6 w-6 ${colors.icon}`} strokeWidth={1.8} />
        </div>
        <h3 className="text-2xl md:text-[28px] font-bold text-slate-900 leading-tight">
          {feature.title}
        </h3>
        <p className="text-base md:text-lg text-slate-500 leading-relaxed">
          {feature.description}
        </p>
      </div>

      {/* Screenshot placeholder */}
      <div className="flex-1 w-full">
        <div className="rounded-2xl border border-slate-200/80 bg-slate-50 p-2 shadow-lg shadow-slate-200/50">
          <div className="aspect-[4/3] rounded-xl bg-gradient-to-br from-slate-100 to-slate-50 flex items-center justify-center">
            <div className="text-center">
              <Icon
                className="h-10 w-10 mx-auto text-slate-300 mb-3"
                strokeWidth={1.5}
              />
              <p className="text-sm text-slate-400">Screenshot</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function FeaturesSection() {
  const { ref, isVisible } = useScrollReveal();

  return (
    <section id="features" className="bg-white py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-6">
        {/* Section header */}
        <div
          ref={ref}
          className={`text-center mb-20 md:mb-28 transition-all duration-700 ease-out ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <h2 className="text-3xl md:text-[2.75rem] font-bold text-slate-900 leading-tight">
            모든 문서 분석을{' '}
            <span className="bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent">
              한 곳에서
            </span>
          </h2>
          <p className="mt-4 text-lg text-slate-500">
            복잡한 문서 업무를 AI가 대신합니다.
          </p>
        </div>

        {/* Feature rows */}
        <div className="space-y-24 md:space-y-36">
          {features.map((feature, i) => (
            <FeatureRow key={feature.title} feature={feature} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
