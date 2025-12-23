'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { LogoSpinner } from '@/components/LogoSpinner';
import Script from 'next/script';

const WOMPI_PRICE_IN_CENTS = 3000000; // $30,000.00 COP
const WOMPI_CURRENCY = 'COP';

function WompiCheckoutWidget({ publicKey, currency, amountInCents, reference, redirectUrl }: { publicKey: string; currency: string; amountInCents: number; reference: string; redirectUrl: string; }) {
  return (
    <>
      <Script src="https://checkout.wompi.co/widget.js" />
      <form action="https://checkout.wompi.co/p/" method="GET">
        <input type="hidden" name="public-key" value={publicKey} />
        <input type="hidden" name="currency" value={currency} />
        <input type="hidden" name="amount-in-cents" value={amountInCents} />
        <input type="hidden" name="reference" value={reference} />
        <input type="hidden" name="redirect-url" value={redirectUrl} />
        <button type="submit" className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors">
          Pagar con Wompi
        </button>
      </form>
    </>
  );
}


export default function PaymentPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const userId = searchParams.get('userId');

  const wompiPublicKey = process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY;

  useEffect(() => {
    if (!userId) {
      // If no userId is present, redirect to login
      router.replace('/login');
    }
     if (!wompiPublicKey) {
      console.error("Wompi public key is not configured.");
      // Optionally, show an error message to the user
    }
  }, [userId, router, wompiPublicKey]);

  // Generate a unique reference for this payment attempt
  const paymentReference = useMemo(() => {
    if (!userId) return '';
    // Structure: app_name-user-USER_ID-timestamp
    return `turno-pro-user-${userId}-${Date.now()}`;
  }, [userId]);

  const redirectUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    // This should be the URL the user is sent to after payment
    // It should be a page that can show a success or failure message
    // For now, we'll redirect back to the operator dashboard
    return `${window.location.origin}/operator/dashboard`;
  }, []);

  if (!userId || !wompiPublicKey) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100 dark:bg-gray-900">
        <Card className="w-full max-w-md p-8 text-center">
          <LogoSpinner />
          <p className="mt-4 text-muted-foreground">Cargando pasarela de pago...</p>
           {!wompiPublicKey && <p className='text-red-500 mt-2'>Error de configuración: La clave pública de Wompi no está disponible.</p>}
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Activar Cuenta Premium</CardTitle>
          <CardDescription>
            Realiza el pago para obtener acceso ilimitado a todas las funcionalidades de la aplicación.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-center">
            <p className="text-lg font-semibold text-blue-800">Total a Pagar</p>
            <p className="text-4xl font-bold text-blue-900">$30.000 COP</p>
            <p className="text-sm text-blue-700">Suscripción de por vida</p>
          </div>
          <WompiCheckoutWidget
            publicKey={wompiPublicKey}
            currency={WOMPI_CURRENCY}
            amountInCents={WOMPI_PRICE_IN_CENTS}
            reference={paymentReference}
            redirectUrl={redirectUrl}
          />
        </CardContent>
      </Card>
    </div>
  );
}
