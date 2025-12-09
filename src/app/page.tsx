'use client';

import { useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { LandingPage } from '@/components/LandingPage';

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

  // If user is logged in, you could show a dashboard or something else.
  // For now we will still show the landing page.
  if (user) {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center p-24">
            <h1 className="text-4xl font-bold mb-4">
                Bienvenido, {user?.displayName || 'Usuario'}
            </h1>
            <p className="mb-8">Has iniciado sesión correctamente.</p>
        </div>
    );
  }


  // If no user is logged in, show the landing page
  return <LandingPage />;
}
