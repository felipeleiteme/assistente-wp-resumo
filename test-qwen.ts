import { getSummary } from './src/services/qwen.service';

// Configurar variáveis de ambiente para teste
process.env.QWEN_API_KEY = 'sk-5794c6028dcb40c0a1f19ac888064bf6';
process.env.QWEN_API_URL = 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions';
process.env.USE_MOCK_AI = 'false';

const testTranscript = `[09:00] João Silva: Bom dia! Temos alguma atualização sobre o projeto?
[09:05] Maria Santos: Sim! A entrega foi antecipada de 15/11 para 13/11
[09:10] João Silva: Ótima notícia! Precisamos confirmar os dados com o cliente.
[09:15] Pedro Costa: Já mandei email para o cliente solicitando confirmação
[09:20] Maria Santos: Perfeito! Vou atualizar o cronograma`;

async function testQwen() {
  console.log('🧪 Testando API do Qwen...\n');

  try {
    const result = await getSummary(testTranscript);

    console.log('✅ Teste bem-sucedido!\n');
    console.log('📄 Resumo Completo:');
    console.log(result.full);
    console.log('\n📱 Resumo Curto:');
    console.log(result.short);

  } catch (error) {
    console.error('❌ Erro ao testar Qwen API:');
    console.error(error);
    process.exit(1);
  }
}

testQwen();
