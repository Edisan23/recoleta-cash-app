'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, AlertCircle } from 'lucide-react';

export default function PayrollDetailRemovedPage() {
    const router = useRouter();

    return (
        <div className="flex flex-col items-center justify-center h-screen text-center p-4">
          <AlertCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Historial Deshabilitado</h2>
          <p className="text-lg text-muted-foreground mb-6">
            La función de historial ha sido eliminada.
          </p>
          <Button onClick={() => router.push('/operator/dashboard')}>
              <ArrowLeft className="mr-2" />
              Volver al Panel
          </Button>
      </div>
    );
}
