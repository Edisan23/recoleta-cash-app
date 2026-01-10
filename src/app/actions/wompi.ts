'use server';

import axios from 'axios';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { adminDb } from '@/firebase/server-init';
import type { CompanySettings } from '@/types/db-entities';
import { addDays } from 'date-fns';
import crypto from 'crypto';

const WOMPI_API_URL = 'https://production.wompi.co/v1'; // URL de PRODUCCIÓN de Wompi

export async function createWompiTransaction(amount: number, userEmail: string, userId: string, companyId: string): Promise<{ checkoutUrl: string; } | { error: string }> {
    // In this specific environment, server-side code can only access NEXT_PUBLIC_ variables.
    const WOMPI_PUBLIC_KEY = process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY;
    const WOMPI_PRIVATE_KEY = process.env.NEXT_PUBLIC_WOMPI_PRIVATE_KEY;
    const WOMPI_INTEGRITY_SECRET = process.env.NEXT_PUBLIC_WOMPI_INTEGRITY_SECRET;
    
    if (!WOMPI_PUBLIC_KEY || !WOMPI_PRIVATE_KEY || !WOMPI_INTEGRITY_SECRET) {
        console.error("Wompi keys are not configured. Check .env file.");
        if (!WOMPI_PUBLIC_KEY) console.error("`NEXT_PUBLIC_WOMPI_PUBLIC_KEY` is missing.");
        if (!WOMPI_PRIVATE_KEY) console.error("`NEXT_PUBLIC_WOMPI_PRIVATE_KEY` is missing.");
        if (!WOMPI_INTEGRITY_SECRET) console.error("`NEXT_PUBLIC_WOMPI_INTEGRITY_SECRET` is missing.");
        return { error: 'El servicio de pago no está configurado correctamente.' };
    }

    const reference = `turnopro-premium-${userId}-${companyId}-${Date.now()}`;
    const amountInCents = amount * 100;
    const currency = 'COP';

    // Generate integrity hash
    const concatenation = `${reference}${amountInCents}${currency}${WOMPI_INTEGRITY_SECRET}`;
    const integrityHash = crypto.createHash('sha256').update(concatenation).digest('hex');

    const baseUrl = 'https://studio--recoleta-cash-app.us-central1.hosted.app';
    const redirectUrl = `${baseUrl}/operator/payment/status`;
    const eventsUrl = `${baseUrl}/api/wompi/events`;

    const payload = {
        amount_in_cents: amountInCents,
        currency: currency,
        customer_email: userEmail,
        public_key: WOMPI_PUBLIC_KEY,
        reference: reference,
        redirect_url: redirectUrl,
        signature: {
            integrity: integrityHash
        }
    };
    
    const headers = {
        Authorization: `Bearer ${WOMPI_PRIVATE_KEY}`
    };

    try {
        const response = await axios.post(`${WOMPI_API_URL}/checkouts`, payload, { headers });

        const checkoutId = response.data.data.id;
        
        if (!checkoutId) {
             throw new Error('No se pudo crear la sesión de pago de Wompi.');
        }

        const checkoutUrl = `https://checkout.wompi.co/p/${checkoutId}`;

        return { checkoutUrl };

    } catch (error: any) {
        console.error('Error creating Wompi checkout session:', error.response?.data || error.message);
        return { error: 'No se pudo iniciar el proceso de pago.' };
    }
}


export async function getWompiTransactionStatus(transactionId: string): Promise<{ status: string; reference: string } | { error: string }> {
    const WOMPI_PRIVATE_KEY = process.env.NEXT_PUBLIC_WOMPI_PRIVATE_KEY;
    if (!WOMPI_PRIVATE_KEY) {
        return { error: 'El servicio de pago no está configurado.' };
    }
    try {
        const response = await axios.get(`${WOMPI_API_URL}/transactions/${transactionId}`, {
            headers: {
                Authorization: `Bearer ${WOMPI_PRIVATE_KEY}`
            }
        });
        const { status, reference } = response.data.data;
        return { status, reference };
    } catch (error) {
        console.error("Error fetching Wompi transaction status:", error);
        return { error: 'No se pudo verificar el estado del pago.' };
    }
}


export async function updateUserToPremium(userId: string, companyId: string): Promise<{ success: boolean } | { error: string }> {
    try {
        // 1. Get company settings to determine premium duration
        const settingsDocRef = doc(adminDb, 'companies', companyId, 'settings', 'main');
        const settingsSnap = await getDoc(settingsDocRef);

        if (!settingsSnap.exists()) {
            return { error: "No se encontró la configuración de la empresa." };
        }
        const settings = settingsSnap.data() as CompanySettings;
        const premiumDurationDays = settings.premiumDurationDays ?? 0;

        // 2. Calculate the new expiration date
        const now = new Date();
        let premiumUntil: Date | null = null;

        if (premiumDurationDays > 0) {
            premiumUntil = addDays(now, premiumDurationDays);
        }

        // 3. Update the user document
        const userDocRef = doc(adminDb, 'users', userId);
        const updateData: { premiumUntil: string | null } = {
            premiumUntil: premiumUntil ? premiumUntil.toISOString() : null, // Store as ISO string or null for lifetime
        };

        await updateDoc(userDocRef, updateData);

        return { success: true };
    } catch (error) {
        console.error("Error updating user to premium:", error);
        return { error: "No se pudo actualizar el estado de tu cuenta." };
    }
}
