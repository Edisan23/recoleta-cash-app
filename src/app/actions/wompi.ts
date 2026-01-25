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

// ¡ADVERTENCIA DE SEGURIDAD!
// Las llaves están directamente en el código para resolver un problema de configuración del entorno.
// En una aplicación de producción real, estas llaves NUNCA deben estar aquí.
// Deben cargarse de forma segura desde variables de entorno.
const WOMPI_PUBLIC_KEY = "pub_prod_v2jBwbX8JiGCykpyiGFS37VrqKB8PBCL";
const WOMPI_PRIVATE_KEY = "prv_prod_y8d6EwoXkdAgvleQacu9I4ap3xlYDnhQ";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";


// Acción para crear una transacción en Wompi y obtener la URL de pago
export async function createWompiPayment(
    { userId, companyId, userEmail, premiumPrice }: 
    { userId: string; companyId: string; userEmail: string; premiumPrice: number }
) {

    if (!WOMPI_PRIVATE_KEY || !WOMPI_PUBLIC_KEY || !APP_URL) {
        console.error("Wompi keys are not set. Check your .env.local file or the hardcoded values.");
        return { success: false, message: 'El servidor no está configurado para procesar pagos.' };
    }

    try {
        // Paso 1: Obtener el token de aceptación
        const merchantResponse = await fetch(`${WOMPI_API_URL}/merchants/${WOMPI_PUBLIC_KEY}`);
        const merchantData = await merchantResponse.json();
        
        if (!merchantData.data?.presigned_acceptance?.acceptance_token) {
            console.error('Wompi Merchant Error:', merchantData);
            return { success: false, message: 'No se pudo obtener el token de aceptación de Wompi.' };
        }
        const acceptanceToken = merchantData.data.presigned_acceptance.acceptance_token;

        // Paso 2: Crear la carga útil (payload) para la transacción
        const amountInCents = premiumPrice * 100;
        const reference = `recoleta-cash-${userId}-${companyId}-${Date.now()}`;
        const redirectUrl = `${APP_URL}/payment/confirmation`;

        const payload = {
            acceptance_token: acceptanceToken,
            amount_in_cents: amountInCents,
            currency: 'COP',
            customer_email: userEmail,
            reference: reference,
            redirect_url: redirectUrl,
        };

        const response = await fetch(`${WOMPI_API_URL}/transactions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${WOMPI_PRIVATE_KEY}`,
            },
            body: JSON.stringify(payload),
        });

        const data = await response.json();

        if (data.error) {
            console.error('Wompi Error:', data.error);
            console.error('Request Payload:', payload); // For debugging

            let errorMessage = 'Error al crear la transacción.';
            if (data.error.messages && typeof data.error.messages === 'object') {
                const detailedMessages = Object.entries(data.error.messages)
                    .map(([field, messages]) => `${field}: ${(messages as string[]).join(', ')}`)
                    .join('; ');
                if (detailedMessages) {
                    errorMessage = detailedMessages;
                }
            } else if (data.error.reason) {
                errorMessage = data.error.reason;
            } else if (typeof data.error === 'string') {
                 errorMessage = data.error;
            }

            return { success: false, message: errorMessage };
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
     if (!WOMPI_PRIVATE_KEY) {
        console.error("Wompi private key is not set. Check your .env.local file or the hardcoded value.");
        return { status: 'ERROR', message: 'El servidor no está configurado para verificar pagos.' };
    }
    try {
        const response = await fetch(`${WOMPI_API_URL}/transactions/${transactionId}`, {
            headers: {
                Authorization: `Bearer ${WOMPI_PRIVATE_KEY}`,
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
