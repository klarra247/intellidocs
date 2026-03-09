'use client';

import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';

export default function WorkspaceInitializer() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { initialized, fetchWorkspaces } = useWorkspaceStore();
  const initRef = useRef(false);

  useEffect(() => {
    if (isAuthenticated && !initialized && !initRef.current) {
      initRef.current = true;
      fetchWorkspaces();
    }
  }, [isAuthenticated, initialized, fetchWorkspaces]);

  return null;
}
