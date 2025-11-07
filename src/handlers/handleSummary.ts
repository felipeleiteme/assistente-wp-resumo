import { getDailyMessages, getDistinctGroupIdsToday, saveSummary, cleanupOldMessages } from '../services/supabase.service';
import { getSummary } from '../services/qwen.service';
import { sendSummaryLink } from '../services/zapi.service';

export async function handleSummary(): Promise<void> {
  // CAMUFLAGEM: Atraso aleatório (como antes)
  const randomDelay = Math.floor(Math.random() * (600000 - 60000 + 1)) + 60000;
  console.log(`[CAMUFLAGEM] Aguardando ${randomDelay / 1000 / 60} minutos antes de iniciar...`);
  await new Promise(resolve => setTimeout(resolve, randomDelay));

  console.log('Iniciando processo de resumo multi-grupo...');

  // 1. Buscar grupos ativos (como antes)
  const groupIds = await getDistinctGroupIdsToday();
  if (groupIds.length === 0) {
    console.log('Nenhum grupo ativo hoje.');
    // (Pula a limpeza se não houver grupos, pois a limpeza só roda após o processamento)
    return;
  }

  console.log(`Encontrados ${groupIds.length} grupos ativos. Iniciando loop...`);

  // 2. Iterar sobre cada grupo (como antes)
  for (const groupId of groupIds) {
    try {
      console.log(`Processando grupo: ${groupId}`);
      const messages = await getDailyMessages(groupId);
      if (messages.length === 0) {
        console.log(`Grupo ${groupId} sem novas mensagens.`);
        continue;
      }

      const transcript = messages
        .map(msg => `[${msg.timestamp}] ${msg.from}: ${msg.text}`)
        .join('\n');
      const summary = await getSummary(transcript);

      const summaryRecord = await saveSummary({
        content: summary.full, // O resumo analítico completo é salvo
        date: new Date().toISOString().split('T')[0],
        message_count: messages.length,
      }, groupId);

      const summaryUrl = `${process.env.VERCEL_URL || 'https://seu-dominio.vercel.app'}/resumo/${summaryRecord.id}`;

      // 6. ENVIAR NOTIFICAÇÕES (LÓGICA V1.7)
      await Promise.all([
        // MS Teams (Mensagem CURTA)
        sendToTeams(summary.short, summaryUrl, groupId),

        // Resend (Mensagem LONGA, BEM FORMATADA)
        sendToResend(summary.full, summaryUrl, groupId),

        // WhatsApp (Mensagem CURTA)
        sendSummaryLink(summary.short, summaryUrl, groupId),
      ]);

      console.log(`Grupo ${groupId} processado com sucesso.`);

    } catch (error) {
      console.error(`Falha ao processar grupo ${groupId}:`, error);
    }
  }

  console.log('Processo de resumo multi-grupo finalizado.');

  // Limpeza de mensagens antigas (> 7 dias)
  console.log('Iniciando limpeza de mensagens antigas (> 7 dias)...');
  try {
    await cleanupOldMessages();
    console.log('Limpeza de mensagens concluída.');
  } catch (error) {
    console.error('Falha ao limpar mensagens antigas:', error);
  }
}

// ATUALIZADO (V1.7): Recebe 'message' (curta) em vez de 'fullSummary'
async function sendToTeams(message: string, url: string, groupId: string): Promise<void> {
  const webhookUrl = process.env.TEAMS_WEBHOOK_URL;
  if (!webhookUrl) {
    console.warn('TEAMS_WEBHOOK_URL não configurado.');
    return;
  }

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      '@type': 'MessageCard',
      '@context': 'https://schema.org/extensions',
      summary: `Notificação - Grupo ${groupId}`,
      sections: [{
        activityTitle: `Notificação - Grupo ${groupId}`,
        activitySubtitle: new Date().toLocaleDateString('pt-BR'),
        text: message, // <-- MUDANÇA: Usa a mensagem curta
      }],
      potentialAction: [{
        '@type': 'OpenUri',
        name: 'Ver Resumo Completo', // O link ainda aponta para o resumo completo
        targets: [{ os: 'default', uri: url }],
      }],
    }),
  });

  if (!response.ok) {
    throw new Error(`Erro ao enviar para Teams: ${response.statusText}`);
  }
}

// ATUALIZADO (V1.7): Formatação HTML "BEM FORMATADO"
async function sendToResend(fullSummary: string, url: string, groupId: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const toEmail = process.env.RESEND_TO_EMAIL;
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@seu-dominio.com';

  if (!apiKey || !toEmail) {
    console.warn('RESEND_API_KEY ou RESEND_TO_EMAIL não configurado.');
    return;
  }

  // Converte o Markdown do Qwen (##, *, \n) em HTML
  const formattedHtml = fullSummary
    .replace(/^## (.*$)/gm, '<h2>$1</h2>')
    .replace(/^\* (.*$)/gm, '<li>$1</li>')
    .replace(/\n/g, '<br/>');

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from: fromEmail,
      to: toEmail,
      subject: `Análise Diária [${groupId}] - ${new Date().toLocaleDateString('pt-BR')}`,
      html: `
        <h1>Análise Diária - Grupo ${groupId}</h1>
        ${formattedHtml}
        <br/>
        <p><a href="${url}">Ver Resumo na Plataforma</a></p>
      `,
    }),
  });

  if (!response.ok) {
    throw new Error(`Erro ao enviar email: ${response.statusText}`);
  }
}
