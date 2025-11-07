import { getDailyMessages, saveSummary } from '../services/supabase.service';
import { getSummary } from '../services/qwen.service';
import { sendSummaryLink } from '../services/zapi.service';

export async function handleSummary(): Promise<void> {
  // CAMUFLAGEM: Atraso aleatório de 1 a 10 minutos (60000ms a 600000ms)
  const randomDelay = Math.floor(Math.random() * (600000 - 60000 + 1)) + 60000;
  console.log(`[CAMUFLAGEM] Aguardando ${randomDelay / 1000 / 60} minutos antes de iniciar...`);
  await new Promise(resolve => setTimeout(resolve, randomDelay));

  // 1. Buscar mensagens do dia
  const messages = await getDailyMessages();

  if (messages.length === 0) {
    console.log('Nenhuma mensagem para resumir hoje.');
    return;
  }

  // Concatenar mensagens em um transcript
  const transcript = messages
    .map(msg => `[${msg.timestamp}] ${msg.from}: ${msg.text}`)
    .join('\n');

  // 2. Gerar resumo com Qwen
  const summary = await getSummary(transcript);

  // 3. Salvar resumo no Supabase
  const summaryRecord = await saveSummary({
    content: summary.full,
    date: new Date().toISOString().split('T')[0],
    message_count: messages.length,
  });

  // Link público para o resumo
  const summaryUrl = `${process.env.VERCEL_URL || 'https://seu-dominio.vercel.app'}/resumo/${summaryRecord.id}`;

  // 4. Enviar para os 3 canais em paralelo
  await Promise.all([
    // MS Teams (resumo completo)
    sendToTeams(summary.full, summaryUrl),

    // Resend (resumo completo)
    sendToResend(summary.full, summaryUrl),

    // WhatsApp (mensagem curta + link)
    sendSummaryLink(summary.short, summaryUrl),
  ]);

  console.log('Resumo enviado com sucesso para todos os canais.');
}

async function sendToTeams(fullSummary: string, url: string): Promise<void> {
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
      summary: 'Resumo Diário - Repórter Clandestino',
      sections: [{
        activityTitle: 'Resumo Diário Gerado',
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

async function sendToResend(fullSummary: string, url: string): Promise<void> {
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
      subject: `Resumo Diário - ${new Date().toLocaleDateString('pt-BR')}`,
      html: `
        <h2>Resumo Diário Gerado</h2>
        <p>${fullSummary.replace(/\n/g, '<br>')}</p>
        <p><a href="${url}">Ver Resumo Completo</a></p>
      `,
    }),
  });

  if (!response.ok) {
    throw new Error(`Erro ao enviar email: ${response.statusText}`);
  }
}
