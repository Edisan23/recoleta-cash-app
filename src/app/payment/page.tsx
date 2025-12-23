'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { LogoSpinner } from '@/components/LogoSpinner';
import Script from 'next/script';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { CompanySettings } from '@/types/db-entities';

const WOMPI_CURRENCY = 'COP';

function formatCurrency(value: number) {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value);
}

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
        <button type="submit" className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400" disabled={amountInCents <= 0}>
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
  const companyId = searchParams.get('companyId');
  const firestore = useFirestore();

  const settingsRef = useMemoFirebase(() => firestore && companyId ? doc(firestore, 'companies', companyId, 'settings', 'main') : null, [firestore, companyId]);
  const { data: settings, isLoading: settingsLoading } = useDoc<CompanySettings>(settingsRef);
  
  const [priceInCents, setPriceInCents] = useState<number | null>(null);

  const wompiPublicKey = process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY;

  useEffect(() => {
    if (!userId || !companyId) {
      router.replace('/login');
    }
     if (!wompiPublicKey) {
      console.error("Wompi public key is not configured.");
    }
  }, [userId, companyId, router, wompiPublicKey]);

  useEffect(() => {
    if (settings) {
        setPriceInCents((settings.activationFee || 0) * 100);
    }
  }, [settings]);

  // Generate a unique reference for this payment attempt
  const paymentReference = useMemo(() => {
    if (!userId) return '';
    // Structure: app_name-user-USER_ID-timestamp
    return `turno-pro-user-${userId}-${Date.now()}`;
  }, [userId]);

  const redirectUrl = "https://turnospro.empresa/operator/dashboard";


  const isLoading = settingsLoading || priceInCents === null;

  if (isLoading || !userId || !wompiPublicKey) {
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
            <p className="text-4xl font-bold text-blue-900">{formatCurrency(priceInCents / 100)}</p>
            <p className="text-sm text-blue-700">Suscripción de por vida</p>
          </div>
          <WompiCheckoutWidget
            publicKey={wompiPublicKey}
            currency={WOMPI_CURRENCY}
            amountInCents={priceInCents}
            reference={paymentReference}
            redirectUrl={redirectUrl}
          />
           {priceInCents <= 0 && (
                <p className="text-center text-sm text-red-500 mt-4">
                    El valor de activación no está configurado para esta empresa. Por favor, contacta a un administrador.
                </p>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
