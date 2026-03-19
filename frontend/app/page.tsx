'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import LandingNavbar from '@/components/landing/LandingNavbar';
import HeroSection from '@/components/landing/HeroSection';
import FeaturesSection from '@/components/landing/FeaturesSection';
import KnowledgeGraphSection from '@/components/landing/KnowledgeGraphSection';
import TechStackSection from '@/components/landing/TechStackSection';
import CTASection from '@/components/landing/CTASection';
import Footer from '@/components/landing/Footer';

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuthStore();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace('/workspace');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading || isAuthenticated) {
    return <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }} />;
  }

  return (
    <div className="overflow-x-hidden">
      <LandingNavbar />
      <HeroSection />
      <FeaturesSection />
      <KnowledgeGraphSection />
      {/*<TechStackSection />*/}
      <CTASection />
      <Footer />
    </div>
  );
}
