'use server';

import { firestore } from '@/firebase/server-init';
import { doc, updateDoc } from 'firebase/firestore';

// This is a Server Action. It only runs on the server.
export async function handleWompiEvent(eventBody: any) {
  try {
    const { data } = eventBody;
    
    // 1. Check the event status
    if (data?.transaction?.status === 'APPROVED') {
      console.log('Payment APPROVED:', data.transaction.reference);
      
      // 2. Extract user ID from the reference
      // Assumes reference is like: "turno-pro-user-USER_ID-TIMESTAMP"
      const reference = data.transaction.reference;
      if (!reference || typeof reference !== 'string') {
        return { error: 'Invalid or missing payment reference.' };
      }

      const parts = reference.split('-');
      if (parts.length < 4 || parts[0] !== 'turno' || parts[1] !== 'pro' || parts[2] !== 'user') {
        console.warn('Received webhook for an unknown reference format:', reference);
        return { error: 'Unknown reference format.' };
      }
      const userId = parts[3];

      if (!userId) {
         console.error('Could not extract userId from reference:', reference);
         return { error: 'Invalid payment reference, userId missing.' };
      }

      // 3. Update user's status in Firestore
      try {
        const userDocRef = doc(firestore, 'users', userId);
        await updateDoc(userDocRef, {
          paymentStatus: 'paid'
        });
        console.log(`User ${userId} successfully upgraded to 'paid'.`);
        return { success: true };
      } catch (dbError) {
        console.error(`Failed to update user ${userId} in Firestore:`, dbError);
        // This is a critical error. You might want to retry or log for manual intervention.
        return { error: 'Database update failed.' };
      }

    } else {
      console.log(`Received non-approved transaction status: ${data?.transaction?.status}`);
      return { success: true, message: 'Status not approved.' };
    }
  } catch (e) {
    console.error("Error in handleWompiEvent action:", e);
    return { error: 'Internal server error in server action.'}
  }
}
