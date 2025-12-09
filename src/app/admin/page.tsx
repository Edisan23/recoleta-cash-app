'use client';

import { useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { CompanyTable } from '@/components/admin/CompanyTable';
import { Button } from '@/components/ui/button';
import { signOut } from 'firebase/auth';
import { useAuth } from '@/firebase';
import { LogOut } from 'lucide-react';
import { CreateCompanyDialog } from '@/components/admin/CreateCompanyDialog';

export default function AdminPage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const auth = useAuth();

  useEffect(() => {
    if (!isUserLoading && (!user || user.email !== 'tjedisan@gmail.com')) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  const handleSignOut = async () => {
    await signOut(auth);
    router.push('/login');
  };

  if (isUserLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        Loading...
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <header className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Panel de Administración</h1>
          <p className="text-muted-foreground">Bienvenido, {user.displayName || user.email}</p>
        </div>
        <Button variant="ghost" onClick={handleSignOut}>
          <LogOut className="mr-2" />
          Cerrar Sesión
        </Button>
      </header>

      <main>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold">Gestión de Empresas</h2>
          <CreateCompanyDialog />
        </div>
        <div className="p-4 border rounded-lg">
            <CompanyTable />
        </div>
      </main>
    </div>
  );
}
