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
      
      // For non-admin users, check if they have a companyId.
      // This check will happen on the OperatorDashboard or a similar component after loading the user's profile.
      // If the user doesn't have a companyId, they should be redirected from there.
      // For now, if it's a regular user, we assume they will see their dashboard or be prompted to select a company.
      // If user profile is not yet loaded, OperatorDashboard will handle it.

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
