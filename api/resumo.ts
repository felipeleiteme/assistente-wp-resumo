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

  // Buscar nome do grupo
  let groupName = summary.group_id;
  const { data: messageData } = await supabase
    .from('messages')
    .select('group_name')
    .eq('group_id', summary.group_id)
    .not('group_name', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (messageData?.group_name) {
    groupName = messageData.group_name;
  }

  // Converter Markdown para HTML
  let htmlContent = summary.summary_content;

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
            <span class="badge">👥 ${groupName}</span>
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
