import { createClient } from '@supabase/supabase-js';

// Configurar variáveis de ambiente
const supabaseUrl = 'https://lnrnkbazzsqpaozchcoz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxucm5rYmF6enNxcGFvemNoY296Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwNTk1NjYsImV4cCI6MjA3ODYzNTU2Nn0.JpRQhKfQmDeE35-_7y1vqi9GMAR1yIR8uLQEXl8JqGM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkLatestMessages() {
  console.log('🔍 Verificando últimas mensagens recebidas...\n');
  console.log('='.repeat(80));

  // Buscar últimas 10 mensagens de TODOS os grupos
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('❌ Erro ao buscar mensagens:', error.message);
    return;
  }

  if (!data || data.length === 0) {
    console.log('❌ Nenhuma mensagem encontrada no banco!');
    return;
  }

  console.log(`\n📊 Total de mensagens encontradas: ${data.length}\n`);

  data.forEach((msg, index) => {
    console.log(`[${index + 1}] ${msg.created_at}`);
    console.log(`    Group ID: ${msg.group_id}`);
    console.log(`    From: ${msg.from_number}`);
    console.log(`    Text: ${msg.text_content?.substring(0, 100) || '(sem texto)'}`);
    console.log('');
  });

  console.log('='.repeat(80));

  // Verificar se há mensagem recente (últimos 2 minutos)
  const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
  const recentMessages = data.filter(msg => msg.created_at > twoMinutesAgo);

  if (recentMessages.length > 0) {
    console.log('\n✅ WEBHOOK FUNCIONANDO!');
    console.log(`\n📨 ${recentMessages.length} mensagem(ns) recebida(s) nos últimos 2 minutos:`);
    recentMessages.forEach(msg => {
      console.log(`   - [${msg.group_id}] ${msg.text_content?.substring(0, 80)}`);
    });
  } else {
    console.log('\n⚠️  Nenhuma mensagem nos últimos 2 minutos.');
    console.log('Possíveis problemas:');
    console.log('1. Webhook não configurado corretamente');
    console.log('2. Mensagem não foi enviada ainda');
    console.log('3. Delay no processamento do Z-API');
  }
}

checkLatestMessages().catch(console.error);
