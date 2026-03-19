import type { Metadata } from 'next';
import './globals.css';
import { AuthInitializer } from '@/components/auth/AuthInitializer';
import { GoogleOAuthWrapper } from '@/components/auth/GoogleLoginButton';

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
      <body className="antialiased">
        <GoogleOAuthWrapper>
          <AuthInitializer />
          {children}
        </GoogleOAuthWrapper>
      </body>
    </html>
  );
}
