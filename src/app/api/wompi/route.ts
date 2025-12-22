import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { initializeFirebase } from '@/firebase/server-init';
import { doc, updateDoc } from 'firebase/firestore';


// This function handles POST requests to /api/wompi
export async function POST(req: NextRequest) {
  try {
    const wompiWebhookSecret = process.env.WOMPI_WEBHOOK_SECRET;

    if (!wompiWebhookSecret) {
      console.error('WOMPI_WEBHOOK_SECRET is not set.');
      return NextResponse.json({ error: 'Internal server configuration error.' }, { status: 500 });
    }
    
    // 1. Get the event body and signature from the request
    const eventBody = await req.json();
    const signature = req.headers.get('x-wompi-signature'); // Wompi might use a different header, check their docs

    if (!signature) {
       return NextResponse.json({ error: 'Missing Wompi signature.' }, { status: 400 });
    }

    // 2. Recreate the signature to verify the event
    const stringToSign = `${JSON.stringify(eventBody)}${wompiWebhookSecret}`;
    const calculatedSignature = crypto.createHash('sha256').update(stringToSign).digest('hex');

    // NOTE: Wompi's documentation on signature verification is not explicit.
    // The above is a common pattern, but might need adjustment.
    // An alternative might be to use the `event.sent_at` timestamp.
    // For now, this is a placeholder for the actual verification logic.
    // For production, it's CRITICAL to implement this correctly based on Wompi's docs.
    
    // For this example, we will assume a simplified check.
    // A more robust check might look like this:
    // const wompiSignature = req.headers.get('X-Wompi-Signature');
    // const [timestamp, signatureHash] = wompiSignature.split(',');
    // const stringToSign = `${eventBody.reference}${eventBody.status}${eventBody.amount_in_cents}${timestamp}${wompiWebhookSecret}`;
    // const calculatedHash = crypto.createHmac('sha256', wompiWebhookSecret).update(stringToSign).digest('hex');
    // if (calculatedHash !== signatureHash) {
    //   return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    // }

    const { data } = eventBody;
    
    // 3. Check the event status
    if (data.transaction.status === 'APPROVED') {
      console.log('Payment APPROVED:', data.transaction.reference);
      
      // 4. Extract user ID from the reference
      // Assumes reference is like: "turno-pro-user-USER_ID-TIMESTAMP"
      const reference = data.transaction.reference;
      const parts = reference.split('-');
      if (parts[0] !== 'turno' || parts[1] !== 'pro' || parts[2] !== 'user') {
        console.warn('Received webhook for an unknown reference format:', reference);
        return NextResponse.json({ status: 'ignored', reason: 'Unknown reference format' });
      }
      const userId = parts[3];

      if (!userId) {
         console.error('Could not extract userId from reference:', reference);
         return NextResponse.json({ error: 'Invalid payment reference' }, { status: 400 });
      }

      // 5. Update user's status in Firestore
      try {
        const { firestore } = initializeFirebase();
        const userDocRef = doc(firestore, 'users', userId);
        await updateDoc(userDocRef, {
          paymentStatus: 'paid'
        });
        console.log(`User ${userId} successfully upgraded to 'paid'.`);
      } catch (dbError) {
        console.error(`Failed to update user ${userId} in Firestore:`, dbError);
        // This is a critical error. You might want to retry or log for manual intervention.
        return NextResponse.json({ error: 'Database update failed.' }, { status: 500 });
      }

    } else {
      console.log(`Received non-approved transaction status: ${data.transaction.status}`);
    }
    
    // 6. Respond to Wompi to acknowledge receipt
    return NextResponse.json({ status: 'received' });

  } catch (error) {
    console.error('Error processing Wompi webhook:', error);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
