import { getWeeklyStats, generateWeeklyInsights } from '../services/weekly-analysis.service';
import { saveWeeklyReport } from '../services/supabase-weekly.service';

export async function handleWeeklyReport(): Promise<{ reportId: string; reportUrl: string }> {
  console.log('Iniciando geração de relatório semanal...');

  try {
    // 1. Coletar estatísticas da semana
    console.log('Coletando estatísticas...');
    const stats = await getWeeklyStats();

    if (stats.totalMessages === 0) {
      console.log('Nenhuma mensagem na última semana. Pulando relatório.');
      throw new Error('Sem dados para gerar relatório');
    }

    console.log(`Estatísticas coletadas: ${stats.totalMessages} mensagens de ${stats.totalGroups} grupos`);

    // 2. Gerar insights com IA
    console.log('Gerando insights com IA...');
    const insights = await generateWeeklyInsights(stats);
    console.log('Insights gerados com sucesso');

    // 3. Salvar no banco
    console.log('Salvando relatório no banco...');
    const report = await saveWeeklyReport({
      content: insights,
      weekStart: stats.weekStart,
      weekEnd: stats.weekEnd,
      totalMessages: stats.totalMessages,
      totalGroups: stats.totalGroups,
      stats: stats,
    });

    const reportUrl = `${process.env.VERCEL_URL || 'https://assistente-wp-resumo.vercel.app'}/api/relatorio-semanal?id=${report.id}`;
    console.log(`Relatório salvo: ${reportUrl}`);

    // 4. Enviar notificações
    console.log('Enviando notificações...');
    await sendWeeklyReportNotification(insights, reportUrl, stats);

    return {
      reportId: report.id,
      reportUrl,
    };
  } catch (error) {
    console.error('Erro ao gerar relatório semanal:', error);
    throw error;
  }
}

async function sendWeeklyReportNotification(
  insights: string,
  reportUrl: string,
  stats: any
): Promise<void> {
  const webhookUrl = process.env.TEAMS_WEBHOOK_URL;

  if (!webhookUrl) {
    console.warn('TEAMS_WEBHOOK_URL não configurado. Notificação não enviada.');
    return;
  }

  // Extrair resumo executivo (primeiros 500 caracteres)
  const summary = insights.substring(0, 500) + '...';

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      '@type': 'MessageCard',
      '@context': 'https://schema.org/extensions',
      themeColor: '007bff',
      summary: `Relatório Semanal - ${stats.weekStart} a ${stats.weekEnd}`,
      sections: [
        {
          activityTitle: '📊 Relatório Semanal de Análise',
          activitySubtitle: `${stats.weekStart} a ${stats.weekEnd}`,
          activityImage: 'https://img.icons8.com/color/96/000000/business-report.png',
          facts: [
            {
              name: '💬 Total de Mensagens:',
              value: stats.totalMessages.toString(),
            },
            {
              name: '👥 Grupos Ativos:',
              value: stats.totalGroups.toString(),
            },
            {
              name: '📈 Média por Dia:',
              value: stats.avgMessagesPerDay.toString(),
            },
            {
              name: '📊 Média por Grupo:',
              value: stats.avgMessagesPerGroup.toString(),
            },
          ],
          text: summary,
        },
      ],
      potentialAction: [
        {
          '@type': 'OpenUri',
          name: '📄 Ver Relatório Completo',
          targets: [{ os: 'default', uri: reportUrl }],
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Erro ao enviar para Teams: ${response.statusText}`);
  }

  console.log('Notificação enviada ao Teams com sucesso');
}
