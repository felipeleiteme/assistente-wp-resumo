import { VercelRequest, VercelResponse } from '@vercel/node';
import { handleSummary } from '../../src/handlers/handleSummary';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Validar que a requisição vem do Vercel Cron
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    await handleSummary();
    return res.status(200).json({ success: true, message: 'Summary generated' });
  } catch (error) {
    console.error('Summary handler error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
