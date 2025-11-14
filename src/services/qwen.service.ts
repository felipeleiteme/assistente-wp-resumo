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

  // PROMPT V1.6 - Focado em Análise Qualitativa e Quantitativa
  const prompt = `Você é um analista de negócios sênior especializado em Customer Success. Sua função é analisar transcrições de grupos de WhatsApp entre uma empresa (nós) e nossos clientes, e extrair inteligência de negócios.

Analise as mensagens abaixo e gere DOIS formatos de saída, dentro de um JSON:

1.  **"full" (Análise Completa):**
    Este é o relatório interno. Seja direto, analítico e use bullet points. Gere o seguinte:
    * **Resumo Narrativo:** (O que aconteceu? 2-3 parágrafos).
    * **Análise de Sentimento (Clima):** (Qual é o "clima" do grupo? Ex: 'Positivo', 'Neutro', 'Tensão', 'Urgência').
    * **Pedidos Recorrentes / Principais Dúvidas:** (Quais perguntas ou pedidos se repetiram? Quem pediu?).
    * **KPIs e Métricas Citadas:** (Extraia números, datas de entrega, prazos. Ex: 'Entrega antecipada (10/11 -> 06/11)').
    * **Pontos de Ação / Próximos Passos:** (Quais ações foram definidas? Quem é o responsável?).
    * **Ideias/Oportunidades de Melhoria:** (O que podemos aprender ou melhorar com base na conversa?).

2.  **"short" (Mensagem Casual):**
    Esta é a mensagem curta (1-2 frases) que será postada no grupo do WhatsApp. Deve ser casual e amigável.

Mensagens:
${transcript}

Formato de resposta (JSON OBRIGATÓRIO):
{
  "full": "## Resumo Narrativo\n...\n\n## Análise de Sentimento\n...\n\n## Pedidos Recorrentes\n...\n\n## KPIs e Métricas\n...\n\n## Pontos de Ação\n...\n\n## Oportunidades de Melhoria\n...",
  "short": "mensagem curta e casual aqui"
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
        { role: 'system', content: 'Você é um analista de negócios sênior.' },
        { role: 'user', content: prompt },
      ],
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
