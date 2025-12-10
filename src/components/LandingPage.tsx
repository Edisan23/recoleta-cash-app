import Link from 'next/link';
import { Button } from './ui/button';

export function LandingPage() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center p-24 text-center">
      <h1 className="text-5xl font-bold mb-4">Bienvenido a TT App</h1>
      <p className="text-xl text-muted-foreground mb-8">
        La solución definitiva para la gestión de turnos y cálculo de nómina.
      </p>
      <div className="flex gap-4">
        <Button asChild>
          <Link href="/login">Iniciar Sesión</Link>
        </Button>
        <Button asChild variant="secondary">
          <Link href="/login">Regístrate</Link>
        </Button>
      </div>
    </div>
  );
}
