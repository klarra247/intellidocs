'use client';

import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import DocumentViewerPanel from '@/components/viewer/DocumentViewerPanel';
import AuthGuard from '@/components/auth/AuthGuard';

export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
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
    </AuthGuard>
  );
}
