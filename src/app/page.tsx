'use client';

import { useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { LandingPage } from '@/components/LandingPage';
import { OperatorDashboard } from '@/components/OperatorDashboard';

// The specific UID for the admin user
const ADMIN_UID = '15sJqL2prSVL2adSXRyqsefg26v1';

export default function Home() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (isUserLoading) {
      return; // Wait until auth state is determined
    }

    if (user && user.uid === ADMIN_UID) {
      router.replace('/admin');
    }
  }, [user, isUserLoading, router]);

  if (isUserLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        Cargando...
      </div>
    );
  }

  // If user is admin, they are being redirected by the useEffect. 
  // We can show a loading state or null while that happens.
  if (user && user.uid === ADMIN_UID) {
     return (
      <div className="flex min-h-screen items-center justify-center">
        Redirigiendo al panel de administración...
      </div>
    );
  }

  // If a non-admin user is logged in, show their dashboard.
  if (user) {
    return <OperatorDashboard />;
  }
  
  // For logged-out users, show the landing page.
  return <LandingPage />;
}
