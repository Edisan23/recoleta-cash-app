import Link from 'next/link';
import { Hexagon, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function LandingPage() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center p-8 text-center bg-gray-50">
      
      <div className="mb-8">
        <Hexagon className="h-16 w-16 text-primary mx-auto" strokeWidth={1.5}/>
      </div>

      <h1 className="text-5xl font-bold mb-4">TT App</h1>
      <p className="text-xl text-muted-foreground mb-8 max-w-md mx-auto">
        Plataforma de Gestión de Turnos y Nómina para Operadores y Empresas.
      </p>
      
      <div className="flex gap-4">
        <Button asChild size="lg">
          <Link href="/select-company">
            <LogIn className="mr-2" /> Portal del Operador
          </Link>
        </Button>
      </div>

       {/* Admin Access Link */}
       <div className="absolute bottom-6 right-6">
         <Button asChild variant="ghost" className="text-muted-foreground hover:text-primary">
            <Link href="/login?mode=admin" title="Acceso Administrador">
                <Hexagon className="mr-2 h-5 w-5" />
                Admin
            </Link>
         </Button>
       </div>
    </div>
  );
}
