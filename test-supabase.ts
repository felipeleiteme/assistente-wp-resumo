import { createClient } from '@supabase/supabase-js';

// Configurar variáveis de ambiente
process.env.SUPABASE_URL = 'https://lnrnkbazzsqpaozchcoz.supabase.co';
process.env.SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxucm5rYmF6enNxcGFvemNoY296Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwNTk1NjYsImV4cCI6MjA3ODYzNTU2Nn0.JpRQhKfQmDeE35-_7y1vqi9GMAR1yIR8uLQEXl8JqGM';

async function testSupabase() {
  console.log('🧪 Testando conexão com Supabase...\n');

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
  );

  // 1. Verificar tabelas existentes
  console.log('1️⃣ Verificando tabelas...');

  // Tentar listar messages
  const { data: messages, error: msgError } = await supabase
    .from('messages')
    .select('*')
    .limit(5);

  if (msgError) {
    console.error('❌ Erro ao acessar tabela messages:', msgError.message);
  } else {
    console.log(`✅ Tabela messages acessível. Registros encontrados: ${messages?.length || 0}`);
    if (messages && messages.length > 0) {
      console.log('Primeiros registros:', JSON.stringify(messages, null, 2));
    }
  }

  // Tentar listar daily_summaries
  const { data: summaries, error: sumError } = await supabase
    .from('daily_summaries')
    .select('*')
    .limit(5);

  if (sumError) {
    console.error('❌ Erro ao acessar tabela daily_summaries:', sumError.message);
  } else {
    console.log(`✅ Tabela daily_summaries acessível. Registros encontrados: ${summaries?.length || 0}`);
    if (summaries && summaries.length > 0) {
      console.log('Primeiros registros:', JSON.stringify(summaries, null, 2));
    }
  }

  // 2. Tentar inserir uma mensagem de teste
  console.log('\n2️⃣ Tentando inserir mensagem de teste...');
  const { data: insertedMsg, error: insertError } = await supabase
    .from('messages')
    .insert({
      raw_data: { test: true },
      from_number: '5511999999999',
      group_id: '5511888888888-group',
      text_content: 'Mensagem de teste',
      received_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    })
    .select();

  if (insertError) {
    console.error('❌ Erro ao inserir mensagem:', insertError.message);
    console.error('Detalhes:', insertError);
  } else {
    console.log('✅ Mensagem inserida com sucesso!');
    console.log('Dados inseridos:', JSON.stringify(insertedMsg, null, 2));
  }
}

testSupabase().catch(console.error);
