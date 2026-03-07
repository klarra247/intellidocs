'use client';

import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/stores/authStore';

export function AuthInitializer() {
  const initAuth = useAuthStore((s) => s.initAuth);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    initAuth();
  }, [initAuth]);

  return null;
}
