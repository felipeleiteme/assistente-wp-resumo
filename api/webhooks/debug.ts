import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const zapiSecret = req.headers['x-zapi-secret'];
  const envSecret = process.env.ZAPI_SECRET;

  console.log('=== DEBUG WEBHOOK ===');
  console.log('Method:', req.method);
  console.log('Z-API Secret (header):', zapiSecret);
  console.log('Z-API Secret (env):', envSecret);
  console.log('Secrets match?', zapiSecret === envSecret);
  console.log('Body preview:', JSON.stringify(req.body, null, 2).substring(0, 500));
  console.log('===================');

  return res.status(200).json({
    success: true,
    message: 'Debug webhook received',
    debug: {
      secretFromZapi: zapiSecret,
      secretFromEnv: envSecret,
      secretsMatch: zapiSecret === envSecret,
      bodyPreview: req.body,
    }
  });
}
