'use client';

import { OperatorDashboard } from '@/components/OperatorDashboard';

// La autenticación está suspendida.
// Se muestra directamente el panel del operador con un usuario ficticio.
// Para acceder al panel de admin, navega directamente a /admin.

export default function Home() {
  return <OperatorDashboard />;
}
