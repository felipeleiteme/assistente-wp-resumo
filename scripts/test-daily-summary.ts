import { handleSummary } from './src/handlers/handleSummary';

// Configurar todas as variáveis de ambiente com valores seguros
process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://seu-projeto.supabase.co';
process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'sua_anon_key_aqui';
process.env.QWEN_API_KEY = process.env.QWEN_API_KEY || 'sk-sua_chave_aqui';
process.env.QWEN_API_URL = process.env.QWEN_API_URL || 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions';
process.env.VERCEL_URL = process.env.VERCEL_URL || 'https://seu-projeto.vercel.app';
process.env.TEAMS_WEBHOOK_URL = process.env.TEAMS_WEBHOOK_URL || 'https://sua-url-teams.webhook.office.com/...';
process.env.USE_MOCK_AI = process.env.USE_MOCK_AI || 'true'; // Use mock by default for tests

async function testDailySummary() {
  console.log('🧪 Testando geração de resumo diário...\n');
  console.log('='.repeat(60));
  console.log('⚠️  ATENÇÃO: Usando credenciais de teste/placeholder');
  console.log('   Configure suas variáveis de ambiente para testes reais.\n');

  try {
    await handleSummary();

    console.log('\n✅ RESUMO DIÁRIO GERADO COM SUCESSO!');
    console.log('='.repeat(60));
    console.log('\n📧 Verifique o MS Teams para ver a notificação.');
    console.log('🔗 O link do resumo completo estará na notificação.');
    console.log('\n✨ Teste concluído com sucesso!');

  } catch (error) {
    console.error('\n❌ ERRO ao gerar resumo:');
    console.error(error);
    if (error instanceof Error) {
      console.error('\nStack trace:', error.stack);
    }
    console.error('\n💡 DICA: Configure as variáveis de ambiente corretamente');
    console.error('   ou use USE_MOCK_AI=true para testar sem APIs externas');
    process.exit(1);
  }
}

// Executar apenas se chamado diretamente
if (require.main === module) {
  testDailySummary();
}

export { testDailySummary };
