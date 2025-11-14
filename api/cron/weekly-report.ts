import { VercelRequest, VercelResponse } from '@vercel/node';
import { handleWeeklyReport } from '../../src/handlers/handleWeeklyReport';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Validar que a requisição vem do Vercel Cron ou GitHub Actions
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const result = await handleWeeklyReport();
    return res.status(200).json({
      success: true,
      message: 'Weekly report generated',
      reportId: result.reportId,
      reportUrl: result.reportUrl,
    });
  } catch (error) {
    console.error('Weekly report handler error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
