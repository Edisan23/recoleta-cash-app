'use client';

import { CompanyTable } from '@/components/admin/CompanyTable';
import { CreateCompanyDialog } from '@/components/admin/CreateCompanyDialog';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';

// --- Autenticación Suspendida ---
// La lógica de useUser y useEffect ha sido comentada para permitir el acceso directo
// a esta página durante el desarrollo. Se simula un objeto de usuario administrador.

const FAKE_ADMIN_USER = {
  uid: '15sJqL2prSVL2adSXRyqsefg26v1',
  displayName: 'Admin (Desarrollo)',
};

export default function AdminPage() {
  const router = useRouter();
  const user = FAKE_ADMIN_USER;

  const handleSignOut = async () => {
    // La funcionalidad real de cierre de sesión está desactivada.
    // Esto te redirige a la página de inicio.
    router.push('/');
  };

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
            Volver al Inicio
          </Button>
        </div>
      </header>

      <main>
        <CompanyTable />
      </main>
    </div>
  );
}
