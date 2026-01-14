'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase';
import { LandingPage } from '@/components/LandingPage';
import { LogoSpinner } from '@/components/LogoSpinner';

const OPERATOR_COMPANY_KEY = 'fake_operator_company_id';

export default function HomePage() {
  const router = useRouter();
  const { user, isUserLoading } = useUser();

  useEffect(() => {
    // Solo redirigir si la carga ha terminado y hay un usuario
    if (!isUserLoading && user) {
      const companyId = localStorage.getItem(OPERATOR_COMPANY_KEY);
      if (companyId) {
        router.replace('/operator/dashboard');
      } else {
        router.replace('/select-company');
      }
    }
  }, [user, isUserLoading, router]);

  // Muestra un spinner mientras se verifica el estado de autenticación
  if (isUserLoading || user) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <LogoSpinner />
      </div>
    );
  }

  // Si no hay usuario y la carga ha finalizado, muestra la página de bienvenida
  return <LandingPage />;
}
