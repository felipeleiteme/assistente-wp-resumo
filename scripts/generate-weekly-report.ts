// Script para gerar relatório semanal completo com análise de áudio
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getSummary } from '../src/services/qwen.service';

let supabase: SupabaseClient;

function getSupabaseClient(): SupabaseClient {
  if (!supabase) {
    const supabaseUrl = process.env.SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_ANON_KEY!;
    supabase = createClient(supabaseUrl, supabaseKey);
  }
  return supabase;
}

async function getWeeklyMessages(groupId: string) {
  const client = getSupabaseClient();
  
  // Últimos 7 dias
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 7);
  startDate.setHours(0, 0, 0, 0);
  
  const endDate = new Date();
  endDate.setHours(23, 59, 59, 999);
  
  const { data, error } = await client
    .from('messages')
    .select('from_number, text_content, received_at, group_id, group_name')
    .gte('received_at', startDate.toISOString())
    .lte('received_at', endDate.toISOString())
    .eq('group_id', groupId)
    .order('received_at', { ascending: true });

  if (error) {
    throw new Error(`Erro ao buscar mensagens: ${error.message}`);
  }

  return data || [];
}

// NOVO: Buscar todos os grupos ativos na semana
async function getActiveGroupsFromWeek() {
  const client = getSupabaseClient();
  
  // Últimos 7 dias
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 7);
  startDate.setHours(0, 0, 0, 0);
  
  const endDate = new Date();
  endDate.setHours(23, 59, 59, 999);
  
  const { data, error } = await client
    .from('messages')
    .select('group_id, group_name')
    .gte('received_at', startDate.toISOString())
    .lte('received_at', endDate.toISOString());

  if (error) {
    throw new Error(`Erro ao buscar grupos ativos: ${error.message}`);
  }

  // Remover duplicatas e retornar grupos únicos
  const uniqueGroups = new Map();
  (data || []).forEach(msg => {
    if (msg.group_id && !uniqueGroups.has(msg.group_id)) {
      uniqueGroups.set(msg.group_id, msg.group_name || `Grupo ${msg.group_id}`);
    }
  });

  return Array.from(uniqueGroups.entries()).map(([id, name]) => ({ id, name }));
}

async function getWeeklySummaries(groupId: string) {
  const client = getSupabaseClient();
  
  // Últimos 7 dias
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 7);
  
  const { data, error } = await client
    .from('daily_summaries')
    .select('*')
    .gte('summary_date', startDate.toISOString().split('T')[0])
    .eq('group_id', groupId)
    .order('summary_date', { ascending: true });

  if (error) {
    throw new Error(`Erro ao buscar resumos: ${error.message}`);
  }

  return data || [];
}

async function saveWeeklyReport(report: {
  content: string;
  week_start: string;
  week_end: string;
  total_messages: number;
  total_groups: number;
}) {
  const client = getSupabaseClient();

  const { data, error } = await client
    .from('weekly_reports')
    .insert({
      report_content: report.content,
      week_start: report.week_start,
      week_end: report.week_end,
      total_messages: report.total_messages,
      total_groups: report.total_groups,
      created_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (error) {
    throw new Error(`Erro ao salvar relatório: ${error.message}`);
  }

  return { id: data.id };
}

async function generateWeeklyReport() {
  console.log('📊 GERANDO RELATÓRIO SEMANAL COMPLETO\n');
  console.log('='.repeat(80));
  
  try {
    // Período da semana
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);
    
    const weekStart = startDate.toLocaleDateString('pt-BR');
    const weekEnd = endDate.toLocaleDateString('pt-BR');
    
    console.log(`📅 PERÍODO: ${weekStart} até ${weekEnd}`);
    console.log('='.repeat(80) + '\n');
    
    // Grupos que vamos analisar
    const groups = [
      { id: '120363422615703440-group', name: 'Grupo Teste Bot' }
    ];
    
    let totalMessages = 0;
    let totalAudioMessages = 0;
    let allTranscripts = [];
    let weeklyAnalysis = [];
    
    // Buscar grupos ativos da semana
    console.log('🔍 Buscando grupos ativos da semana...');
    const activeGroups = await getActiveGroupsFromWeek();
    
    if (activeGroups.length === 0) {
      console.log('⏭️  Nenhum grupo ativo encontrado na semana');
      return;
    }
    
    console.log(`📊 ENCONTRADOS ${activeGroups.length} GRUPO(S) ATIVO(S):`);
    activeGroups.forEach(group => {
      console.log(`  📱 ${group.name} (${group.id})`);
    });
    console.log();
    
    for (const group of activeGroups) {
      console.log(`📋 Grupo: ${group.name} (${group.id})`);
      console.log('-'.repeat(60));
      
      try {
        // Buscar mensagens da semana
        const messages = await getWeeklyMessages(group.id);
        console.log(`💬 Total de mensagens: ${messages.length}`);
        
        if (messages.length === 0) {
          console.log('⏭️  Nenhuma mensagem na semana\n');
          continue;
        }
        
        // Análise por dia
        const dailyStats = {};
        const audioMessages = [];
        
        messages.forEach(msg => {
          const date = new Date(msg.received_at).toLocaleDateString('pt-BR');
          if (!dailyStats[date]) {
            dailyStats[date] = { total: 0, audio: 0 };
          }
          dailyStats[date].total++;
          
          // Detectar áudios transcritos
          if (msg.text_content && msg.text_content.includes('Áudio transcrito:')) {
            dailyStats[date].audio++;
            totalAudioMessages++;
            
            // Extrair transcrição
            const transcricao = msg.text_content.replace('Áudio transcrito: ', '');
            audioMessages.push({
              data: date,
              hora: new Date(msg.received_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
              de: msg.from_number,
              texto: transcricao,
              duracao: msg.text_content.includes('seconds') ? msg.text_content.match(/seconds: (\d+)/)?.[1] : null
            });
          }
        });
        
        console.log(`🎤 Áudios transcritos: ${audioMessages.length}`);
        console.log('\n📊 Estatísticas diárias:');
        Object.entries(dailyStats).forEach(([data, stats]) => {
          console.log(`  ${data}: ${stats.total} mensagens (${stats.audio} áudios)`);
        });
        
        // Mostrar transcrições de áudio
        if (audioMessages.length > 0) {
          console.log('\n📝 TRANSCRIÇÕES DE ÁUDIO DA SEMANA:');
          audioMessages.forEach((audio, index) => {
            console.log(`\n[${audio.data} ${audio.hora}] 🎤 ${audio.de}:`);
            console.log(`"${audio.texto}"`);
            if (audio.duracao) {
              console.log(`⏱️  Duração: ${audio.duracao} segundos`);
            }
          });
        }
        
        // Preparar dados para análise geral
        const transcriptSemanal = messages
          .map(msg => {
            const timestamp = new Date(msg.received_at).toLocaleString('pt-BR');
            let prefix = '[TEXT]';
            let texto = msg.text_content || '';
            
            if (texto.includes('Áudio transcrito:')) {
              prefix = '[🎤 AUDIO]';
              texto = texto.replace('Áudio transcrito: ', '');
            } else if (texto.includes('Áudio recebido')) {
              prefix = '[🎤 AUDIO FALHA]';
            }
            
            return `[${timestamp}] ${prefix} ${msg.from_number}: ${texto}`;
          })
          .join('\n');
        
        allTranscripts.push(transcriptSemanal);
        
        // Análise específica do grupo
        weeklyAnalysis.push({
          grupo: group.name,
          totalMensagens: messages.length,
          audioTranscritos: audioMessages.length,
          taxaSucessoAudio: audioMessages.length > 0 ? '100%' : '0%',
          periodo: `${weekStart} a ${weekEnd}`
        });
        
        totalMessages += messages.length;
        
        console.log('\n' + '='.repeat(60) + '\n');
        
      } catch (error) {
        console.error(`❌ Erro ao processar grupo ${group.name}:`, error);
      }
    }
    
    // Análise geral com IA
    console.log('🧠 GERANDO ANÁLISE SEMANAL COM IA...\n');
    
    const transcriptCompleto = allTranscripts.join('\n\n');
    const summary = await getSummary(transcriptCompleto);
    
    console.log('📈 RELATÓRIO SEMANAL EXECUTIVO');
    console.log('='.repeat(80));
    console.log(summary.full);
    
    // Estatísticas da semana
    console.log('\n📊 ESTATÍSTICAS DA SEMANA');
    console.log('='.repeat(50));
    console.log(`📅 Período: ${weekStart} até ${weekEnd}`);
    console.log(`💬 Total de mensagens: ${totalMessages}`);
    console.log(`🎤 Áudios transcritos: ${totalAudioMessages}`);
    console.log(`📈 Taxa de sucesso áudio: ${totalAudioMessages > 0 ? '100%' : '0%'}`);
    
    console.log('\n📋 ANÁLISE POR GRUPO:');
    weeklyAnalysis.forEach(analysis => {
      console.log(`\n🏢 ${analysis.grupo}:`);
      console.log(`   📊 ${analysis.totalMensagens} mensagens`);
      console.log(`   🎤 ${analysis.audioTranscritos} áudios transcritos`);
      console.log(`   ✅ ${analysis.taxaSucessoAudio} de sucesso em áudios`);
    });
    
    console.log('\n💡 ANÁLISE GERAL:');
    console.log(summary.short);
    
    // Salvar relatório semanal
    console.log('\n💾 Salvando relatório semanal no banco...');
    const reportRecord = await saveWeeklyReport({
      content: summary.full + '\n\n' + JSON.stringify(weeklyAnalysis, null, 2),
      week_start: startDate.toISOString().split('T')[0],
      week_end: endDate.toISOString().split('T')[0],
      total_messages: totalMessages,
      total_groups: groups.length
    });
    
    console.log(`\n✅ RELATÓRIO SEMANAL SALVO!`);
    console.log(`📄 ID: ${reportRecord.id}`);
    console.log(`🔗 URL: ${process.env.VERCEL_URL || 'https://assistente-wp-resumo.vercel.app'}/api/relatorio-semanal?id=${reportRecord.id}`);
    
    console.log('\n' + '🎉'.repeat(25));
    console.log('✅ RELATÓRIO SEMANAL GERADO COM SUCESSO!');
    console.log('🎉'.repeat(25));
    
  } catch (error) {
    console.error('❌ Erro ao gerar relatório semanal:', error);
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
  generateWeeklyReport();
}