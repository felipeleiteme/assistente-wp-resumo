export async function getSummary(transcript: string): Promise<{
  full: string;
  short: string;
  participants?: string[];
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
      full: `## Resumo Narrativo\nForam trocadas ${transcript.split('\n').length} mensagens sobre atualizações do projeto.\n\n## Análise de Sentimento\nClima: Positivo e colaborativo\n\n## 👥 Destaques por Participante\n* **João Silva:**\n    * Confirmou a aprovação do projeto X\n    * Alertou sobre prazo apertado\n* **Maria Santos:**\n    * Ficou de enviar relatório amanhã\n\n## Pontos de Ação\n- Confirmar dados com o cliente\n- Acompanhar entrega antecipada`,
      short: 'Conversa produtiva sobre o projeto. Principais pontos: entrega antecipada e próximos passos definidos.',
      participants: ['João Silva', 'Maria Santos']
    };
  }

  // PROMPT - Resumo de conversas WhatsApp
  const prompt = `Você é um assistente especializado em analisar conversas de WhatsApp e gerar resumos executivos profissionais.

Analise as mensagens abaixo e gere um resumo estruturado em JSON com três campos:

**"full"** - Relatório completo em markdown com AS SEGUINTES SEÇÕES OBRIGATÓRIAS (nesta ordem):
- **Resumo Narrativo**: Contexto geral e principais assuntos discutidos
- **Análise de Sentimento**: Tom da conversa (Positivo, Neutro, Urgente, Descontraído, etc)
- **Principais Tópicos**: Lista dos temas abordados
- **👥 Destaques por Participante**: SEÇÃO ESPECIAL - Liste APENAS os participantes que enviaram mensagens. Para cada um, crie sub-tópicos destacando suas contribuições mais relevantes, focando em:
  * Decisões tomadas (ex: "Confirmou aprovação do projeto X")
  * Ações relevantes (ex: "Ficou de enviar o relatório amanhã")
  * Avisos ou alertas importantes (ex: "Alertou sobre prazo apertado")
  * Use formato: "* **Nome da Pessoa:**" seguido de bullet points indentados
- **Decisões e Ações**: Compromissos gerais, próximos passos e responsabilidades
- **Observações**: Pontos de atenção ou destaques relevantes

**"short"** - Mensagem resumida (1-2 frases) em tom casual para enviar no WhatsApp

**"participants"** - Array com os nomes APENAS das pessoas que mais contribuíram (máximo 5)

Mensagens para analisar:
${transcript}

RESPONDA APENAS COM O JSON no formato:
{
  "full": "## Resumo Narrativo\n...\n\n## Análise de Sentimento\n...\n\n## Principais Tópicos\n...\n\n## 👥 Destaques por Participante\n* **Nome Pessoa 1:**\n    * Decisão/ação importante\n    * Outro destaque\n* **Nome Pessoa 2:**\n    * Contribuição relevante\n\n## Decisões e Ações\n...\n\n## Observações\n...",
  "short": "mensagem curta aqui",
  "participants": ["Nome 1", "Nome 2", "Nome 3"]
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
      participants: parsed.participants || [],
    };
  } catch {
    // Se não for JSON, usar o conteúdo direto como resumo completo
    console.warn('Qwen não retornou JSON. Usando resposta direta.');
    return {
      full: content,
      short: 'Resumo do dia disponível! Confira o link abaixo.',
      participants: [],
    };
  }
}
