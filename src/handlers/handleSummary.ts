import { getDailyMessages, getDistinctGroupIdsToday, getGroupName, saveSummary, cleanupOldMessages } from '../services/supabase.service';
import { getSummary } from '../services/qwen.service';

export async function handleSummary(): Promise<void> {
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

      // Buscar nome do grupo
      const groupName = await getGroupName(groupId);
      console.log(`Nome do grupo: ${groupName}`);

      const messages = await getDailyMessages(groupId);
      if (messages.length === 0) {
        console.log(`Grupo ${groupName} sem novas mensagens.`);
        continue;
      }

      const transcript = messages
        .map(msg => `[${msg.timestamp}] ${msg.from}: ${msg.text}`)
        .join('\n');

      console.log(`Gerando resumo para ${messages.length} mensagens...`);
      const summary = await getSummary(transcript);
      console.log(`Resumo gerado. Short: ${summary.short.substring(0, 50)}...`);

      const summaryRecord = await saveSummary({
        content: summary.full,
        date: new Date().toISOString().split('T')[0],
        message_count: messages.length,
      }, groupId);

      const summaryUrl = `${process.env.VERCEL_URL || 'https://assistente-wp-resumo.vercel.app'}/api/resumo?id=${summaryRecord.id}`;
      console.log(`Resumo salvo. URL: ${summaryUrl}`);

      // 6. ENVIAR NOTIFICAÇÃO PARA MS TEAMS
      console.log('Enviando notificação para MS Teams...');
      await sendToTeams(summary.short, summaryUrl, groupName)
        .then(() => console.log('Teams: OK'))
        .catch(e => console.error('Teams: ERRO', e.message));

      console.log(`Grupo ${groupName} processado com sucesso.`);

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

async function sendToTeams(message: string, url: string, groupName: string): Promise<void> {
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
      summary: `📱 ${groupName}`,
      sections: [{
        activityTitle: `📱 ${groupName}`,
        activitySubtitle: new Date().toLocaleDateString('pt-BR'),
        text: message,
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
