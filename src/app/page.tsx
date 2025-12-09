'use client';

import { useUser, useFirestore, useMemoFirebase } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { doc } from 'firebase/firestore';
import { useDoc } from '@/firebase/firestore/use-doc';
import { HomeDashboard } from '@/components/HomeDashboard';
import { LandingPage } from '@/components/LandingPage';
import { CompanySelection } from '@/components/CompanySelection';
import type { User } from '@/types/db-entities';

export default function Home() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  // Memoize the user document reference
  const userDocRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  // Use the useDoc hook to get the user's profile data
  const { data: userData, isLoading: isUserDataLoading } = useDoc<User>(userDocRef);

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loading = isUserLoading || isUserDataLoading;
    setIsLoading(loading);
    if (!loading && !user) {
      // User is not logged in, but we show the LandingPage, so no redirect needed.
    }
  }, [user, isUserLoading, isUserDataLoading, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        Loading...
      </div>
    );
  }

  // If user is logged in
  if (user) {
    // If user has a companyId, show the main dashboard
    if (userData?.companyId) {
      return <HomeDashboard />;
    }
    // If user does not have a companyId, show the company selection screen
    return <CompanySelection />;
  }

  // If no user is logged in, show the landing page
  return <LandingPage />;
}