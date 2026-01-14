'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase';
import { LandingPage } from '@/components/LandingPage';
import { LogoSpinner } from '@/components/LogoSpinner';

const OPERATOR_COMPANY_KEY = 'fake_operator_company_id';

export default function HomePage() {
  const router = useRouter();
  const { user, isUserLoading } = useUser();

  useEffect(() => {
    // Only redirect if loading is finished and there is a user.
    if (!isUserLoading && user) {
      const companyId = localStorage.getItem(OPERATOR_COMPANY_KEY);
      if (companyId) {
        router.replace('/operator/dashboard');
      } else {
        router.replace('/select-company');
      }
    }
  }, [user, isUserLoading, router]);

  // While checking auth state, show a spinner. This is the first gate.
  if (isUserLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <LogoSpinner />
      </div>
    );
  }

  // After loading, if there's a user, we're in the process of redirecting.
  // Keep showing the spinner to avoid a flash of the landing page.
  if (user) {
    return (
        <div className="flex h-screen w-full items-center justify-center">
            <LogoSpinner />
        </div>
    );
  }
  
  // If loading is finished and there's no user, show the landing page.
  return <LandingPage />;
}
