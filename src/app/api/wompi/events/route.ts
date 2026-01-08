'use server';

import { NextResponse } from 'next/server';
import { adminDb } from '@/firebase/server-init';
import { doc, updateDoc } from 'firebase/firestore';
import crypto from 'crypto';

interface WompiTransaction {
    id: string;
    status: 'APPROVED' | 'DECLINED' | 'VOIDED' | 'ERROR' | 'PENDING';
    amount_in_cents: number;
    reference: string;
    customer_email: string;
}

interface WompiEvent {
    event: string;
    data: {
        transaction: WompiTransaction;
    };
    sent_at: string;
    signature?: {
        properties: string[];
        checksum: string;
    }
}

export async function POST(request: Request) {
    console.log('Received Wompi event...');

    const WOMPI_EVENTS_SECRET = process.env.WOMPI_EVENTS_SECRET;

    if (!WOMPI_EVENTS_SECRET) {
        console.error('WOMPI_EVENTS_SECRET is not configured.');
        return new NextResponse('Internal Server Error: Webhook secret not configured.', { status: 500 });
    }

    try {
        const event = await request.json() as WompiEvent;

        // --- Verify Event Signature ---
        const signatureChecksum = event.signature?.checksum;
        const signatureProperties = event.signature?.properties;
        const transaction = event.data.transaction;

        if (!signatureChecksum || !signatureProperties) {
             console.warn('Wompi event received without a signature.');
             return new NextResponse('Bad Request: Missing signature.', { status: 400 });
        }
        
        // As per Wompi docs: stringToSign = `${transaction.id}${transaction.status}${transaction.amount_in_cents}`
        const stringToSign = `${transaction.id}${transaction.status}${transaction.amount_in_cents}`;

        const calculatedSignature = crypto
            .createHmac('sha256', WOMPI_EVENTS_SECRET)
            .update(stringToSign)
            .digest('hex');

        if (calculatedSignature !== signatureChecksum) {
            console.error('Invalid Wompi event signature.');
            return new NextResponse('Forbidden: Invalid signature.', { status: 403 });
        }
        console.log('Wompi event signature verified.');

        // --- Process Event ---
        if (event.event === 'transaction.updated') {
            const { id: transactionId, status, reference } = transaction;
            console.log(`Processing transaction ${transactionId} with status ${status}`);

            if (status === 'APPROVED') {
                const userId = reference.split('-')[2];

                if (!userId) {
                    console.error(`Could not extract userId from reference: ${reference}`);
                    return new NextResponse('Bad Request: Invalid transaction reference.', { status: 400 });
                }

                try {
                    const userDocRef = doc(adminDb, 'users', userId);
                    await updateDoc(userDocRef, { isPremium: true });
                    console.log(`User ${userId} successfully updated to Premium.`);
                } catch (dbError) {
                    console.error(`Failed to update user ${userId} to premium in Firestore:`, dbError);
                    // Return 500 so Wompi retries the webhook
                    return new NextResponse('Internal Server Error: Failed to update user status.', { status: 500 });
                }
            }
        }

        return new NextResponse('Event received.', { status: 200 });

    } catch (error) {
        console.error('Error processing Wompi webhook:', error);
        return new NextResponse('Bad Request: Invalid event payload.', { status: 400 });
    }
}
