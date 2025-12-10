'use client';

import { useUser, useFirestore } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { LandingPage } from '@/components/LandingPage';
import { OperatorDashboard } from '@/components/OperatorDashboard';
import { useDoc } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { User } from '@/types/db-entities';
import { useMemoFirebase } from '@/firebase/provider';

const ADMIN_UID = '15sJqL2prSVL2adSXRyqsefg26v1';

export default function Home() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const firestore = useFirestore();

  const userRef = useMemoFirebase(
    () => (user ? doc(firestore, 'users', user.uid) : null),
    [firestore, user]
  );
  const { data: userData, isLoading: isUserDataLoading } = useDoc<User>(userRef);

  useEffect(() => {
    if (isUserLoading || isUserDataLoading) {
      return; // Wait until all user data is loaded
    }
    
    // If the user is the administrator, redirect to the admin panel.
    if (user?.uid === ADMIN_UID) {
        router.push('/admin');
        return;
    }

    if (user && userData) {
      if (!userData.companyId) {
        // Operator without a company needs to select one
        router.push('/select-company');
      }
      // Otherwise, stay on this page to render OperatorDashboard
    }
  }, [user, userData, isUserLoading, isUserDataLoading, router]);

  const isLoading = isUserLoading || isUserDataLoading;

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        Cargando...
      </div>
    );
  }

  // If user is the admin, they will be redirected.
  if (user?.uid === ADMIN_UID) {
      return <div className="flex min-h-screen items-center justify-center">Redirigiendo a admin...</div>;
  }
  
  // If user is logged in, is an operator, and has a company, show the dashboard.
  if (user && userData?.role === 'operator' && userData?.companyId) {
    return <OperatorDashboard />;
  }

  // If it's an operator without a company, they will be redirected.
  // In the meantime, show a loading message.
  if (user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        Redirigiendo...
      </div>
    );
  }

  // If no user is logged in, show the landing page
  return <LandingPage />;
}
