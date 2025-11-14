import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Extrair ID da query string ou do path
  const id = req.query.id as string || req.url?.split('/resumo/')[1]?.split('?')[0];

  if (!id) {
    return res.status(400).send('ID do resumo não fornecido');
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).send('Configuração do banco de dados não encontrada');
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Buscar resumo pelo ID
  const { data: summary, error } = await supabase
    .from('daily_summaries')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !summary) {
    return res.status(404).send(`
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Resumo não encontrado</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            max-width: 800px;
            margin: 50px auto;
            padding: 20px;
            background: #f8f9fa; /* FUNDO CINZA CLARO */
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
          <h1>❌ Resumo não encontrado</h1>
          <p>O resumo solicitado não existe ou foi removido.</p>
          <p><small>ID: ${id}</small></p>
        </div>
      </body>
      </html>
    `);
  }

  // Converter Markdown para HTML básico
  const htmlContent = summary.summary_content
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^\* (.*$)/gim, '<li>$1</li>')
    .replace(/^- (.*$)/gim, '<li>$1</li>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>');

  // Renderizar página HTML
  return res.status(200).send(`
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Resumo Diário - ${summary.summary_date}</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
          background: #f8f9fa; /* FUNDO CINZA CLARO */
          min-height: 100vh;
          padding: 20px;
        }
        .container {
          max-width: 900px;
          margin: 0 auto;
          background: white;
          border-radius: 10px; /* Borda levemente arredondada */
          box-shadow: 0 10px 30px rgba(0,0,0,0.1); /* Sombra corporativa */
          overflow: hidden;
          border: 1px solid #dee2e6; /* Borda cinza claro */
        }
        .header {
          background: #007bff; /* AZUL PRIMÁRIO SÓLIDO */
          color: white;
          padding: 30px;
          text-align: center;
        }
        .header h1 {
          font-size: 28px;
          margin-bottom: 10px;
        }
        .header .meta {
          opacity: 0.9;
          font-size: 14px;
        }
        .content {
          padding: 40px;
          line-height: 1.8;
          color: #333;
        }
        .content h2 {
          color: #343a40; /* TEXTO ESCURO (QUASE PRETO) */
          margin-top: 30px;
          margin-bottom: 15px;
          font-size: 22px;
          border-bottom: 2px solid #007bff; /* BORDA AZUL PRIMÁRIO */
          padding-bottom: 10px;
        }
        .content h2:first-child {
          margin-top: 0;
        }
        .content p {
          margin-bottom: 15px;
        }
        .content li {
          margin-left: 25px;
          margin-bottom: 8px;
        }
        .footer {
          background: #f8f9fa;
          padding: 20px 40px;
          text-align: center;
          font-size: 13px;
          color: #6c757d; /* CINZA SECUNDÁRIO */
          border-top: 1px solid #dee2e6;
        }
        .badge {
          display: inline-block;
          background: rgba(255,255,255,0.2); /* BRANCO SEMI-TRANSPARENTE */
          padding: 5px 15px;
          border-radius: 20px;
          margin: 5px;
          font-size: 13px;
          font-weight: 500;
        }
        @media (max-width: 600px) {
          body {
            padding: 0;
            background: white; /* Fundo branco em mobile */
          }
          .container {
            border-radius: 0;
            box-shadow: none;
            border: none;
          }
          .header, .content, .footer {
            padding: 20px;
          }
          .header h1 {
            font-size: 22px;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📊 Resumo Diário - WhatsApp</h1>
          <div class="meta">
            <span class="badge">📅 ${new Date(summary.summary_date).toLocaleDateString('pt-BR', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}</span>
            <span class="badge">💬 ${summary.message_count} mensagens</span>
            <span class="badge">👥 ${summary.group_id}</span>
          </div>
        </div>
        <div class="content">
          ${htmlContent}
          </div>
        <div class="footer">
          🤖 Resumo gerado automaticamente com IA |
          Gerado em ${new Date(summary.created_at).toLocaleString('pt-BR')}
        </div>
      </div>
    </body>
    </html>
  `);
}
