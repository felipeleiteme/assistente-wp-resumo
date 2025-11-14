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

  // PROMPT - Resumo de conversas WhatsApp
  const prompt = `Você é um assistente especializado em analisar conversas de WhatsApp e gerar resumos executivos profissionais.

Analise as mensagens abaixo e gere um resumo estruturado em JSON com dois campos:

**"full"** - Relatório completo em markdown com:
- **Resumo Narrativo**: Contexto geral e principais assuntos discutidos
- **Análise de Sentimento**: Tom da conversa (Positivo, Neutro, Urgente, Descontraído, etc)
- **Principais Tópicos**: Lista dos temas abordados
- **Decisões e Ações**: Compromissos, próximos passos e responsabilidades
- **Observações**: Pontos de atenção ou destaques relevantes

**"short"** - Mensagem resumida (1-2 frases) em tom casual para enviar no WhatsApp

Mensagens para analisar:
${transcript}

RESPONDA APENAS COM O JSON no formato:
{
  "full": "## Resumo Narrativo\n...\n\n## Análise de Sentimento\n...\n\n## Principais Tópicos\n...\n\n## Decisões e Ações\n...\n\n## Observações\n...",
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
        { role: 'system', content: 'Você é um assistente especializado em análise de conversas e geração de resumos executivos profissionais.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.5,
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
