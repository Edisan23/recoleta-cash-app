import Link from 'next/link';
import { Hexagon } from 'lucide-react';

export function LandingPage() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center p-24 text-center">
      <h1 className="text-5xl font-bold mb-4">TT App</h1>
      <p className="text-xl text-muted-foreground mb-8">
        Plataforma de Gestión Administrativa
      </p>

       {/* Admin Access Link */}
       <div className="absolute bottom-4 right-4">
         <Link href="/login" title="Acceso Administrador">
           <Hexagon className="h-8 w-8 text-gray-400 hover:text-primary transition-colors" />
         </Link>
       </div>
    </div>
  );
}
