import Link from 'next/link';
import { Hexagon, LogIn, UserCog } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-8">
      <div className="flex flex-col items-center text-center mb-12">
        <Hexagon className="h-16 w-16 text-primary mx-auto mb-6" strokeWidth={1.5}/>
        <h1 className="text-5xl font-bold mb-4">TT App</h1>
        <p className="text-xl text-muted-foreground max-w-md mx-auto">
          Plataforma de Gestión de Turnos y Nómina.
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
        <Card className="flex flex-col">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Portal del Operador</CardTitle>
            <CardDescription>Registra tus turnos y consulta tus pagos.</CardDescription>
          </CardHeader>
          <CardContent className="flex-grow flex items-center justify-center">
            <Button asChild size="lg" className="w-full">
              <Link href="/select-company">
                <LogIn className="mr-2" /> Ingresar como Operador
              </Link>
            </Button>
          </CardContent>
        </Card>
        
        <Card className="flex flex-col">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Panel de Administración</CardTitle>
            <CardDescription>Gestiona empresas, operadores y configuraciones.</CardDescription>
          </CardHeader>
          <CardContent className="flex-grow flex items-center justify-center">
             <Button asChild size="lg" variant="outline" className="w-full">
              <Link href="/admin">
                <UserCog className="mr-2" /> Ingresar como Admin
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
