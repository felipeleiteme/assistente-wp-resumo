/**
 * Script para testar a geração de relatórios diários
 * Testa o fluxo completo: coleta de mensagens → geração de resumo → formatação markdown
 */

import { handleSummary } from '../src/handlers/handleSummary';

// Configurar todas as variáveis de ambiente
process.env.SUPABASE_URL = 'https://lnrnkbazzsqpaozchcoz.supabase.co';
process.env.SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxucm5rYmF6enNxcGFvemNoY296Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwNTk1NjYsImV4cCI6MjA3ODYzNTU2Nn0.JpRQhKfQmDeE35-_7y1vqi9GMAR1yIR8uLQEXl8JqGM';
process.env.QWEN_API_KEY = 'sk-5794c6028dcb40c0a1f19ac888064bf6';
process.env.QWEN_API_URL = 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions';
process.env.VERCEL_URL = 'https://assistente-wp-resumo.vercel.app';
process.env.TEAMS_WEBHOOK_URL = 'https://cashforcefinance.webhook.office.com/webhookb2/c88879a4-90d8-45f0-9c00-91fe8a988638@d9b1523d-1479-4896-9ddd-32a7bb6bdaef/IncomingWebhook/53e05a84bd114d6c80aed50c01eb5ef3/181a843c-8634-4a03-927f-3f10476b6033/V2Ak1WSKDbXyFpsgpqn4zZPTIVz7dcKDrcQbfkGNL4GTo1';

async function testDailyReport() {
  console.log('='.repeat(80));
  console.log('🧪 TESTE DE RELATÓRIO DIÁRIO');
  console.log('='.repeat(80));
  console.log();

  try {
    await handleSummary();
    console.log();
    console.log('='.repeat(80));
    console.log('✅ Teste concluído com sucesso!');
    console.log('='.repeat(80));
  } catch (error) {
    console.error();
    console.error('='.repeat(80));
    console.error('❌ Erro durante o teste:', error);
    console.error('='.repeat(80));
    process.exit(1);
  }
}

testDailyReport();
