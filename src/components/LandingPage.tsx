import Link from 'next/link';
import { Button } from './ui/button';

// Icono de Garza (Heron) SVG.
// Hecho a mano para ser simple y efectivo.
const GarzaIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M12 2L12 5" />
    <path d="M8 7L16 7" />
    <path d="M12 14L12 22" />
    <path d="M17.5 11C17.5 12.3807 16.3807 13.5 15 13.5C13.6193 13.5 12.5 12.3807 12.5 11C12.5 9.61929 13.6193 8.5 15 8.5C16.3807 8.5 17.5 9.61929 17.5 11Z" />
    <path d="M9 11L5 20" />
    <path d="M15 11L19 20" />
  </svg>
);


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
          <Link href="/signup">Regístrate</Link>
        </Button>
      </div>

      <div className="absolute bottom-4 right-4">
        <Link href="/login" aria-label="Admin Login">
          <GarzaIcon className="h-8 w-8 text-muted-foreground transition-colors hover:text-foreground" />
        </Link>
      </div>
    </div>
  );
}
