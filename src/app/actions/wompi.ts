'use server';

import axios from 'axios';
import { doc, updateDoc } from 'firebase/firestore';
import { adminDb } from '@/firebase/server-init';

const WOMPI_API_URL = 'https://sandbox.wompi.co/v1'; // URL de sandbox de Wompi
const WOMPI_PUBLIC_KEY = process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY;
const WOMPI_PRIVATE_KEY = process.env.WOMPI_PRIVATE_KEY;


export async function createWompiTransaction(amount: number, userEmail: string, userId: string): Promise<{ transactionId: string, reference: string } | { error: string }> {
    if (!WOMPI_PUBLIC_KEY || !WOMPI_PRIVATE_KEY) {
        console.error("Wompi keys are not configured in .env file");
        return { error: 'El servicio de pago no está configurado correctamente.' };
    }

    const reference = `turnopro-premium-${userId}-${Date.now()}`;
    const redirectUrl = `${process.env.NEXT_PUBLIC_APP_URL}/operator/payment/status`;

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
        }, {
            headers: {
                Authorization: `Bearer ${WOMPI_PRIVATE_KEY}`
            }
        });

        const transactionId = response.data.data.id;
        
        if (!transactionId) {
             throw new Error('No se pudo crear la transacción de Wompi.');
        }

        return { transactionId, reference };

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
