'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Aquí podrías enviar el error a un servicio de logging
    console.error(error);
  }, [error]);

  return (
    <html>
      <body>
        <div
          style={{
            height: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            padding: '1rem',
          }}
        >
          <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1rem' }}>
            Algo salió muy mal
          </h2>
          <p style={{ color: '#666', marginBottom: '1.5rem' }}>
            Ocurrió un error inesperado en la aplicación.
          </p>
          <Button onClick={() => reset()}>Intentar de nuevo</Button>
        </div>
      </body>
    </html>
  );
}
