'use client';

import { OperatorDashboard } from '@/components/OperatorDashboard';

// --- Autenticación Suspendida ---
// Se muestra directamente el panel del operador para facilitar el desarrollo
// de la interfaz del operador sin necesidad de iniciar sesión.

export default function Home() {
  return <OperatorDashboard />;
}
