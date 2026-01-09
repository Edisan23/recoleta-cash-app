'use server';

import axios from 'axios';
import { doc, updateDoc } from 'firebase/firestore';
import { adminDb } from '@/firebase/server-init';

const WOMPI_API_URL = 'https://sandbox.wompi.co/v1'; // URL de sandbox de Wompi
const WOMPI_PUBLIC_KEY = process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY;
const WOMPI_PRIVATE_KEY = process.env.WOMPI_PRIVATE_KEY;


export async function createWompiTransaction(amount: number, userEmail: string, userId: string): Promise<{ checkoutUrl: string; } | { error: string }> {
    if (!WOMPI_PUBLIC_KEY || !WOMPI_PRIVATE_KEY) {
        console.error("Wompi keys are not configured in .env file. Make sure NEXT_PUBLIC_WOMPI_PUBLIC_KEY and WOMPI_PRIVATE_KEY are set.");
        return { error: 'El servicio de pago no está configurado correctamente.' };
    }

    const reference = `turnopro-premium-${userId}-${Date.now()}`;
    const baseUrl = 'https://studio--recoleta-cash-app.us-central1.hosted.app';
    const redirectUrl = `${baseUrl}/operator/payment/status`;
    const eventsUrl = `${baseUrl}/api/wompi/events`;


    try {
        const response = await axios.post(`${WOMPI_API_URL}/checkouts`, {
            amount_in_cents: amount * 100, // Wompi trabaja en centavos
            currency: 'COP',
            customer_email: userEmail,
            reference: reference,
            redirect_url: redirectUrl,
            payment_source_id: null, // Required for redirection checkout
            // Informa a Wompi a dónde enviar los eventos (webhooks)
            // events_url: eventsUrl, 
        }, {
            headers: {
                Authorization: `Bearer ${WOMPI_PRIVATE_KEY}`
            }
        });

        const checkoutId = response.data.data.id;
        
        if (!checkoutId) {
             throw new Error('No se pudo crear la sesión de pago de Wompi.');
        }

        const checkoutUrl = `${WOMPI_API_URL}/checkouts/${checkoutId}`;

        // Return the URL for redirection
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


export async function updateUserToPremium(userId: string): Promise<{ success: boolean } | { error: string }> {
    try {
        const userDocRef = doc(adminDb, 'users', userId);
        await updateDoc(userDocRef, {
            isPremium: true
        });
        return { success: true };
    } catch (error) {
        console.error("Error updating user to premium:", error);
        return { error: "No se pudo actualizar el estado de tu cuenta." };
    }
}
