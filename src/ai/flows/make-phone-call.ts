'use server';
/**
 * @fileOverview A flow for making a phone call using Twilio.
 * - makePhoneCall: The main function to initiate a phone call.
 */
import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { Twilio } from 'twilio';

const MakePhoneCallInputSchema = z.object({
  to: z.string().describe('The phone number to call, in E.164 format (e.g., +14155552671).'),
  message: z.string().describe('The message to be spoken in the call.'),
  voice: z.string().describe('The voice to use for the text-to-speech message.'),
});

type MakePhoneCallInput = z.infer<typeof MakePhoneCallInputSchema>;

const MakePhoneCallOutputSchema = z.object({
    success: z.boolean(),
    sid: z.string().optional(),
    error: z.string().optional(),
});

type MakePhoneCallOutput = z.infer<typeof MakePhoneCallOutputSchema>;


const makePhoneCallFlow = ai.defineFlow(
  {
    name: 'makePhoneCallFlow',
    inputSchema: MakePhoneCallInputSchema,
    outputSchema: MakePhoneCallOutputSchema,
  },
  async ({ to, message }) => {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_PHONE_NUMBER;

    if (!accountSid || !authToken || !from) {
        const errorMsg = "Twilio credentials are not configured. Please set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER in your .env file.";
        console.error(errorMsg);
        return { success: false, error: errorMsg };
    }

    try {
        const client = new Twilio(accountSid, authToken);

        const twiml = `<Response><Say language="es-ES">${message}</Say></Response>`;

        const call = await client.calls.create({
            twiml: twiml,
            to: to,
            from: from,
        });

        console.log('Call initiated with SID:', call.sid);
        return { success: true, sid: call.sid };

    } catch (error: any) {
        console.error('Error making Twilio call:', error);
        return { success: false, error: error.message };
    }
  }
);

export async function makePhoneCall(input: MakePhoneCallInput): Promise<MakePhoneCallOutput> {
  return await makePhoneCallFlow(input);
}
