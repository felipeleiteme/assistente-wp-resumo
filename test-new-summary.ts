import { handleSummary } from './src/handlers/handleSummary';
import { saveMessage } from './src/services/supabase.service';

// Configurar todas as variáveis de ambiente
process.env.SUPABASE_URL = 'https://lnrnkbazzsqpaozchcoz.supabase.co';
process.env.SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxucm5rYmF6enNxcGFvemNoY296Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwNTk1NjYsImV4cCI6MjA3ODYzNTU2Nn0.JpRQhKfQmDeE35-_7y1vqi9GMAR1yIR8uLQEXl8JqGM';
process.env.QWEN_API_KEY = 'sk-5794c6028dcb40c0a1f19ac888064bf6';
process.env.QWEN_API_URL = 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions';
process.env.USE_MOCK_AI = 'false';
process.env.VERCEL_URL = 'https://assistente-wp-resumo.vercel.app';
process.env.TEAMS_WEBHOOK_URL = 'https://cashforcefinance.webhook.office.com/webhookb2/c88879a4-90d8-45f0-9c00-91fe8a988638@d9b1523d-1479-4896-9ddd-32a7bb6bdaef/IncomingWebhook/53e05a84bd114d6c80aed50c01eb5ef3/181a843c-8634-4a03-927f-3f10476b6033/V2Ak1WSKDbXyFpsgpqn4zZPTIVz7dcKDrcQbfkGNL4GTo1';
process.env.ZAPI_INSTANCE_ID = '3E9E3E55DA46F12CE77F6EB14D89919B';
process.env.ZAPI_TOKEN = '00541A519E438939986F3EA2';

async function createNewSummary() {
  console.log('🧪 Criando novo resumo para testar página...\n');

  const testGroupId = 'grupo-teste-final';
  const now = new Date();

  // Criar mensagens de teste realistas
  const messages = [
    {
      from: '5511999999999',
      text: 'Bom dia equipe! Como estamos com o projeto de migração para a nuvem?',
      time: new Date(now.getTime() - 4 * 60 * 60 * 1000) // 4 horas atrás
    },
    {
      from: '5511888888888',
      text: 'Bom dia! Estamos em 85% da conclusão. Os testes de stress estão rodando.',
      time: new Date(now.getTime() - 3.5 * 60 * 60 * 1000)
    },
    {
      from: '5511777777777',
      text: 'Ótimo! Encontramos um gargalo no banco de dados. Já estamos otimizando.',
      time: new Date(now.getTime() - 3 * 60 * 60 * 1000)
    },
    {
      from: '5511999999999',
      text: 'Precisamos entregar até sexta-feira. Isso é viável?',
      time: new Date(now.getTime() - 2 * 60 * 60 * 1000)
    },
    {
      from: '5511888888888',
      text: 'Sim, tranquilo. Com a otimização devemos concluir até quinta à tarde.',
      time: new Date(now.getTime() - 1.5 * 60 * 60 * 1000)
    },
    {
      from: '5511666666666',
      text: 'O cliente está pedindo uma demo amanhã. Conseguimos?',
      time: new Date(now.getTime() - 1 * 60 * 60 * 1000)
    },
    {
      from: '5511777777777',
      text: 'Conseguimos sim. Vou preparar o ambiente de staging agora.',
      time: new Date(now.getTime() - 30 * 60 * 1000)
    },
    {
      from: '5511999999999',
      text: 'Perfeito! Vou avisar o cliente. Demo confirmada para amanhã às 15h.',
      time: new Date(now.getTime() - 10 * 60 * 1000)
    }
  ];

  console.log('Salvando mensagens no banco...');

  for (const msg of messages) {
    await saveMessage({
      raw_data: { test: true },
      from: msg.from,
      group_id: testGroupId,
      text: msg.text,
      timestamp: msg.time.toISOString(),
    });
    console.log(`  ✅ Mensagem de ${msg.from} salva`);
  }

  console.log('\nGerando resumo...');
  await handleSummary();

  console.log('\n✅ Resumo gerado e enviado para Teams!');
  console.log('Verifique o canal do MS Teams para ver o novo resumo.');
}

createNewSummary().catch(console.error);
