import Link from 'next/link';
import { LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ThemeToggle } from './ui/theme-toggle';
import { LogoIcon } from './icons/logo';

export function LandingPage() {
  return (
    <div className="relative flex min-h-screen flex-col bg-gray-50 dark:bg-gray-900">
      
      <div className="absolute top-6 right-6">
        <ThemeToggle />
      </div>

      <main className="flex flex-1 flex-col items-center justify-center p-8 text-center">
        <div className="flex flex-col items-center text-center mb-12">
          <LogoIcon className="h-16 w-16 text-primary mx-auto mb-6" strokeWidth={1.5}/>
          <h1 className="text-5xl font-bold mb-4">Turno Pro</h1>
          <p className="text-xl text-muted-foreground max-w-md mx-auto">
            Plataforma de Gestión de Turnos y Nómina.
          </p>
        </div>
        
        <div className="w-full max-w-md">
          <Card className="flex flex-col text-center">
            <CardHeader>
              <CardTitle className="text-2xl">Portal del Operador</CardTitle>
              <CardDescription>Registra tus turnos y consulta tus pagos.</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow flex items-center justify-center">
              <Button asChild size="lg" className="w-full sm:w-3/4">
                <Link href="/login">
                  <LogIn className="mr-2" /> Ingresar como Operador
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>

      <footer className="w-full text-center text-xs text-muted-foreground p-4">
        <div className="flex items-center justify-center gap-2">
            <p>Edward Santiago Riascos Cwl. 3213118124</p>
            <Link href="/admin/login" title="Acceso de Administrador">
                <LogoIcon className="h-5 w-5 text-muted-foreground hover:text-primary transition-colors" />
            </Link>
        </div>
      </footer>
      
    </div>
  );
}
