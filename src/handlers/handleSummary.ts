import { getDailyMessages, getDistinctGroupIdsToday, saveSummary, cleanupOldMessages } from '../services/supabase.service';
import { getSummary } from '../services/qwen.service';
import { sendSummaryLink } from '../services/zapi.service';

export async function handleSummary(): Promise<void> {
  // CAMUFLAGEM: Atraso aleatório de 1 a 10 minutos (60000ms a 600000ms)
  const randomDelay = Math.floor(Math.random() * (600000 - 60000 + 1)) + 60000;
  console.log(`[CAMUFLAGEM] Aguardando ${randomDelay / 1000 / 60} minutos antes de iniciar...`);
  await new Promise(resolve => setTimeout(resolve, randomDelay));

  console.log('Iniciando processo de resumo multi-grupo...');

  // 1. Buscar grupos ativos
  const groupIds = await getDistinctGroupIdsToday();
  if (groupIds.length === 0) {
    console.log('Nenhum grupo ativo hoje.');
    return;
  }

  console.log(`Encontrados ${groupIds.length} grupos ativos. Iniciando loop...`);

  // 2. Iterar sobre cada grupo
  for (const groupId of groupIds) {
    try {
      console.log(`Processando grupo: ${groupId}`);

      // 3. Buscar mensagens (filtradas por grupo)
      const messages = await getDailyMessages(groupId);
      if (messages.length === 0) {
        console.log(`Grupo ${groupId} sem novas mensagens.`);
        continue;
      }

      // 4. Gerar resumo
      const transcript = messages
        .map(msg => `[${msg.timestamp}] ${msg.from}: ${msg.text}`)
        .join('\n');
      const summary = await getSummary(transcript);

      // 5. Salvar resumo (com group_id)
      const summaryRecord = await saveSummary({
        content: summary.full,
        date: new Date().toISOString().split('T')[0],
        message_count: messages.length,
      }, groupId);

      const summaryUrl = `${process.env.VERCEL_URL || 'https://seu-dominio.vercel.app'}/resumo/${summaryRecord.id}`;

      // 6. Enviar notificações (com group_id)
      await Promise.all([
        sendToTeams(summary.full, summaryUrl, groupId),
        sendToResend(summary.full, summaryUrl, groupId),
        sendSummaryLink(summary.short, summaryUrl, groupId),
      ]);

      console.log(`Grupo ${groupId} processado com sucesso.`);

    } catch (error) {
      console.error(`Falha ao processar grupo ${groupId}:`, error);
      // Continua para o próximo grupo
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

async function sendToTeams(fullSummary: string, url: string, groupId: string): Promise<void> {
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
      summary: `Resumo Diário - Grupo ${groupId}`,
      sections: [{
        activityTitle: `Resumo Diário Gerado - Grupo ${groupId}`,
        activitySubtitle: new Date().toLocaleDateString('pt-BR'),
        text: fullSummary,
      }],
      potentialAction: [{
        '@type': 'OpenUri',
        name: 'Ver Resumo Completo',
        targets: [{ os: 'default', uri: url }],
      }],
    }),
  });

  if (!response.ok) {
    throw new Error(`Erro ao enviar para Teams: ${response.statusText}`);
  }
}

async function sendToResend(fullSummary: string, url: string, groupId: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const toEmail = process.env.RESEND_TO_EMAIL;
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@seu-dominio.com';

  if (!apiKey || !toEmail) {
    console.warn('RESEND_API_KEY ou RESEND_TO_EMAIL não configurado.');
    return;
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from: fromEmail,
      to: toEmail,
      subject: `Resumo Diário [${groupId}] - ${new Date().toLocaleDateString('pt-BR')}`,
      html: `
        <h2>Resumo Diário Gerado - Grupo ${groupId}</h2>
        <p>${fullSummary.replace(/\n/g, '<br>')}</p>
        <p><a href="${url}">Ver Resumo Completo</a></p>
      `,
    }),
  });

  if (!response.ok) {
    throw new Error(`Erro ao enviar email: ${response.statusText}`);
  }
}
