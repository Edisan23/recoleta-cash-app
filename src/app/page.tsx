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

    // If a user is logged in, decide where to send them.
    if (user) {
      // If the user is the admin, always redirect to the admin panel.
      if (user.uid === ADMIN_UID) {
        router.push('/admin');
        return; // Stop further execution
      }
      
      // For non-admin users, the OperatorDashboard will handle the logic
      // of checking for a companyId and redirecting if necessary.
      // So, if we are here, we know it's a regular user.
    } 
    // If no user is logged in, they will see the LandingPage.
    
  }, [user, isUserLoading, router]);


  if (isUserLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        Cargando...
      </div>
    );
  }

  // If a non-admin user is logged in, show their dashboard.
  // The dashboard component itself will handle the logic for users without a company.
  if (user && user.uid !== ADMIN_UID) {
      return <OperatorDashboard />
  }
  
  // For all other cases (logged-out users), show the landing page.
  // Admins are redirected by the useEffect.
  return <LandingPage />;
}
