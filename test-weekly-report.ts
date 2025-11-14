import { handleWeeklyReport } from './src/handlers/handleWeeklyReport';

// Configurar todas as variáveis de ambiente
process.env.SUPABASE_URL = 'https://lnrnkbazzsqpaozchcoz.supabase.co';
process.env.SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxucm5rYmF6enNxcGFvemNoY296Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwNTk1NjYsImV4cCI6MjA3ODYzNTU2Nn0.JpRQhKfQmDeE35-_7y1vqi9GMAR1yIR8uLQEXl8JqGM';
process.env.QWEN_API_KEY = 'sk-5794c6028dcb40c0a1f19ac888064bf6';
process.env.QWEN_API_URL = 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions';
process.env.VERCEL_URL = 'https://assistente-wp-resumo.vercel.app';
process.env.TEAMS_WEBHOOK_URL = 'https://cashforcefinance.webhook.office.com/webhookb2/c88879a4-90d8-45f0-9c00-91fe8a988638@d9b1523d-1479-4896-9ddd-32a7bb6bdaef/IncomingWebhook/53e05a84bd114d6c80aed50c01eb5ef3/181a843c-8634-4a03-927f-3f10476b6033/V2Ak1WSKDbXyFpsgpqn4zZPTIVz7dcKDrcQbfkGNL4GTo1';

async function testWeeklyReport() {
  console.log('🧪 Testando geração de relatório semanal...\n');
  console.log('='.repeat(60));

  try {
    const result = await handleWeeklyReport();

    console.log('\n✅ RELATÓRIO GERADO COM SUCESSO!\n');
    console.log('='.repeat(60));
    console.log('📊 Detalhes do Relatório:');
    console.log(`   - ID: ${result.reportId}`);
    console.log(`   - URL: ${result.reportUrl}`);
    console.log('='.repeat(60));
    console.log('\n📧 Notificação enviada ao MS Teams!');
    console.log('🌐 Acesse a URL acima para ver o relatório completo.');
    console.log('\n✨ Teste concluído com sucesso!');

  } catch (error) {
    console.error('\n❌ ERRO ao gerar relatório:');
    console.error(error);
    if (error instanceof Error) {
      console.error('\nStack trace:', error.stack);
    }
    process.exit(1);
  }
}

testWeeklyReport();
