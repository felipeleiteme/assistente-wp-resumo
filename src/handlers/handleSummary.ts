import { getDailyMessages, getDistinctGroupIdsToday, getGroupName, saveSummary, cleanupOldMessages } from '../services/supabase.service';
import { getSummary } from '../services/qwen.service';

export async function handleSummary(): Promise<void> {
  const now = new Date().toISOString();
  console.log(`[${now}] Iniciando processo de resumo multi-grupo...`);
  console.log('[DEBUG] TEAMS_WEBHOOK_URL configurado:', !!process.env.TEAMS_WEBHOOK_URL);

  // 1. Buscar grupos ativos (como antes)
  console.log('[DEBUG] Buscando grupos ativos de hoje...');
  const groupIds = await getDistinctGroupIdsToday();
  console.log(`[DEBUG] Grupos encontrados: ${groupIds.length}`, groupIds);

  if (groupIds.length === 0) {
    console.log('[WARN] Nenhum grupo ativo hoje - nenhum resumo será gerado.');
    // (Pula a limpeza se não houver grupos, pois a limpeza só roda após o processamento)
    return;
  }

  console.log(`[INFO] Encontrados ${groupIds.length} grupos ativos. Iniciando loop...`);

  // 2. Iterar sobre cada grupo (como antes)
  for (const groupId of groupIds) {
    try {
      console.log(`[DEBUG] Processando grupo: ${groupId}`);

      // Buscar nome do grupo
      const groupName = await getGroupName(groupId);
      console.log(`[DEBUG] Nome do grupo: ${groupName}`);

      const messages = await getDailyMessages(groupId);
      console.log(`[DEBUG] Mensagens encontradas para ${groupName}: ${messages.length}`);

      if (messages.length === 0) {
        console.log(`[WARN] Grupo ${groupName} sem novas mensagens - pulando.`);
        continue;
      }

      const transcript = messages
        .map(msg => `[${msg.timestamp}] ${msg.from}: ${msg.text}`)
        .join('\n');

      console.log(`[INFO] Gerando resumo para ${messages.length} mensagens...`);
      const summary = await getSummary(transcript);
      console.log(`[INFO] Resumo gerado. Short: ${summary.short.substring(0, 50)}...`);

      const summaryRecord = await saveSummary({
        content: summary.full,
        date: new Date().toISOString().split('T')[0],
        message_count: messages.length,
      }, groupId);

      const baseUrl = process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : 'https://assistente-wp-resumo.vercel.app';
      const summaryUrl = `${baseUrl}/api/resumo?id=${summaryRecord.id}`;
      console.log(`[INFO] Resumo salvo. URL: ${summaryUrl}`);

      // 6. ENVIAR NOTIFICAÇÃO PARA MS TEAMS
      console.log('[DEBUG] Preparando envio para MS Teams...');
      await sendToTeams(summary.short, summaryUrl, groupName)
        .then(() => console.log('[SUCCESS] Teams: Notificação enviada com sucesso!'))
        .catch(e => console.error('[ERROR] Teams: Falha ao enviar:', e.message));

      console.log(`[SUCCESS] Grupo ${groupName} processado com sucesso.`);

    } catch (error) {
      console.error(`[ERROR] Falha ao processar grupo ${groupId}:`, error);
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

  const payload = {
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
  };

  console.log('[DEBUG] Teams payload:', JSON.stringify(payload, null, 2));
  console.log('[DEBUG] Summary URL:', url);

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Erro ao enviar para Teams: ${response.statusText}`);
  }
}
