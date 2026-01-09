'use server';

import axios from 'axios';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { adminDb } from '@/firebase/server-init';
import type { CompanySettings } from '@/types/db-entities';
import { addDays } from 'date-fns';

const WOMPI_API_URL = 'https://sandbox.wompi.co/v1'; // URL de sandbox de Wompi
const WOMPI_PUBLIC_KEY = process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY;
const WOMPI_PRIVATE_KEY = process.env.WOMPI_PRIVATE_KEY;


export async function createWompiTransaction(amount: number, userEmail: string, userId: string, companyId: string): Promise<{ checkoutUrl: string; } | { error: string }> {
    if (!WOMPI_PUBLIC_KEY || !WOMPI_PRIVATE_KEY) {
        console.error("Wompi keys are not configured in .env file. Make sure NEXT_PUBLIC_WOMPI_PUBLIC_KEY and WOMPI_PRIVATE_KEY are set.");
        return { error: 'El servicio de pago no está configurado correctamente.' };
    }

    // Include companyId in the reference
    const reference = `turnopro-premium-${userId}-${companyId}-${Date.now()}`;
    const baseUrl = 'https://studio--recoleta-cash-app.us-central1.hosted.app';
    const redirectUrl = `${baseUrl}/operator/payment/status`;
    const eventsUrl = `${baseUrl}/api/wompi/events`;


    try {
        const response = await axios.post(`${WOMPI_API_URL}/checkouts`, {
            amount_in_cents: amount * 100,
            currency: 'COP',
            customer_email: userEmail,
            reference: reference,
            redirect_url: redirectUrl,
            // events_url: eventsUrl, // This can be enabled if webhooks are needed.
        }, {
            headers: {
                Authorization: `Bearer ${WOMPI_PRIVATE_KEY}`
            }
        });

        const checkoutId = response.data.data.id;
        
        if (!checkoutId) {
             throw new Error('No se pudo crear la sesión de pago de Wompi.');
        }

        const checkoutUrl = `https://checkout.wompi.co/p/${checkoutId}`;

        return { checkoutUrl };

    } catch (error) {
        console.error('Error creating Wompi checkout session:', error);
        return { error: 'No se pudo iniciar el proceso de pago.' };
    }
}


export async function getWompiTransactionStatus(transactionId: string): Promise<{ status: string; reference: string } | { error: string }> {
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
