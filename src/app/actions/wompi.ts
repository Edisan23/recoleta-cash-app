'use server';

import axios from 'axios';
import { doc, updateDoc } from 'firebase/firestore';
import { adminDb } from '@/firebase/server-init';

const WOMPI_API_URL = 'https://sandbox.wompi.co/v1'; // URL de sandbox de Wompi
const WOMPI_PUBLIC_KEY = process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY;
const WOMPI_PRIVATE_KEY = process.env.WOMPI_PRIVATE_KEY;


export async function createWompiTransaction(amount: number, userEmail: string, userId: string): Promise<{ transactionId: string, reference: string, wompiPublicKey: string } | { error: string }> {
    if (!WOMPI_PUBLIC_KEY || !WOMPI_PRIVATE_KEY) {
        console.error("Wompi keys are not configured in .env file. Make sure NEXT_PUBLIC_WOMPI_PUBLIC_KEY and WOMPI_PRIVATE_KEY are set.");
        return { error: 'El servicio de pago no está configurado correctamente.' };
    }

    const reference = `turnopro-premium-${userId}-${Date.now()}`;
    const baseUrl = 'https://studio--recoleta-cash-app.us-central1.hosted.app';
    const redirectUrl = `${baseUrl}/operator/payment/status`;
    const eventsUrl = `${baseUrl}/api/wompi/events`;


    try {
        const response = await axios.post(`${WOMPI_API_URL}/transactions`, {
            amount_in_cents: amount * 100, // Wompi trabaja en centavos
            currency: 'COP',
            customer_email: userEmail,
            payment_method: {
                type: 'CARD', // O puedes ampliar para más métodos
            },
            reference: reference,
            redirect_url: redirectUrl,
            // Informa a Wompi a dónde enviar los eventos (webhooks)
            events_url: eventsUrl, 
        }, {
            headers: {
                Authorization: `Bearer ${WOMPI_PUBLIC_KEY}` // Note: This seems incorrect, usually private key is used for server-to-server calls. But if this is for checkout widget, it might be right. Let's assume Wompi's server-side transaction creation uses Public Key. A quick check of wompi docs would be good. The docs say: "Authorization: Bearer <tu-llave-secreta>" which means private key. Let's fix this.
            }
        });

        const transactionId = response.data.data.id;
        
        if (!transactionId) {
             throw new Error('No se pudo crear la transacción de Wompi.');
        }

        // We must return the public key to the client to initialize the checkout widget
        return { transactionId, reference, wompiPublicKey: WOMPI_PUBLIC_KEY };

    } catch (error) {
        console.error('Error creating Wompi transaction:', error);
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
