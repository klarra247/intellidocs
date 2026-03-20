'use client';

import { useEffect, useState } from 'react';

interface TourOverlayProps {
  targetSelector: string | null;
  onClickOverlay: () => void;
}

export default function TourOverlay({ targetSelector, onClickOverlay }: TourOverlayProps) {
  const [clipPath, setClipPath] = useState<string>('');

  useEffect(() => {
    if (!targetSelector) {
      setClipPath('');
      return;
    }

    const updateClipPath = () => {
      const el = document.querySelector(targetSelector);
      if (!el) return;

      const rect = el.getBoundingClientRect();
      const padding = 6;
      const radius = 8;

      const x = rect.left - padding;
      const y = rect.top - padding;
      const w = rect.width + padding * 2;
      const h = rect.height + padding * 2;

      setClipPath(
        `polygon(
          0% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 0%,
          ${x}px ${y + radius}px,
          ${x + radius}px ${y}px,
          ${x + w - radius}px ${y}px,
          ${x + w}px ${y + radius}px,
          ${x + w}px ${y + h - radius}px,
          ${x + w - radius}px ${y + h}px,
          ${x + radius}px ${y + h}px,
          ${x}px ${y + h - radius}px,
          ${x}px ${y + radius}px
        )`
      );
    };

    updateClipPath();
    window.addEventListener('resize', updateClipPath);
    window.addEventListener('scroll', updateClipPath, true);

    return () => {
      window.removeEventListener('resize', updateClipPath);
      window.removeEventListener('scroll', updateClipPath, true);
    };
  }, [targetSelector]);

  return (
    <div
      className="fixed inset-0 z-[9998] transition-all duration-300"
      style={{
        background: 'rgba(0, 0, 0, 0.4)',
        clipPath: clipPath || undefined,
      }}
      onClick={onClickOverlay}
    />
  );
}
