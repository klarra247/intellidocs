'use client';

import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? '';

export function GoogleOAuthWrapper({ children }: { children: React.ReactNode }) {
  if (!GOOGLE_CLIENT_ID) {
    return <>{children}</>;
  }
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      {children}
    </GoogleOAuthProvider>
  );
}

export default function GoogleLoginButton() {
  const loginWithGoogle = useAuthStore((s) => s.loginWithGoogle);
  const router = useRouter();

  if (!GOOGLE_CLIENT_ID) return null;

  return (
    <div className="flex justify-center">
      <GoogleLogin
        onSuccess={async (response) => {
          if (response.credential) {
            try {
              await loginWithGoogle(response.credential);
              router.push('/workspace');
            } catch {
              // Error is handled by the store
            }
          }
        }}
        onError={() => {
          // Silent fail — user can retry
        }}
        size="large"
        width="100%"
        text="continue_with"
        shape="rectangular"
      />
    </div>
  );
}
