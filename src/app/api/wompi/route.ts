'use server';
import { NextRequest, NextResponse } from 'next/server';
import { handleWompiEvent } from '@/app/actions/wompi';

// This function handles GET requests to /api/wompi
// It's used by Wompi to validate that the webhook URL is active.
export async function GET(req: NextRequest) {
  return NextResponse.json({ status: "ok" });
}

// This function now delegates the processing to a Server Action
export async function POST(req: NextRequest) {
  try {
    const eventBody = await req.json();
    
    // Call the server action to process the event
    const result = await handleWompiEvent(eventBody);

    if (result.error) {
        console.error('Wompi webhook processing error:', result.error);
        return NextResponse.json({ error: result.error }, { status: 400 });
    }
    
    return NextResponse.json({ status: 'received' });

  } catch (error) {
    console.error('Error processing Wompi webhook:', error);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
