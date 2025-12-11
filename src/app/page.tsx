'use client';

import { LandingPage } from '@/components/LandingPage';
import { useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

const ADMIN_UID = '15sJqL2prSVL2adSXRyqsefg26v1';

export default function Home() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (isClient && !isUserLoading) {
      if (user?.uid === ADMIN_UID) {
        router.replace('/admin');
      }
    }
  }, [user, isUserLoading, router, isClient]);

  if (!isClient) {
    return null; // O un spinner de carga global
  }

  // Muestra la landing page si no es el admin o está deslogueado
  return <LandingPage />;
}
