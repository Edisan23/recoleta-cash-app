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
    // Si la autenticación aún está cargando, no hacemos nada.
    if (isUserLoading) {
      return;
    }

    // Si el usuario es el administrador, redirigir a /admin.
    if (user && user.uid === ADMIN_UID) {
      router.replace('/admin');
    }
  }, [user, isUserLoading, router]);

  // Durante la carga inicial, muestra un estado de "Cargando...".
  if (isUserLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        Cargando...
      </div>
    );
  }

  // Si el usuario es el administrador, se está redirigiendo.
  // Mostramos un mensaje mientras ocurre la redirección para evitar renderizar
  // cualquier otro componente que pueda causar conflictos.
  if (user && user.uid === ADMIN_UID) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        Redirigiendo al panel de administración...
      </div>
    );
  }

  // Si hay un usuario que no es administrador, muestra el panel del operador.
  if (user) {
    return <OperatorDashboard />;
  }
  
  // Si no hay ningún usuario logueado, muestra la página de inicio.
  return <LandingPage />;
}
