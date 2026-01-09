'use server';

import { NextResponse } from 'next/server';
import { adminDb } from '@/firebase/server-init';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import type { CompanySettings } from '@/types/db-entities';
import crypto from 'crypto';
import { addDays } from 'date-fns';

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

    // In this specific environment, server-side code can only access NEXT_PUBLIC_ variables.
    const WOMPI_EVENTS_SECRET = process.env.NEXT_PUBLIC_WOMPI_EVENTS_SECRET;

    if (!WOMPI_EVENTS_SECRET) {
        console.error('`NEXT_PUBLIC_WOMPI_EVENTS_SECRET` is not configured.');
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
                // Reference format: turnopro-premium-{userId}-{companyId}-{timestamp}
                const referenceParts = reference.split('-');
                const userId = referenceParts[2];
                const companyId = referenceParts[3];

                if (!userId || !companyId) {
                    console.error(`Could not extract userId and companyId from reference: ${reference}`);
                    return new NextResponse('Bad Request: Invalid transaction reference.', { status: 400 });
                }

                try {
                    // Get company settings to determine premium duration
                    const settingsDocRef = doc(adminDb, 'companies', companyId, 'settings', 'main');
                    const settingsSnap = await getDoc(settingsDocRef);
                    if (!settingsSnap.exists()) {
                        console.error(`Settings for company ${companyId} not found.`);
                        return new NextResponse('Internal Server Error: Company settings not found.', { status: 500 });
                    }
                    const settings = settingsSnap.data() as CompanySettings;
                    const premiumDurationDays = settings.premiumDurationDays ?? 0;

                    const now = new Date();
                    let premiumUntil: Date | null = null;

                    if (premiumDurationDays > 0) {
                        premiumUntil = addDays(now, premiumDurationDays);
                    }

                    const userDocRef = doc(adminDb, 'users', userId);
                    const updateData: { premiumUntil: string | null } = {
                        premiumUntil: premiumUntil ? premiumUntil.toISOString() : null,
                    };
                    
                    await updateDoc(userDocRef, updateData);
                    console.log(`User ${userId} successfully updated. Premium active until: ${updateData.premiumUntil || 'Lifetime'}`);

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
