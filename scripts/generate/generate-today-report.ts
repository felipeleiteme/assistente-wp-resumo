// Script para gerar relatório diário com foco nos testes de áudio
import { getDailyMessages, getGroupName, saveSummary } from '../src/services/supabase.service';
import { getSummary } from '../src/services/qwen.service';

async function generateTodayReport() {
  console.log('📊 Gerando relatório diário com foco nos testes de áudio...\n');
  
  try {
    // Identificar grupos ativos hoje
    const today = new Date().toISOString().split('T')[0];
    console.log(`📅 Data do relatório: ${today}`);
    
    // Vamos pegar mensagens de todos os grupos que tiveram atividade
    const groupIds = ['120363422615703440-group']; // Grupo que temos
    
    console.log(`📋 Processando ${groupIds.length} grupo(s) ativo(s)...\n`);
    
    for (const groupId of groupIds) {
      try {
        console.log(`🔍 Analisando grupo: ${groupId}`);
        
        // Obter nome do grupo
        const groupName = await getGroupName(groupId);
        console.log(`📛 Nome do grupo: ${groupName}`);
        
        // Buscar mensagens do dia
        const messages = await getDailyMessages(groupId);
        console.log(`💬 Total de mensagens: ${messages.length}`);
        
        if (messages.length === 0) {
          console.log('⏭️  Nenhuma mensagem hoje, pulando...\n');
          continue;
        }
        
        // Analisar mensagens
        const audioMessages = messages.filter(msg => 
          msg.text && msg.text.includes('Áudio transcrito:')
        );
        console.log(`🎤 Mensagens de áudio transcritas: ${audioMessages.length}`);
        
        // Criar transcript completo
        const transcript = messages
          .map(msg => {
            const timestamp = new Date(msg.timestamp).toLocaleTimeString('pt-BR', { 
              hour: '2-digit', 
              minute: '2-digit' 
            });
            
            // Identificar tipo de mensagem
            let prefix = '[TEXT]';
            if (msg.text && msg.text.includes('Áudio transcrito:')) {
              prefix = '[🎤 AUDIO]';
            }
            
            return `[${timestamp}] ${prefix} ${msg.from}: ${msg.text}`;
          })
          .join('\n');
        
        console.log('\n📝 Transcript completo:');
        console.log(transcript);
        console.log('\n' + '='.repeat(80));
        
        // Gerar resumo com IA
        console.log('🧠 Gerando resumo com IA...');
        const summary = await getSummary(transcript);
        
        console.log('\n📋 RESUMO EXECUTIVO:');
        console.log(summary.full);
        
        console.log('\n💡 VERSÃO CURTA:');
        console.log(summary.short);
        
        // Salvar resumo no banco
        console.log('\n💾 Salvando resumo no banco...');
        const summaryRecord = await saveSummary({
          content: summary.full,
          date: today,
          message_count: messages.length
        }, groupId);
        
        console.log(`✅ Resumo salvo com ID: ${summaryRecord.id}`);
        
        // URL do resumo
        const summaryUrl = `${process.env.VERCEL_URL || 'https://assistente-wp-resumo.vercel.app'}/api/resumo?id=${summaryRecord.id}`;
        console.log(`🔗 URL do resumo: ${summaryUrl}`);
        
        console.log('\n' + '🎉'.repeat(20));
        console.log(`✅ RELATÓRIO GERADO COM SUCESSO PARA: ${groupName}`);
        console.log('🎉'.repeat(20));
        
      } catch (error) {
        console.error(`❌ Erro ao processar grupo ${groupId}:`, error);
      }
    }
    
    console.log('\n✨ Processamento concluído!');
    console.log('📊 Os resumos foram salvos e estarão disponíveis nas páginas web.');
    console.log('📧 Notificações serão enviadas automaticamente para o Teams.');
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
    process.exit(1);
  }
}

// Configurar ambiente
if (!process.env.SUPABASE_URL) {
  process.env.SUPABASE_URL = 'https://lnrnkbazzsqpaozchcoz.supabase.co';
  process.env.SUPABASE_ANON_KEY = 'sua_anon_key_aqui';
  process.env.QWEN_API_KEY = 'sk-sua_chave_qwen_aqui';
  process.env.QWEN_API_URL = 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions';
  process.env.VERCEL_URL = 'https://assistente-wp-resumo.vercel.app';
}

if (require.main === module) {
  generateTodayReport();
}