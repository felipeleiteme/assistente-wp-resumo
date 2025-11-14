import { createClient } from '@supabase/supabase-js';

// Configurar variáveis de ambiente
const supabaseUrl = 'https://lnrnkbazzsqpaozchcoz.supabase.co';
const supabaseKey = 'sua_anon_key_aqui';

const supabase = createClient(supabaseUrl, supabaseKey);

async function clearDatabase() {
  console.log('🗑️  Limpando banco de dados...\n');
  console.log('⚠️  ATENÇÃO: Isso vai deletar TODAS as mensagens!');
  console.log('Aguarde 3 segundos para cancelar (Ctrl+C)...\n');

  await new Promise(resolve => setTimeout(resolve, 3000));

  // Deletar todas as mensagens
  const { error: messagesError, count: messagesCount } = await supabase
    .from('messages')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete tudo (neq com UUID impossível)

  if (messagesError) {
    console.error('❌ Erro ao deletar mensagens:', messagesError.message);
  } else {
    console.log(`✅ Mensagens deletadas com sucesso!`);
  }

  // Deletar todos os resumos
  const { error: summariesError, count: summariesCount } = await supabase
    .from('summaries')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');

  if (summariesError) {
    console.error('❌ Erro ao deletar resumos:', summariesError.message);
  } else {
    console.log(`✅ Resumos deletados com sucesso!`);
  }

  console.log('\n✨ Banco de dados limpo! Pronto para começar do zero.');
}

clearDatabase().catch(console.error);
