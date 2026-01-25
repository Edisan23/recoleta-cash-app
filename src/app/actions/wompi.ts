'use server';

import { getFirestore, doc, getDoc, updateDoc } from 'firebase/firestore';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { firebaseConfig } from '@/firebase/config';
import type { CompanySettings } from '@/types/db-entities';
import { addDays } from 'date-fns';
import { revalidatePath } from 'next/cache';
import { createHash } from 'crypto';

// Asegurar que Firebase esté inicializado
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const firestore = getFirestore(app);

// URL de la API de Wompi
const WOMPI_API_URL = 'https://production.wompi.co/v1';

// ¡ADVERTENCIA DE SEGURIDAD!
// Las llaves están directamente en el código para resolver un problema de configuración del entorno.
// En una aplicación de producción real, estas llaves NUNCA deben estar aquí.
// Deben cargarse de forma segura desde variables de entorno.
const WOMPI_PRIVATE_KEY = "prv_prod_GZ8ET19zZqWBx4qq8CZ0Y59PtR70o4sm";
const WOMPI_INTEGRITY_KEY = "prod_integrity_bYqS7YxN03nn7OmN0dxPIfuhQEs2QrrQ";
const WOMPI_PUBLIC_KEY = "pub_prod_v2jBwbX8JiGCykpyiGFS37VrqKB8PBCL";


export async function createWompiCheckoutUrl(
    price: number, 
    userId: string, 
    companyId: string, 
    userEmail: string | null, 
    userName: string | null
): Promise<string> {
    if (!WOMPI_INTEGRITY_KEY || !WOMPI_PUBLIC_KEY) {
        throw new Error('El servidor no está configurado para procesar pagos (faltan llaves).');
    }

    const amountInCents = price * 100;
    const reference = `recoleta-cash-${userId}-${companyId}-${Date.now()}`;
    const redirectUrl = `https://recoleta-cash-app.web.app/payment/confirmation`;
    const currency = 'COP';

    // 1. Crear la firma de integridad para asegurar la transacción.
    const concatenation = `${reference}${amountInCents}${currency}${WOMPI_INTEGRITY_KEY}`;
    const signature = createHash('sha256').update(concatenation).digest('hex');

    // 2. Construir la URL del checkout de Wompi.
    // Se usa /p/ que es la ruta para pagos con firma.
    const checkoutUrl = new URL('https://checkout.wompi.co/p/');
    checkoutUrl.searchParams.append('public-key', WOMPI_PUBLIC_KEY);
    checkoutUrl.searchParams.append('currency', currency);
    checkoutUrl.searchParams.append('amount-in-cents', String(amountInCents));
    checkoutUrl.searchParams.append('reference', reference);
    checkoutUrl.searchParams.append('redirect-url', redirectUrl);
    checkoutUrl.searchParams.append('signature:integrity', signature);
    
    if (userEmail) {
        checkoutUrl.searchParams.append('customer-data:email', userEmail);
    }
    if (userName) {
        checkoutUrl.searchParams.append('customer-data:full-name', userName);
    }

    return checkoutUrl.toString();
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
            
            // SECURITY CHECK: Verify the paid amount matches the expected price from settings.
            const expectedAmountInCents = (settings?.premiumPrice ?? 0) * 100;
            if (transaction.amount_in_cents !== expectedAmountInCents) {
                console.error(`Tampering attempt! Reference: ${reference}. Expected ${expectedAmountInCents}, but paid ${transaction.amount_in_cents}`);
                return { status: 'ERROR', message: 'El monto pagado no coincide con el costo de activación.' };
            }


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
