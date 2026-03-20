'use client';

import { useEffect, useState, useRef } from 'react';

type Position = 'right' | 'bottom' | 'left' | 'top' | 'center';

interface TourTooltipProps {
  targetSelector: string | null;
  position: Position;
  content: string;
  currentStep: number;
  totalSteps: number;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  isLast: boolean;
  isFirst: boolean;
  lastButtonLabel?: string;
  lastButtonAction?: () => void;
}

const GAP = 12;

export default function TourTooltip({
  targetSelector,
  position,
  content,
  currentStep,
  totalSteps,
  onNext,
  onPrev,
  onSkip,
  isFirst,
  isLast,
  lastButtonLabel,
  lastButtonAction,
}: TourTooltipProps) {
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const [arrowDir, setArrowDir] = useState<'left' | 'top' | 'right' | 'bottom'>('left');

  useEffect(() => {
    const update = () => {
      if (position === 'center' || !targetSelector) {
        setCoords({
          top: window.innerHeight / 2,
          left: window.innerWidth / 2,
        });
        return;
      }

      const el = document.querySelector(targetSelector);
      const tooltip = tooltipRef.current;
      if (!el || !tooltip) return;

      const rect = el.getBoundingClientRect();
      const tw = tooltip.offsetWidth;
      const th = tooltip.offsetHeight;

      let top = 0;
      let left = 0;

      switch (position) {
        case 'right':
          top = rect.top + rect.height / 2 - th / 2;
          left = rect.right + GAP;
          setArrowDir('left');
          break;
        case 'bottom':
          top = rect.bottom + GAP;
          left = rect.left + rect.width / 2 - tw / 2;
          setArrowDir('top');
          break;
        case 'left':
          top = rect.top + rect.height / 2 - th / 2;
          left = rect.left - tw - GAP;
          setArrowDir('right');
          break;
        case 'top':
          top = rect.top - th - GAP;
          left = rect.left + rect.width / 2 - tw / 2;
          setArrowDir('bottom');
          break;
      }

      // Clamp to viewport
      top = Math.max(8, Math.min(top, window.innerHeight - th - 8));
      left = Math.max(8, Math.min(left, window.innerWidth - tw - 8));

      setCoords({ top, left });
    };

    const raf = requestAnimationFrame(update);
    window.addEventListener('resize', update);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', update);
    };
  }, [targetSelector, position]);

  const arrowSize = 8;
  const arrowCss: Record<string, React.CSSProperties> = {
    left: {
      position: 'absolute',
      left: -arrowSize,
      top: '50%',
      transform: 'translateY(-50%)',
      width: 0,
      height: 0,
      borderTop: `${arrowSize}px solid transparent`,
      borderBottom: `${arrowSize}px solid transparent`,
      borderRight: `${arrowSize}px solid var(--bg-primary)`,
    },
    top: {
      position: 'absolute',
      top: -arrowSize,
      left: '50%',
      transform: 'translateX(-50%)',
      width: 0,
      height: 0,
      borderLeft: `${arrowSize}px solid transparent`,
      borderRight: `${arrowSize}px solid transparent`,
      borderBottom: `${arrowSize}px solid var(--bg-primary)`,
    },
    right: {
      position: 'absolute',
      right: -arrowSize,
      top: '50%',
      transform: 'translateY(-50%)',
      width: 0,
      height: 0,
      borderTop: `${arrowSize}px solid transparent`,
      borderBottom: `${arrowSize}px solid transparent`,
      borderLeft: `${arrowSize}px solid var(--bg-primary)`,
    },
    bottom: {
      position: 'absolute',
      bottom: -arrowSize,
      left: '50%',
      transform: 'translateX(-50%)',
      width: 0,
      height: 0,
      borderLeft: `${arrowSize}px solid transparent`,
      borderRight: `${arrowSize}px solid transparent`,
      borderTop: `${arrowSize}px solid var(--bg-primary)`,
    },
  };

  const isCentered = position === 'center';

  return (
    <div
      ref={tooltipRef}
      className="fixed z-[9999] animate-scale-in"
      style={{
        top: isCentered ? '50%' : coords.top,
        left: isCentered ? '50%' : coords.left,
        transform: isCentered ? 'translate(-50%, -50%)' : undefined,
        maxWidth: 320,
        width: 320,
        background: 'var(--bg-primary)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        boxShadow: 'var(--shadow-lg)',
        padding: 20,
      }}
    >
      {!isCentered && <div style={arrowCss[arrowDir]} />}

      <p
        className="text-[13px] leading-relaxed"
        style={{ color: 'var(--text-primary)' }}
      >
        {content}
      </p>

      <div className="mt-4 flex items-center justify-between">
        <div className="flex gap-1.5">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className="h-1.5 w-1.5 rounded-full"
              style={{
                background: i === currentStep ? 'var(--accent)' : 'var(--border)',
              }}
            />
          ))}
        </div>

        <div className="flex items-center gap-2">
          {!isLast && (
            <button
              onClick={onSkip}
              className="text-[12px] px-2 py-1 rounded-[4px] transition-colors"
              style={{ color: 'var(--text-tertiary)' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              건너뛰기
            </button>
          )}
          {!isFirst && !isLast && (
            <button
              onClick={onPrev}
              className="text-[12px] px-2 py-1 rounded-[4px] transition-colors"
              style={{ color: 'var(--text-secondary)' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              이전
            </button>
          )}
          <button
            onClick={isLast && lastButtonAction ? lastButtonAction : onNext}
            className="text-[12px] font-medium px-3 py-1.5 rounded-[6px] transition-colors"
            style={{ background: 'var(--accent)', color: '#fff' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--accent-hover)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--accent)')}
          >
            {isLast ? (lastButtonLabel || '시작하기') : '다음'}
          </button>
        </div>
      </div>
    </div>
  );
}
