'use client';

import { useScrollReveal } from './useScrollReveal';
import { FileSearch, AlertTriangle, GitCompare, Users } from 'lucide-react';

const features = [
  {
    icon: FileSearch,
    title: 'AI 문서 분석',
    description:
      'PDF, Excel, Word를 업로드하면 AI Agent가 자동으로 분석합니다. 자연어로 질문하면 표, 차트, 요약으로 답합니다.',
  },
  {
    icon: AlertTriangle,
    title: '수치 불일치 탐지',
    description:
      '같은 항목이 문서마다 다르면 자동으로 찾아냅니다. 사업보고서 452억 vs 재무제표 448억 — 놓치지 않습니다.',
  },
  {
    icon: GitCompare,
    title: '문서 버전 비교',
    description:
      '1분기 → 2분기 뭐가 바뀌었는지, 수치와 내용을 자동으로 비교합니다. 변경점을 한눈에 파악하세요.',
  },
  {
    icon: Users,
    title: '팀 협업',
    description:
      '워크스페이스에서 분석 결과를 공유하고, 코멘트를 남기고, 리뷰합니다. 팀 전체가 같은 맥락을 공유합니다.',
  },
];

function FeatureRow({
  feature,
  index,
}: {
  feature: (typeof features)[0];
  index: number;
}) {
  const { ref, isVisible } = useScrollReveal(0.15);
  const isReversed = index % 2 !== 0;
  const Icon = feature.icon;

  return (
    <div
      ref={ref}
      className={`flex flex-col ${
        isReversed ? 'md:flex-row-reverse' : 'md:flex-row'
      } items-center gap-10 md:gap-16 transition-all duration-600 ease-out ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
      }`}
    >
      {/* Text */}
      <div className="flex-1 space-y-4">
        <div
          className="inline-flex h-10 w-10 items-center justify-center rounded-[8px]"
          style={{ background: 'var(--bg-secondary)' }}
        >
          <Icon
            className="h-5 w-5"
            style={{ color: 'var(--text-secondary)' }}
            strokeWidth={1.8}
          />
        </div>
        <h3
          className="text-[24px] font-semibold leading-tight tracking-heading"
          style={{ color: 'var(--text-primary)' }}
        >
          {feature.title}
        </h3>
        <p
          className="text-[16px] leading-[1.6]"
          style={{ color: 'var(--text-secondary)' }}
        >
          {feature.description}
        </p>
      </div>

      {/* Screenshot placeholder */}
      <div className="flex-1 w-full">
        <div
          className="rounded-[12px] overflow-hidden"
          style={{ boxShadow: 'var(--shadow-md)' }}
        >
          <div
            className="aspect-[4/3] flex items-center justify-center"
            style={{ background: 'var(--bg-secondary)' }}
          >
            <div className="text-center">
              <Icon
                className="h-8 w-8 mx-auto mb-2"
                style={{ color: 'var(--text-tertiary)' }}
                strokeWidth={1.5}
              />
              <p className="text-[13px]" style={{ color: 'var(--text-tertiary)' }}>
                Screenshot
              </p>
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
    <section id="features" className="py-16 md:py-24" style={{ background: 'var(--bg-primary)' }}>
      <div className="mx-auto max-w-[1100px] px-6">
        {/* Section header */}
        <div
          ref={ref}
          className={`text-center mb-16 md:mb-24 transition-all duration-600 ease-out ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
          }`}
        >
          <h2
            className="text-[28px] md:text-[36px] font-bold tracking-heading"
            style={{ color: 'var(--text-primary)' }}
          >
            모든 문서 분석을 한 곳에서
          </h2>
          <p
            className="mt-3 text-[16px]"
            style={{ color: 'var(--text-secondary)' }}
          >
            복잡한 문서 업무를 AI가 대신합니다.
          </p>
        </div>

        {/* Feature rows */}
        <div className="space-y-20 md:space-y-28">
          {features.map((feature, i) => (
            <FeatureRow key={feature.title} feature={feature} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
