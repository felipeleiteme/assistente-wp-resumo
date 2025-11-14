import { getDailyMessages } from './src/services/supabase.service';

// Configurar variáveis de ambiente
process.env.SUPABASE_URL = 'https://lnrnkbazzsqpaozchcoz.supabase.co';
process.env.SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxucm5rYmF6enNxcGFvemNoY296Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwNTk1NjYsImV4cCI6MjA3ODYzNTU2Nn0.JpRQhKfQmDeE35-_7y1vqi9GMAR1yIR8uLQEXl8JqGM';

async function debugMessages() {
  console.log('🔍 Buscando mensagens do grupo-teste-bot...\n');
  console.log('='.repeat(80));

  const groupId = 'grupo-teste-bot';
  const messages = await getDailyMessages(groupId);

  console.log(`\n📊 Total de mensagens encontradas: ${messages.length}\n`);

  if (messages.length === 0) {
    console.log('❌ NENHUMA MENSAGEM ENCONTRADA!');
    console.log('\nPossíveis motivos:');
    console.log('1. Group ID errado (tentando: "grupo-teste-bot")');
    console.log('2. Mensagens não foram salvas no Supabase');
    console.log('3. Mensagens são de dias anteriores (filtro: hoje >= 00:00)');
    return;
  }

  console.log('📝 Mensagens salvas no banco:\n');
  messages.forEach((msg, index) => {
    console.log(`[${index + 1}] ${msg.timestamp}`);
    console.log(`    De: ${msg.from}`);
    console.log(`    Texto: ${msg.text?.substring(0, 100)}${msg.text && msg.text.length > 100 ? '...' : ''}`);
    console.log('');
  });

  console.log('='.repeat(80));
  console.log('\n💬 Transcript que seria enviado ao Qwen:\n');

  const transcript = messages
    .map(msg => `[${msg.timestamp}] ${msg.from}: ${msg.text}`)
    .join('\n');

  console.log(transcript);
  console.log('\n' + '='.repeat(80));

  // Tentar com ID alternativo
  console.log('\n🔍 Tentando buscar com ID: "120363422615703440-group"...\n');
  const messages2 = await getDailyMessages('120363422615703440-group');
  console.log(`📊 Mensagens encontradas: ${messages2.length}`);

  if (messages2.length > 0) {
    console.log('\n✅ ENCONTRADO! O ID correto do grupo é: "120363422615703440-group"');
    console.log('\nPrimeiras 3 mensagens:');
    messages2.slice(0, 3).forEach((msg, index) => {
      console.log(`[${index + 1}] ${msg.from}: ${msg.text?.substring(0, 80)}`);
    });
  }
}

debugMessages().catch(console.error);
