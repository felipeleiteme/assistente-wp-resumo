#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function generateCarbonCapitalReport() {
  console.log('📊 RELATÓRIO DIÁRIO - Carbon Capital :: Cashforce');
  console.log('='.repeat(60));
  
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
  
  // Buscar mensagens do grupo
  const { data: messages } = await supabase
    .from('messages')
    .select('*')
    .eq('group_name', 'Carbon Capital :: Cashforce ')
    .order('received_at', { ascending: true });
    
  if (!messages || messages.length === 0) {
    console.log('⚠️ Nenhuma mensagem encontrada');
    return;
  }
  
  console.log(`📨 Total de mensagens: ${messages.length}`);
  
  // Análise de participantes
  const participants = new Set(messages.map(m => m.from_number || m.from || 'Anônimo'));
  const participantCount = {};
  messages.forEach(m => {
    const from = m.from_number || m.from || 'Anônimo';
    participantCount[from] = (participantCount[from] || 0) + 1;
  });
  
  console.log(`👥 Participantes únicos: ${participants.size}`);
  
  console.log('\n👤 PARTICIPAÇÃO POR MEMBRO:');
  Object.entries(participantCount).forEach(([participant, count]) => {
    const percentage = ((count / messages.length) * 100).toFixed(1);
    console.log(`   • ${participant}: ${count} mensagens (${percentage}%)`);
  });
  
  // Análise temporal
  const firstMessage = new Date(messages[0].received_at);
  const lastMessage = new Date(messages[messages.length-1].received_at);
  
  console.log('\n⏰ ANÁLISE TEMPORAL:');
  console.log(`🕐 Primeira mensagem: ${firstMessage.toLocaleString('pt-BR')}`);
  console.log(`🕐 Última mensagem: ${lastMessage.toLocaleString('pt-BR')}`);
  
  console.log('\n📋 TODAS AS MENSAGENS:');
  console.log('-'.repeat(50));
  
  messages.forEach((msg, i) => {
    const timestamp = new Date(msg.received_at).toLocaleString('pt-BR');
    const from = msg.from_number || msg.from || 'Anônimo';
    const text = msg.text_content || msg.text || '(sem texto)';
    
    console.log(`${i+1}. [${timestamp}] ${from}:`);
    console.log(`   "${text}"`);
    console.log();
  });
  
  console.log('✅ RELATÓRIO GERADO COM SUCESSO!');
}

// Executar
generateCarbonCapitalReport().catch(console.error);