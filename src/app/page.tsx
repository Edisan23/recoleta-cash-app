'use client';

import { useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { LandingPage } from '@/components/LandingPage';

const ADMIN_UID = '15sJqL2prSVL2adSXRyqsefg26v1';

export default function Home() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (isUserLoading) {
      return; // Wait until auth state is determined
    }

    // If a user is logged in and is the admin, redirect to the admin panel.
    if (user?.uid === ADMIN_UID) {
      router.push('/admin');
    }
    // If a user is logged in but is NOT the admin, they can't use the app.
    // They will see the landing page, from which they can only attempt to log in as admin.
    // If no user is logged in, they will also see the landing page.
    
  }, [user, isUserLoading, router]);


  if (isUserLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        Cargando...
      </div>
    );
  }
  
  // For all non-admin users or logged-out users, show the landing page.
  // The admin will be redirected by the useEffect.
  return <LandingPage />;
}
