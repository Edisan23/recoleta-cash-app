import Link from 'next/link';
import { Hexagon, LogIn, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function LandingPage() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center p-8 text-center">
      <h1 className="text-5xl font-bold mb-4">TT App</h1>
      <p className="text-xl text-muted-foreground mb-8">
        Plataforma de Gestión de Turnos y Nómina
      </p>
      
      <div className="flex gap-4">
        <Button asChild size="lg">
          <Link href="/login">
            <LogIn className="mr-2" /> Iniciar Sesión
          </Link>
        </Button>
      </div>

       {/* Admin Access Link */}
       <div className="absolute bottom-4 right-4">
         <Link href="/admin" title="Acceso Administrador">
           <Hexagon className="h-8 w-8 text-gray-400 hover:text-primary transition-colors" />
         </Link>
       </div>
    </div>
  );
}
