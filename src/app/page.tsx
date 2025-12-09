'use client';

import { useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { LandingPage } from '@/components/LandingPage';
import { OperatorDashboard } from '@/components/OperatorDashboard';

export default function Home() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!isUserLoading && user) {
      // Once the user is loaded and logged in, you might want to redirect them
      // For now, we'll just log it.
      console.log('User is logged in:', user.uid);
      // Example redirect: router.push('/dashboard');
    }
  }, [user, isUserLoading, router]);

  if (isUserLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        Loading...
      </div>
    );
  }

  // If user is logged in, show the operator dashboard.
  if (user) {
    return <OperatorDashboard />;
  }

  // If no user is logged in, show the landing page
  return <LandingPage />;
}
