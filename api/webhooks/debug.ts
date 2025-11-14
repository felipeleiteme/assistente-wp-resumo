import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log('=== DEBUG WEBHOOK ===');
  console.log('Method:', req.method);
  console.log('Headers:', JSON.stringify(req.headers, null, 2));
  console.log('Body:', JSON.stringify(req.body, null, 2));
  console.log('Query:', JSON.stringify(req.query, null, 2));
  console.log('===================');

  return res.status(200).json({
    success: true,
    message: 'Debug webhook received',
    received: {
      method: req.method,
      headers: req.headers,
      body: req.body,
      query: req.query,
    }
  });
}
