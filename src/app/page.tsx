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
      // Check if the user is the admin
      if (user.email === 'tjedisan@gmail.com') {
        router.push('/admin'); // Redirect admin to admin dashboard
      }
      // For other users, stay on the operator dashboard
    }
  }, [user, isUserLoading, router]);

  if (isUserLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        Loading...
      </div>
    );
  }

  // If user is logged in and not an admin, show the operator dashboard.
  if (user && user.email !== 'tjedisan@gmail.com') {
    return <OperatorDashboard />;
  }

  // If it's the admin, they will be redirected. In the meantime, show loading or null.
  if (user && user.email === 'tjedisan@gmail.com') {
     return (
        <div className="flex min-h-screen items-center justify-center">
            Redirecting to admin dashboard...
        </div>
     );
  }

  // If no user is logged in, show the landing page
  return <LandingPage />;
}
