'use client';

import { LandingPage } from '@/components/LandingPage';

// La autenticación está suspendida.
// Se muestra la LandingPage para permitir el acceso simulado a ambos roles.
// - El botón "Iniciar Sesión" inicia el flujo del operador.
// - El icono en la esquina inferior derecha es el acceso directo al panel de administrador.

export default function Home() {
  return <LandingPage />;
}
