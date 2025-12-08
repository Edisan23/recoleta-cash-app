'use client';
import { useAuth, useUser } from '@/firebase';
import { Button } from './ui/button';

export function HomeDashboard() {
  const { user } = useUser();
  const auth = useAuth();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold mb-4">
        Bienvenido, {user?.displayName || 'Usuario'}
      </h1>
      <p className="mb-8">Has iniciado sesión correctamente.</p>
      <Button onClick={() => auth.signOut()}>Cerrar Sesión</Button>
    </div>
  );
}

    