import { createClient } from '@supabase/supabase-js';

interface WeeklyStats {
  totalMessages: number;
  totalGroups: number;
  messagesByDay: { date: string; count: number }[];
  messagesByGroup: { groupId: string; count: number }[];
  topParticipants: { phone: string; count: number }[];
  peakHours: { hour: number; count: number }[];
  avgMessagesPerDay: number;
  avgMessagesPerGroup: number;
  weekStart: string;
  weekEnd: string;
}

export async function getWeeklyStats(): Promise<WeeklyStats> {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase não configurado');
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Calcular período (últimos 7 dias)
  const weekEnd = new Date();
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 7);

  // 1. Total de mensagens
  const { count: totalMessages } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .gte('received_at', weekStart.toISOString())
    .lte('received_at', weekEnd.toISOString());

  // 2. Buscar todas as mensagens do período
  const { data: messages } = await supabase
    .from('messages')
    .select('*')
    .gte('received_at', weekStart.toISOString())
    .lte('received_at', weekEnd.toISOString())
    .order('received_at', { ascending: true });

  if (!messages) {
    throw new Error('Erro ao buscar mensagens');
  }

  // 3. Análise por dia
  const messagesByDayMap = new Map<string, number>();
  messages.forEach(msg => {
    const date = new Date(msg.received_at).toISOString().split('T')[0];
    messagesByDayMap.set(date, (messagesByDayMap.get(date) || 0) + 1);
  });

  const messagesByDay = Array.from(messagesByDayMap.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // 4. Análise por grupo
  const messagesByGroupMap = new Map<string, number>();
  messages.forEach(msg => {
    if (msg.group_id) {
      messagesByGroupMap.set(msg.group_id, (messagesByGroupMap.get(msg.group_id) || 0) + 1);
    }
  });

  const messagesByGroup = Array.from(messagesByGroupMap.entries())
    .map(([groupId, count]) => ({ groupId, count }))
    .sort((a, b) => b.count - a.count);

  // 5. Top participantes
  const participantsMap = new Map<string, number>();
  messages.forEach(msg => {
    if (msg.from_number) {
      participantsMap.set(msg.from_number, (participantsMap.get(msg.from_number) || 0) + 1);
    }
  });

  const topParticipants = Array.from(participantsMap.entries())
    .map(([phone, count]) => ({ phone, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // 6. Horários de pico
  const hourMap = new Map<number, number>();
  messages.forEach(msg => {
    const hour = new Date(msg.received_at).getHours();
    hourMap.set(hour, (hourMap.get(hour) || 0) + 1);
  });

  const peakHours = Array.from(hourMap.entries())
    .map(([hour, count]) => ({ hour, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    totalMessages: totalMessages || 0,
    totalGroups: messagesByGroupMap.size,
    messagesByDay,
    messagesByGroup,
    topParticipants,
    peakHours,
    avgMessagesPerDay: messagesByDay.length > 0
      ? Math.round((totalMessages || 0) / messagesByDay.length)
      : 0,
    avgMessagesPerGroup: messagesByGroupMap.size > 0
      ? Math.round((totalMessages || 0) / messagesByGroupMap.size)
      : 0,
    weekStart: weekStart.toISOString().split('T')[0],
    weekEnd: weekEnd.toISOString().split('T')[0],
  };
}

export async function generateWeeklyInsights(stats: WeeklyStats): Promise<string> {
  const apiKey = process.env.QWEN_API_KEY;
  const apiUrl = process.env.QWEN_API_URL || 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions';

  if (!apiKey) {
    throw new Error('QWEN_API_KEY não configurada');
  }

  const prompt = `Você é um assistente de análise de dados que gera relatórios semanais sobre grupos de WhatsApp.

Analise os dados da semana abaixo e gere um relatório claro e objetivo.

## DADOS DA SEMANA (${stats.weekStart} a ${stats.weekEnd}):

**Métricas Gerais:**
- Total de mensagens: ${stats.totalMessages}
- Grupos ativos: ${stats.totalGroups}
- Média de mensagens/dia: ${stats.avgMessagesPerDay}
- Média de mensagens/grupo: ${stats.avgMessagesPerGroup}

**Distribuição por Dia:**
${stats.messagesByDay.map(d => `- ${d.date}: ${d.count} mensagens`).join('\n')}

**Grupos Mais Ativos:**
${stats.messagesByGroup.slice(0, 5).map((g, i) => `${i + 1}. ${g.groupId}: ${g.count} mensagens`).join('\n')}

**Top 5 Participantes:**
${stats.topParticipants.slice(0, 5).map((p, i) => `${i + 1}. ${p.phone}: ${p.count} mensagens`).join('\n')}

**Horários de Pico:**
${stats.peakHours.map(h => `- ${h.hour}h: ${h.count} mensagens`).join('\n')}

---

## INSTRUÇÕES PARA O RELATÓRIO:

**IMPORTANTE:** Analise o VOLUME e CONTEXTO dos dados antes de gerar o relatório:

- Se o volume for BAIXO (< 50 mensagens) ou dados de TESTE: Use tom casual, reconheça que é início de uso/teste, evite alarmes desnecessários
- Se o volume for MÉDIO/ALTO (> 50 mensagens): Use análise mais profunda e insights estratégicos

Gere um relatório em Markdown puro (SEM blocos de código, SEM \`\`\`markdown) com estas seções:

## 📊 Resumo Executivo
(Visão geral da semana - adapte o tom ao volume de dados)

## 📈 Análise de Tendências
- Padrões observados ao longo da semana
- Comparações relevantes (dias úteis vs fim de semana, se aplicável)
- Destaques importantes

## 👥 Análise de Engajamento
- Grupos mais ativos
- Distribuição de participação
- Padrões de uso

## ⏰ Padrões Temporais
- Horários com mais atividade
- Distribuição ao longo da semana

## 🎯 Insights e Observações
(2-3 insights práticos baseados nos dados reais - evite especulação excessiva)

## 💡 Sugestões
(1-2 sugestões relevantes ao contexto - não force recomendações se os dados forem limitados)

## 📌 Conclusão
(Resumo objetivo dos principais pontos)

**IMPORTANTE:**
- Use ## para todos os títulos de seção
- NÃO envolva o conteúdo em blocos de código \`\`\`markdown
- Retorne apenas o markdown puro, pronto para renderização
- TOM: Seja factual, objetivo e proporcional ao volume de dados`;

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'qwen-turbo',
      messages: [
        { role: 'system', content: 'Você é um assistente de análise de dados que gera relatórios objetivos e proporcionais ao contexto dos dados apresentados.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.5,
    }),
  });

  if (!response.ok) {
    throw new Error(`Erro ao gerar insights: ${response.statusText}`);
  }

  const result = await response.json() as any;
  const content = result.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error('Resposta inválida da IA');
  }

  return content;
}
