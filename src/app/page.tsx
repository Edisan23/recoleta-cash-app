'use client';

import { LandingPage } from '@/components/LandingPage';

// --- Autenticación Suspendida ---
// La lógica de autenticación está desactivada. La página de inicio
// se muestra para permitir el acceso a las diferentes rutas de login
// (operador y administrador).

export default function Home() {
  return <LandingPage />;
}
