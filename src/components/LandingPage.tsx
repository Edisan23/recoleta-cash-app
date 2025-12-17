import Link from 'next/link';
import { Hexagon, LogIn, UserCog } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export function LandingPage() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-gray-50 p-8 dark:bg-gray-900">
      <div className="flex flex-col items-center text-center mb-12">
        <Hexagon className="h-16 w-16 text-primary mx-auto mb-6" strokeWidth={1.5}/>
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
              <Link href="/select-company">
                <LogIn className="mr-2" /> Ingresar como Operador
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
      
       <div className="absolute bottom-6 right-6">
        <Button asChild variant="ghost" className="text-muted-foreground hover:text-primary">
          <Link href="/admin" title="Acceso de Administrador">
            <UserCog className="mr-2" />
            <span className="hidden sm:inline">Admin</span>
          </Link>
        </Button>
      </div>
    </div>
  );
}
