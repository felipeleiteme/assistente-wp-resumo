import { VercelRequest, VercelResponse } from '@vercel/node';
import { getWeeklyReportById, getPreviousWeekReport, getNextWeekReport } from '../src/services/supabase-weekly.service';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const id = req.query.id as string;

  if (!id) {
    return res.status(400).send('ID do relatório não fornecido');
  }

  const report = await getWeeklyReportById(id);

  // Buscar relatórios adjacentes para navegação
  let previousReport = null;
  let nextReport = null;

  if (report) {
    previousReport = await getPreviousWeekReport(report.week_start);
    nextReport = await getNextWeekReport(report.week_start);
  }

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
  let htmlContent = report.report_content;

  // 0. Limpar blocos de código markdown (```markdown ... ```)
  htmlContent = htmlContent.replace(/```markdown\n?/gi, '');
  htmlContent = htmlContent.replace(/```\n?/g, '');

  // 1. Substituir títulos (h3, h2, h1)
  htmlContent = htmlContent.replace(/^### (.+)$/gim, '<h3>$1</h3>');
  htmlContent = htmlContent.replace(/^## (.+)$/gim, '<h2>$1</h2>');
  htmlContent = htmlContent.replace(/^# (.+)$/gim, '<h1>$1</h1>');

  // 2. Bold (** texto **) - precisa vir antes das listas
  htmlContent = htmlContent.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  // 3. Itálico (* texto *)
  htmlContent = htmlContent.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // 4. Links [texto](url)
  htmlContent = htmlContent.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank">$1</a>');

  // 5. Separadores (---)
  htmlContent = htmlContent.replace(/^---$/gim, '<hr>');

  // 6. Listas não ordenadas (- item ou * item)
  htmlContent = htmlContent.replace(/^[-*] (.+)$/gim, '<li>$1</li>');

  // 7. Listas ordenadas (1. item)
  htmlContent = htmlContent.replace(/^\d+\. (.+)$/gim, '<li>$1</li>');

  // 8. Envolver listas consecutivas em <ul>
  htmlContent = htmlContent.replace(/(<li>.*<\/li>\n?)+/gs, '<ul>$&</ul>');

  // 9. Parágrafos (quebras duplas)
  htmlContent = htmlContent.replace(/\n\n/g, '</p><p>');

  // 10. Quebras simples
  htmlContent = htmlContent.replace(/\n/g, '<br>');

  // 11. Envolver em parágrafos iniciais
  htmlContent = '<p>' + htmlContent + '</p>';

  // 12. Limpar parágrafos vazios
  htmlContent = htmlContent.replace(/<p><\/p>/g, '');
  htmlContent = htmlContent.replace(/<p><br><\/p>/g, '');

  // 13. Títulos não devem estar dentro de <p>
  htmlContent = htmlContent.replace(/<p>(<h[123]>)/g, '$1');
  htmlContent = htmlContent.replace(/(<\/h[123]>)<\/p>/g, '$1');

  // 14. HR não deve estar dentro de <p>
  htmlContent = htmlContent.replace(/<p>(<hr>)/g, '$1');
  htmlContent = htmlContent.replace(/(<hr>)<\/p>/g, '$1');

  // 15. UL não deve estar dentro de <p>
  htmlContent = htmlContent.replace(/<p>(<ul>)/g, '$1');
  htmlContent = htmlContent.replace(/(<\/ul>)<\/p>/g, '$1');

  // 16. Remover <br> dentro de <li>
  htmlContent = htmlContent.replace(/<li>([^<]*)<br>([^<]*)<\/li>/g, '<li>$1 $2</li>');
  htmlContent = htmlContent.replace(/<li>(.+?)<br>/g, '<li>$1 ');

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
        .week-navigation {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 40px;
          background: #f8f9fa;
          border-bottom: 1px solid #dee2e6;
        }
        .nav-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 12px 24px;
          background: #007bff;
          color: white;
          text-decoration: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          transition: all 0.3s ease;
          box-shadow: 0 2px 4px rgba(0,123,255,0.2);
        }
        .nav-btn:hover {
          background: #0056b3;
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(0,123,255,0.3);
        }
        .nav-btn.disabled {
          background: #e9ecef;
          color: #6c757d;
          cursor: not-allowed;
          pointer-events: none;
        }
        .nav-btn .arrow {
          font-size: 18px;
          font-weight: bold;
        }
        .nav-current {
          font-size: 14px;
          color: #6c757d;
          text-align: center;
          flex: 1;
          margin: 0 20px;
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
          padding: 50px;
          line-height: 1.9;
          color: #2c3e50;
          font-size: 16px;
          max-width: 900px;
          margin: 0 auto;
        }
        .content h1 {
          color: #007bff;
          font-size: 32px;
          margin-top: 50px;
          margin-bottom: 25px;
          border-bottom: 3px solid #007bff;
          padding-bottom: 15px;
          font-weight: 700;
          letter-spacing: -0.5px;
        }
        .content h1:first-child {
          margin-top: 0;
        }
        .content h2 {
          color: #2c3e50;
          margin-top: 45px;
          margin-bottom: 20px;
          font-size: 26px;
          border-bottom: none;
          padding-bottom: 0;
          font-weight: 700;
          background: linear-gradient(90deg, #007bff 0%, #0056b3 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          padding-left: 15px;
          border-left: 4px solid #007bff;
        }
        .content h3 {
          color: #495057;
          margin-top: 30px;
          margin-bottom: 15px;
          font-size: 20px;
          font-weight: 600;
        }
        .content p {
          margin-bottom: 18px;
          text-align: justify;
          hyphens: auto;
        }
        .content ul {
          margin: 20px 0;
          padding-left: 0;
        }
        .content li {
          margin-left: 35px;
          margin-bottom: 14px;
          line-height: 1.8;
          list-style-type: none;
          position: relative;
          padding-left: 10px;
        }
        .content li:before {
          content: "▸";
          position: absolute;
          left: -25px;
          color: #007bff;
          font-size: 18px;
          font-weight: bold;
        }
        .content strong {
          color: #0056b3;
          font-weight: 700;
          background: rgba(0, 123, 255, 0.05);
          padding: 2px 6px;
          border-radius: 3px;
        }
        .content em {
          font-style: italic;
          color: #6c757d;
          background: #f8f9fa;
          padding: 1px 4px;
          border-radius: 2px;
        }
        .content hr {
          border: none;
          height: 3px;
          background: linear-gradient(90deg, #007bff 0%, transparent 100%);
          margin: 40px 0;
        }
        .content a {
          color: #007bff;
          text-decoration: none;
          border-bottom: 2px solid #007bff;
          padding-bottom: 1px;
          transition: all 0.3s ease;
        }
        .content a:hover {
          background: #007bff;
          color: white;
          padding: 2px 6px;
          border-radius: 3px;
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
          .week-navigation {
            padding: 15px;
            flex-direction: column;
            gap: 15px;
          }
          .nav-btn {
            width: 100%;
            justify-content: center;
          }
          .nav-current {
            margin: 10px 0;
            order: -1;
          }
          .stats-bar {
            grid-template-columns: 1fr;
            padding: 20px;
          }
          .content {
            padding: 30px 20px;
            font-size: 15px;
            line-height: 1.8;
          }
          .content h1 {
            font-size: 26px;
            margin-top: 35px;
          }
          .content h2 {
            font-size: 22px;
            margin-top: 30px;
            padding-left: 12px;
          }
          .content h3 {
            font-size: 18px;
          }
          .content p {
            text-align: left;
          }
          .content ul {
            padding: 15px;
          }
          .content li {
            margin-left: 25px;
            font-size: 14px;
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

        <div class="week-navigation">
          ${previousReport
            ? `<a href="/api/relatorio-semanal?id=${previousReport.id}" class="nav-btn">
                 <span class="arrow">←</span>
                 <span>Semana Anterior<br><small>${new Date(previousReport.week_start).toLocaleDateString('pt-BR')} - ${new Date(previousReport.week_end).toLocaleDateString('pt-BR')}</small></span>
               </a>`
            : `<span class="nav-btn disabled">
                 <span class="arrow">←</span>
                 <span>Primeira Semana</span>
               </span>`
          }
          <div class="nav-current">
            <strong>Semana Atual</strong><br>
            <small>${new Date(report.week_start).toLocaleDateString('pt-BR')} - ${new Date(report.week_end).toLocaleDateString('pt-BR')}</small>
          </div>
          ${nextReport
            ? `<a href="/api/relatorio-semanal?id=${nextReport.id}" class="nav-btn">
                 <span>Próxima Semana<br><small>${new Date(nextReport.week_start).toLocaleDateString('pt-BR')} - ${new Date(nextReport.week_end).toLocaleDateString('pt-BR')}</small></span>
                 <span class="arrow">→</span>
               </a>`
            : `<span class="nav-btn disabled">
                 <span>Última Semana</span>
                 <span class="arrow">→</span>
               </span>`
          }
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
