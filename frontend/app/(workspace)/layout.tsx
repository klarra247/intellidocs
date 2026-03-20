'use client';

import { useEffect } from 'react';
import dynamic from 'next/dynamic';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import DocumentViewerPanel from '@/components/viewer/DocumentViewerPanel';
import AuthGuard from '@/components/auth/AuthGuard';
import WorkspaceInitializer from '@/components/workspace/WorkspaceInitializer';
import WorkspaceReady from '@/components/workspace/WorkspaceReady';
import OnboardingTour from '@/components/onboarding/OnboardingTour';
import { useOnboardingStore } from '@/stores/onboardingStore';

const DiffViewer = dynamic(() => import('@/components/version/DiffViewer'), { ssr: false });

function OnboardingInitializer() {
  const initFromStorage = useOnboardingStore((s) => s.initFromStorage);
  useEffect(() => {
    initFromStorage();
  }, [initFromStorage]);
  return null;
}

export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <WorkspaceInitializer />
      <WorkspaceReady>
        <OnboardingInitializer />
        <div className="flex h-screen overflow-hidden">
          <Sidebar />
          <div className="flex flex-1 flex-col overflow-hidden">
            <Header />
            <main className="flex flex-1 overflow-hidden">
              <div className="h-full min-w-0 flex-1 animate-fade-in">{children}</div>
              <DocumentViewerPanel />
            </main>
          </div>
        </div>
        <DiffViewer />
        <OnboardingTour />
      </WorkspaceReady>
    </AuthGuard>
  );
}
