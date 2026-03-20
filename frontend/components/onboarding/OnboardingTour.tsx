'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useOnboardingStore } from '@/stores/onboardingStore';
import TourOverlay from './TourOverlay';
import TourTooltip from './TourTooltip';

const TOUR_STEPS = [
  {
    target: '[data-tour="nav-documents"]',
    position: 'right' as const,
    content: '여기서 문서를 관리합니다. PDF, Excel, Word를 업로드하면 AI가 자동으로 분석 준비를 합니다.',
  },
  {
    target: '[data-tour="upload-zone"]',
    position: 'bottom' as const,
    content: '문서를 드래그하거나 클릭해서 업로드하세요. PDF, Excel, Word를 지원합니다.',
  },
  {
    target: '[data-tour="nav-chat"]',
    position: 'right' as const,
    content: '문서를 업로드한 후, AI에게 자연어로 질문하세요. 여러 문서를 비교하고, 표로 정리하고, 차트를 만들어줍니다.',
  },
  {
    target: '[data-tour="nav-knowledge-graph"]',
    position: 'right' as const,
    content: '업로드된 문서에서 공통 지표를 자동 추출하고, 문서 간 연결을 시각화합니다.',
  },
  {
    target: null,
    position: 'center' as const,
    content: '준비 완료! 먼저 문서를 업로드해보세요.',
  },
];

export default function OnboardingTour() {
  const { tourActive, tourStep, nextStep, prevStep, endTour } = useOnboardingStore();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (tourActive && pathname !== '/workspace') {
      endTour();
    }
  }, [pathname, tourActive, endTour]);

  useEffect(() => {
    if (!tourActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') endTour();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [tourActive, endTour]);

  if (!tourActive) return null;

  const step = TOUR_STEPS[tourStep];

  return (
    <>
      <TourOverlay
        targetSelector={step.target}
        onClickOverlay={endTour}
      />
      <TourTooltip
        targetSelector={step.target}
        position={step.position}
        content={step.content}
        currentStep={tourStep}
        totalSteps={TOUR_STEPS.length}
        onNext={nextStep}
        onPrev={prevStep}
        onSkip={endTour}
        isFirst={tourStep === 0}
        isLast={tourStep === TOUR_STEPS.length - 1}
        lastButtonLabel="문서 업로드하러 가기"
        lastButtonAction={() => {
          endTour();
          router.push('/workspace');
        }}
      />
    </>
  );
}
