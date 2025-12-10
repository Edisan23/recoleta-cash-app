'use client';

import { useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { CompanyTable } from '@/components/admin/CompanyTable';
import { CreateCompanyDialog } from '@/components/admin/CreateCompanyDialog';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/firebase';
import { signOut } from 'firebase/auth';
import { LogOut } from 'lucide-react';

// The specific UID for the admin user
const ADMIN_UID = '15sJqL2prSVL2adSXRyqsefg26v1';

export default function AdminPage() {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const router = useRouter();

  useEffect(() => {
    // If auth state is still loading, do nothing.
    if (isUserLoading) {
      return;
    }
    // If there's no user or the user is not the admin, redirect to login.
    if (!user || user.uid !== ADMIN_UID) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  const handleSignOut = async () => {
    await signOut(auth);
    router.push('/login');
  };

  // While checking user auth, show a loading state.
  if (isUserLoading || !user || user.uid !== ADMIN_UID) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        Cargando...
      </div>
    );
  }

  // If the user is the admin, show the dashboard.
  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <header className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Panel de Administración</h1>
          <p className="text-muted-foreground">Bienvenido, {user.displayName || 'Admin'}.</p>
        </div>
        <div className="flex items-center gap-4">
          <CreateCompanyDialog />
          <Button variant="ghost" onClick={handleSignOut}>
            <LogOut className="mr-2" />
            Cerrar Sesión
          </Button>
        </div>
      </header>

      <main>
        <CompanyTable />
      </main>
    </div>
  );
}
