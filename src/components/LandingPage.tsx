'use client';

import Link from 'next/link';
import Image from 'next/image';
import { LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ThemeToggle } from './ui/theme-toggle';
import { LogoIcon } from './icons/logo';
import { ThemeCustomizer } from './admin/ThemeCustomizer';
import { cn } from '@/lib/utils';

export function LandingPage() {
  return (
    <div className={cn("flex flex-col min-h-screen w-full bg-background")}>
      <header className="absolute top-0 right-0 p-4 sm:p-6 z-10">
        <div className="flex items-center gap-2">
          <ThemeCustomizer />
          <ThemeToggle />
        </div>
      </header>

      <main className="flex-1 grid place-items-center p-4">
        <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          
          {/* Left Side: Hero Text & Logo */}
          <div className="flex flex-col items-center md:items-start text-center md:text-left space-y-6">
            <Image
              src="/favicon.png" // Fixed logo path
              alt="Turno Pro Logo"
              width={120}
              height={120}
              className="mb-4 drop-shadow-lg"
              priority
            />
            <h1 className="text-5xl md:text-6xl font-extrabold tracking-tighter bg-clip-text text-transparent bg-gradient-to-br from-foreground to-muted-foreground">
              Turno Pro
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-md">
              La plataforma definitiva para la gestión de turnos y el cálculo de nómina. Simple, potente y siempre precisa.
            </p>
          </div>
          
          {/* Right Side: Login Card */}
          <Card className="w-full max-w-md mx-auto shadow-2xl border-border/50 transform hover:-translate-y-1 transition-transform duration-300">
            <CardHeader className="text-center space-y-2">
              <CardTitle className="text-3xl font-bold">Portal del Operador</CardTitle>
              <CardDescription className="text-md">
                Registra tus turnos y consulta tus pagos al instante.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <Button asChild size="lg" className="w-full h-14 text-lg font-bold shadow-lg hover:shadow-primary/40 transition-all duration-300 transform hover:scale-105">
                <Link href="/login">
                  <LogIn className="mr-3 h-6 w-6" /> Ingresar como Operador
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>

      <footer className="w-full text-center text-xs text-muted-foreground p-4">
        <div className="flex items-center justify-center gap-2">
            <p>Edward Santiago Riascos Cwl. 3213118124</p>
            <Link href="/admin/login" title="Acceso de Administrador" className="hover:opacity-75 transition-opacity">
                <LogoIcon className="h-5 w-5" />
            </Link>
        </div>
      </footer>
    </div>
  );
}
