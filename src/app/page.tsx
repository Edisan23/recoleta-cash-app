'use client';

import { OperatorDashboard } from '@/components/OperatorDashboard';

// --- Autenticación Suspendida ---
// Toda la lógica de autenticación y redirección ha sido eliminada temporalmente.
// Esta página ahora muestra directamente el OperatorDashboard para facilitar el desarrollo.
// Para ver el panel de administración, navega a /admin.

export default function Home() {
  return <OperatorDashboard />;
}
