export async function getSummary(transcript: string): Promise<{
  full: string;
  short: string;
}> {
  const apiKey = process.env.QWEN_API_KEY;
  const apiUrl = process.env.QWEN_API_URL || 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation';

  if (!apiKey) {
    throw new Error('QWEN_API_KEY não está configurada.');
  }

  // Prompt para o Qwen gerar um resumo completo e uma versão curta
  const prompt = `Você é um assistente que resume conversas de grupos do WhatsApp de forma profissional e objetiva.

Analise as mensagens abaixo e gere:
1. Um resumo completo (3-5 parágrafos) destacando os principais tópicos, decisões e ações.
2. Uma mensagem curta (1-2 frases) em tom casual para compartilhar no grupo.

Mensagens:
${transcript}

Formato de resposta (JSON):
{
  "full": "resumo completo aqui",
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
      input: {
        messages: [
          { role: 'system', content: 'Você é um assistente especializado em resumir conversas.' },
          { role: 'user', content: prompt },
        ],
      },
      parameters: {
        result_format: 'message',
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Erro ao chamar Qwen API: ${response.statusText}`);
  }

  const result = await response.json();
  const content = result.output?.choices?.[0]?.message?.content;

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
    return {
      full: content,
      short: 'Resumo do dia disponível! Confira o link abaixo.',
    };
  }
}
