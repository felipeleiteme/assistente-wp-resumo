import { VercelRequest, VercelResponse } from '@vercel/node';
import { handleWebhook } from '../../src/handlers/handleWebhook';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await handleWebhook(req);
    return res.status(200).json({ success: true, message: 'Webhook received' });
  } catch (error) {
    console.error('Webhook handler error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error details:', errorMessage);
    return res.status(500).json({
      error: 'Internal server error',
      details: errorMessage
    });
  }
}
