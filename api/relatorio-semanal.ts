import { VercelRequest, VercelResponse } from '@vercel/node';
import { getWeeklyReportById } from '../src/services/supabase-weekly.service';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const id = req.query.id as string;

  if (!id) {
    return res.status(400).send('ID do relatório não fornecido');
  }

  const report = await getWeeklyReportById(id);

  if (!report) {
    return res.status(404).send(`
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Relatório não encontrado</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            max-width: 800px;
            margin: 50px auto;
            padding: 20px;
            background: #f8f9fa;
          }
          .error {
            background: white;
            padding: 40px;
            border-radius: 10px;
            text-align: center;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          }
          h1 { color: #e74c3c; }
        </style>
      </head>
      <body>
        <div class="error">
          <h1>❌ Relatório não encontrado</h1>
          <p>O relatório solicitado não existe ou foi removido.</p>
        </div>
      </body>
      </html>
    `);
  }

  // Converter Markdown para HTML
  const htmlContent = report.report_content
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    .replace(/^\*\* (.*?):/gim, '<strong>$1:</strong>')
    .replace(/^\* (.*$)/gim, '<li>$1</li>')
    .replace(/^- (.*$)/gim, '<li>$1</li>')
    .replace(/^(\d+)\. (.*$)/gim, '<li>$2</li>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>');

  return res.status(200).send(`
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Relatório Semanal - ${report.week_start} a ${report.week_end}</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
          background: #f8f9fa;
          min-height: 100vh;
          padding: 20px;
        }
        .container {
          max-width: 1100px;
          margin: 0 auto;
          background: white;
          border-radius: 10px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.1);
          overflow: hidden;
          border: 1px solid #dee2e6;
        }
        .header {
          background: #007bff;
          color: white;
          padding: 40px;
          text-align: center;
        }
        .header h1 {
          font-size: 32px;
          margin-bottom: 15px;
        }
        .header .meta {
          opacity: 0.9;
          font-size: 16px;
        }
        .stats-bar {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
          padding: 30px 40px;
          background: #f8f9fa;
          border-bottom: 1px solid #dee2e6;
        }
        .stat-card {
          text-align: center;
          padding: 20px;
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        }
        .stat-value {
          font-size: 32px;
          font-weight: bold;
          color: #007bff;
          margin-bottom: 8px;
        }
        .stat-label {
          font-size: 14px;
          color: #6c757d;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .content {
          padding: 40px;
          line-height: 1.8;
          color: #333;
        }
        .content h1 {
          color: #007bff;
          font-size: 28px;
          margin-top: 40px;
          margin-bottom: 20px;
          border-bottom: 3px solid #007bff;
          padding-bottom: 10px;
        }
        .content h1:first-child {
          margin-top: 0;
        }
        .content h2 {
          color: #343a40;
          margin-top: 30px;
          margin-bottom: 15px;
          font-size: 24px;
          border-bottom: 2px solid #007bff;
          padding-bottom: 10px;
        }
        .content h3 {
          color: #495057;
          margin-top: 25px;
          margin-bottom: 12px;
          font-size: 20px;
        }
        .content p {
          margin-bottom: 15px;
        }
        .content li {
          margin-left: 25px;
          margin-bottom: 10px;
          line-height: 1.6;
        }
        .content strong {
          color: #007bff;
        }
        .footer {
          background: #f8f9fa;
          padding: 20px 40px;
          text-align: center;
          font-size: 13px;
          color: #6c757d;
          border-top: 1px solid #dee2e6;
        }
        .badge {
          display: inline-block;
          background: rgba(255,255,255,0.2);
          padding: 8px 20px;
          border-radius: 25px;
          margin: 5px;
          font-size: 14px;
          font-weight: 500;
        }
        @media (max-width: 600px) {
          body {
            padding: 0;
            background: white;
          }
          .container {
            border-radius: 0;
            box-shadow: none;
            border: none;
          }
          .header {
            padding: 30px 20px;
          }
          .header h1 {
            font-size: 24px;
          }
          .stats-bar {
            grid-template-columns: 1fr;
            padding: 20px;
          }
          .content {
            padding: 20px;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📊 Relatório Semanal de Análise</h1>
          <div class="meta">
            <span class="badge">📅 ${new Date(report.week_start).toLocaleDateString('pt-BR')} - ${new Date(report.week_end).toLocaleDateString('pt-BR')}</span>
          </div>
        </div>

        <div class="stats-bar">
          <div class="stat-card">
            <div class="stat-value">${report.total_messages}</div>
            <div class="stat-label">💬 Mensagens</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${report.total_groups}</div>
            <div class="stat-label">👥 Grupos Ativos</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${report.stats_data?.avgMessagesPerDay || 0}</div>
            <div class="stat-label">📈 Média/Dia</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${report.stats_data?.avgMessagesPerGroup || 0}</div>
            <div class="stat-label">📊 Média/Grupo</div>
          </div>
        </div>

        <div class="content">
          ${htmlContent}
        </div>

        <div class="footer">
          🤖 Relatório gerado automaticamente com IA |
          Gerado em ${new Date(report.created_at).toLocaleString('pt-BR')}
        </div>
      </div>
    </body>
    </html>
  `);
}
