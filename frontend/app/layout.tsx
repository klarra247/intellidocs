import type { Metadata } from 'next';
import './globals.css';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import DocumentViewerPanel from '@/components/viewer/DocumentViewerPanel';

export const metadata: Metadata = {
  title: 'IntelliDocs',
  description: 'Document Intelligence for SMBs',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className="bg-slate-50 text-slate-900 antialiased">
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
      </body>
    </html>
  );
}
