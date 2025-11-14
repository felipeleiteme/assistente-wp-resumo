export async function getSummary(transcript: string): Promise<{
  full: string;
  short: string;
}> {
  const apiKey = process.env.QWEN_API_KEY;
  const apiUrl = process.env.QWEN_API_URL || 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions';

  if (!apiKey) {
    throw new Error('QWEN_API_KEY não está configurada.');
  }

  // MODO TESTE: Se a API key for inválida, retornar mock
  const useMock = process.env.USE_MOCK_AI === 'true';
  if (useMock) {
    console.log('⚠️  USANDO RESUMO MOCK (USE_MOCK_AI=true)');
    return {
      full: `## Resumo Narrativo\nForam trocadas ${transcript.split('\n').length} mensagens sobre atualizações do projeto.\n\n## Análise de Sentimento\nClima: Positivo e colaborativo\n\n## Pontos de Ação\n- Confirmar dados com o cliente\n- Acompanhar entrega antecipada`,
      short: 'Conversa produtiva sobre o projeto. Principais pontos: entrega antecipada e próximos passos definidos.'
    };
  }

  // PROMPT V2.0 - Anti-Alucinação: Base APENAS no conteúdo fornecido
  const prompt = `Você é um assistente de análise de conversas de WhatsApp. Sua função é resumir APENAS o que está escrito nas mensagens abaixo, SEM inventar, inferir ou adicionar informações que não existem no texto.

⚠️ REGRAS CRÍTICAS:
1. Use APENAS informações presentes nas mensagens fornecidas
2. Se não houver informações sobre algo (ex: KPIs, datas, ações), escreva "Não identificado nas mensagens"
3. NÃO invente contextos, motivações ou detalhes que não estão explícitos
4. Cite exatamente o que foi dito, com aspas se necessário
5. Se as mensagens forem casuais/descontraídas, reflita isso no resumo

Analise as mensagens e gere UM JSON com dois campos:

**"full"** - Relatório completo em markdown com:
- **Resumo Narrativo**: O que foi discutido? (baseado APENAS nas mensagens)
- **Análise de Sentimento**: Tom geral da conversa (Positivo, Neutro, Urgente, etc)
- **Principais Tópicos**: Liste os assuntos abordados (literalmente)
- **Decisões/Ações**: Apenas se explicitamente mencionadas
- **Observações**: Qualquer detalhe relevante citado

**"short"** - Mensagem curta (1-2 frases) casual para WhatsApp

Mensagens para analisar:
${transcript}

RESPONDA APENAS COM O JSON:
{
  "full": "## Resumo Narrativo\n...\n\n## Análise de Sentimento\n...\n\n## Principais Tópicos\n...\n\n## Decisões/Ações\n...\n\n## Observações\n...",
  "short": "mensagem curta aqui"
}`;

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'qwen-turbo',
      messages: [
        { role: 'system', content: 'Você é um assistente preciso que resume conversas baseando-se APENAS no conteúdo fornecido, sem inventar informações.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3, // Reduzir criatividade/alucinação
    }),
  });

  if (!response.ok) {
    throw new Error(`Erro ao chamar Qwen API: ${response.statusText}`);
  }

  const result = await response.json() as any;
  const content = result.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error('Resposta inválida da Qwen API.');
  }

  // Tentar extrair JSON da resposta
  try {
    const parsed = JSON.parse(content);
    return {
      full: parsed.full || content,
      short: parsed.short || 'Resumo disponível. Confira o link!',
    };
  } catch {
    // Se não for JSON, usar o conteúdo direto como resumo completo
    console.warn('Qwen não retornou JSON. Usando resposta direta.');
    return {
      full: content,
      short: 'Resumo do dia disponível! Confira o link abaixo.',
    };
  }
}
