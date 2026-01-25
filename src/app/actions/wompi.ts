// src/app/actions/wompi.ts
'use server';

import { getFirestore, doc, getDoc, updateDoc } from 'firebase/firestore';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { firebaseConfig } from '@/firebase/config';
import type { CompanySettings } from '@/types/db-entities';
import { addDays } from 'date-fns';
import { revalidatePath } from 'next/cache';

// Asegurar que Firebase esté inicializado
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const firestore = getFirestore(app);

// URL de la API de Wompi
const WOMPI_API_URL = 'https://production.wompi.co/v1';

// Acción para crear una transacción en Wompi y obtener la URL de pago
export async function createWompiPayment(
    { userId, companyId, userEmail, premiumPrice }: 
    { userId: string; companyId: string; userEmail: string; premiumPrice: number }
) {
    // Leer las variables de entorno dentro de la función para asegurar el acceso en tiempo de ejecución
    const wompiPrivateKey = process.env.WOMPI_PRIVATE_KEY;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;

    if (!wompiPrivateKey || !appUrl) {
        console.error("Wompi environment variables are not set. Check your .env.local file.");
        return { success: false, message: 'El servidor no está configurado para procesar pagos.' };
    }

    try {
        const amountInCents = premiumPrice * 100;
        const reference = `recoleta-cash-${userId}-${companyId}-${Date.now()}`;
        const redirectUrl = `${appUrl}/payment/confirmation`;

        const response = await fetch(`${WOMPI_API_URL}/transactions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${wompiPrivateKey}`,
            },
            body: JSON.stringify({
                amount_in_cents: amountInCents,
                currency: 'COP',
                customer_email: userEmail,
                payment_method: {
                    type: "CARD",
                    installments: 1
                },
                reference: reference,
                redirect_url: redirectUrl,
            }),
        });

        const data = await response.json();

        if (data.error) {
            console.error('Wompi Error:', data.error);
            return { success: false, message: data.error.messages?.join(', ') || 'Error al crear la transacción.' };
        }
        
        const transactionId = data.data.id;
        const checkoutUrl = `https://checkout.wompi.co/p/${transactionId}`;
        
        return { success: true, checkoutUrl };

    } catch (error) {
        console.error('Error creating Wompi payment:', error);
        return { success: false, message: 'Ocurrió un error inesperado al iniciar el pago.' };
    }
}

// Acción para verificar el pago y otorgar acceso premium
export async function verifyWompiPayment(transactionId: string): Promise<{ status: string; message: string }> {
     // Leer la variable de entorno dentro de la función
     const wompiPrivateKey = process.env.WOMPI_PRIVATE_KEY;
     if (!wompiPrivateKey) {
        console.error("Wompi private key is not set. Check your .env.local file.");
        return { status: 'ERROR', message: 'El servidor no está configurado para verificar pagos.' };
    }
    try {
        const response = await fetch(`${WOMPI_API_URL}/transactions/${transactionId}`, {
            headers: {
                Authorization: `Bearer ${wompiPrivateKey}`,
            },
        });

        const data = await response.json();

        if (data.error) {
            console.error('Wompi Verification Error:', data.error);
            return { status: 'ERROR', message: 'No se pudo verificar la transacción.' };
        }

        const transaction = data.data;

        if (transaction.status === 'APPROVED') {
            const { reference } = transaction;
            const [, , userId, companyId] = reference.split('-');

            if (!userId || !companyId) {
                throw new Error('Referencia de pago inválida');
            }

            const settingsDocRef = doc(firestore, 'companies', companyId, 'settings', 'main');
            const settingsSnap = await getDoc(settingsDocRef);
            const settings = settingsSnap.data() as CompanySettings;

            const userDocRef = doc(firestore, 'users', userId);
            
            let premiumUntil: string | null;
            if (settings?.premiumDurationDays && settings.premiumDurationDays > 0) {
                premiumUntil = addDays(new Date(), settings.premiumDurationDays).toISOString();
            } else {
                premiumUntil = null; // Premium de por vida
            }

            await updateDoc(userDocRef, { premiumUntil });
            
            // Revalida la ruta del panel para reflejar el estado premium inmediatamente
            revalidatePath('/operator/dashboard');

            return { status: 'APPROVED', message: '¡Pago aprobado! Tu cuenta ha sido activada.' };
        } else {
            return { status: transaction.status, message: `El pago fue ${transaction.status}. Por favor, intenta de nuevo.` };
        }

    } catch (error) {
        console.error('Error verifying Wompi payment:', error);
        return { status: 'ERROR', message: 'Ocurrió un error inesperado al verificar tu pago.' };
    }
}
