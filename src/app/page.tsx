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
    // If auth state is still loading, do nothing to prevent premature redirects.
    if (isUserLoading) {
      return;
    }

    // If the user is the admin, redirect to the admin panel.
    // This check is the highest priority.
    if (user && user.uid === ADMIN_UID) {
      router.replace('/admin');
    }
    
    // The rest of the component's render logic will handle what to show
    // for operators or unauthenticated users.

  }, [user, isUserLoading, router]);

  // While loading, show a loading state.
  if (isUserLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        Cargando...
      </div>
    );
  }

  // If the user is the admin, we are in the process of redirecting.
  // We show a message to prevent rendering other components that could cause conflicts.
  if (user && user.uid === ADMIN_UID) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        Redirigiendo al panel de administración...
      </div>
    );
  }

  // If there's a non-admin user (operator), show the operator dashboard.
  if (user) {
    return <OperatorDashboard />;
  }
  
  // If no user is logged in, show the landing page.
  return <LandingPage />;
}
