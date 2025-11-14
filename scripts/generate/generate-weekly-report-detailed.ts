// Relatório semanal detalhado - resumo individual por grupo + análise geral
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

async function getWeeklyMessagesByGroup(groupId: string) {
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

  // Remover duplicatas e retornar grupos únicos com nomes reais
  const uniqueGroups = new Map();
  (data || []).forEach(msg => {
    if (msg.group_id && !uniqueGroups.has(msg.group_id)) {
      // Mapeamento de nomes reais dos grupos
      const groupNamesMap = {
        '120363422615703440-group': 'Grupo Teste Bot',
        '120363169699505156-group': 'Onboarding Cashforce',
        '120363312076571833-group': 'Carbon Capital :: Cashforce',
        '5511916670389': 'Grupo Cashforce Principal',
        '5511981102068': 'Felipe Leite | CashForce',
        '5511981249105': 'Mi Salgado'
      };
      
      // Usar nome do mapeamento ou nome do banco ou ID como fallback
      const realName = groupNamesMap[msg.group_id] || msg.group_name || `Grupo ${msg.group_id}`;
      uniqueGroups.set(msg.group_id, realName);
    }
  });

  return Array.from(uniqueGroups.entries()).map(([id, name]) => ({ id, name }));
}

async function saveWeeklyReport(report: {
  content: string;
  week_start: string;
  week_end: string;
  total_messages: number;
  total_groups: number;
  groups_analysis: any[];
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

async function generateDetailedWeeklyReport() {
  console.log('📊 GERANDO RELATÓRIO SEMANAL DETALHADO POR GRUPO\n');
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
    
    let totalMessages = 0;
    let totalAudioMessages = 0;
    let allGroupsAnalysis = [];
    let combinedTranscript = '';
    
    // Análise individual por grupo
    console.log('📋 ANÁLISE INDIVIDUAL POR GRUPO:');
    console.log('='.repeat(80) + '\n');
    
    for (const group of activeGroups) {
      console.log(`🏢 ${group.name} (${group.id})`);
      console.log('-'.repeat(60));
      
      try {
        // Buscar mensagens da semana para este grupo
        const messages = await getWeeklyMessagesByGroup(group.id);
        console.log(`💬 Total de mensagens: ${messages.length}`);
        
        if (messages.length === 0) {
          console.log('⏭️  Nenhuma mensagem na semana\n');
          
          // Adicionar ao relatório mesmo sem mensagens
          allGroupsAnalysis.push({
            grupo: group.name,
            totalMensagens: 0,
            audioTranscritos: 0,
            taxaSucessoAudio: '0%',
            periodo: `${weekStart} a ${weekEnd}`,
            resumo: 'Nenhuma mensagem nesta semana.',
            transcricoes: []
          });
          continue;
        }
        
        // Análise de áudios
        const audioMessages = messages.filter(msg => 
          msg.text_content && msg.text_content.includes('Áudio transcrito:')
        );
        console.log(`🎤 Áudios transcritos: ${audioMessages.length}`);
        
        // Criar transcript do grupo
        const groupTranscript = messages
          .map(msg => {
            const timestamp = new Date(msg.received_at).toLocaleString('pt-BR', {
              dateStyle: 'short',
              timeStyle: 'short'
            });
            
            let prefix = '[💬]';
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
        
        // Adicionar ao transcript combinado
        combinedTranscript += `\n\n=== ${group.name} ===\n${groupTranscript}`;
        
        // Gerar resumo individual com IA para este grupo
        console.log('\n🧠 Gerando resumo individual com IA...');
        let groupSummary = null;
        
        if (messages.length > 0) {
          try {
            groupSummary = await getSummary(groupTranscript);
            console.log('\n📋 RESUMO INDIVIDUAL:');
            console.log(groupSummary.full);
            console.log('\n💡 Versão curta:');
            console.log(groupSummary.short);
          } catch (error) {
            console.log('⚠️  Não foi possível gerar resumo com IA para este grupo');
            groupSummary = {
              full: `Resumo do grupo ${group.name}: ${messages.length} mensagens trocadas.`,
              short: `${messages.length} mensagens.`
            };
          }
        }
        
        // Coletar transcrições de áudio deste grupo
        const groupTranscriptions = audioMessages.map(msg => ({
          data: new Date(msg.received_at).toLocaleDateString('pt-BR'),
          hora: new Date(msg.received_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          de: msg.from_number,
          texto: msg.text_content?.replace('Áudio transcrito: ', '') || '',
          duracao: msg.text_content?.match(/seconds: (\d+)/)?.[1] || null
        }));
        
        if (groupTranscriptions.length > 0) {
          console.log('\n📝 TRANSCRIÇÕES DE ÁUDIO:');
          groupTranscriptions.forEach((audio, index) => {
            console.log(`\n[${audio.data} ${audio.hora}] 🎤 ${audio.de}:`);
            console.log(`"${audio.texto}"`);
            if (audio.duracao) {
              console.log(`⏱️  Duração: ${audio.duracao} segundos`);
            }
          });
        }
        
        // Estatísticas do grupo
        const groupStats = {
          grupo: group.name,
          totalMensagens: messages.length,
          audioTranscritos: audioMessages.length,
          taxaSucessoAudio: audioMessages.length > 0 ? '100%' : '0%',
          periodo: `${weekStart} a ${weekEnd}`,
          resumo: groupSummary?.short || 'Análise completa disponível.',
          transcricoes: groupTranscriptions
        };
        
        allGroupsAnalysis.push(groupStats);
        totalMessages += messages.length;
        totalAudioMessages += audioMessages.length;
        
        console.log('\n' + '='.repeat(60) + '\n');
        
      } catch (error) {
        console.error(`❌ Erro ao processar grupo ${group.name}:`, error);
      }
    }
    
    // Análise geral consolidada com IA
    console.log('🧠 GERANDO ANÁLISE GERAL CONSOLIDADA...\n');
    console.log('📈 RESUMO EXECUTIVO GERAL');
    console.log('='.repeat(80));
    
    let generalSummary = null;
    if (combinedTranscript.trim()) {
      try {
        generalSummary = await getSummary(combinedTranscript);
        console.log(generalSummary.full);
      } catch (error) {
        console.log('📊 RESUMO GERAL:');
        console.log(`Relatório semanal com ${totalMessages} mensagens e ${totalAudioMessages} áudios transcritos.`);
        generalSummary = {
          full: `Relatório semanal com ${totalMessages} mensagens e ${totalAudioMessages} áudios transcritos.`,
          short: `${totalMessages} mensagens, ${totalAudioMessages} áudios.`
        };
      }
    }
    
    // Estatísticas gerais
    console.log('\n📊 ESTATÍSTICAS GERAIS');
    console.log('='.repeat(50));
    console.log(`📅 Período: ${weekStart} até ${weekEnd}`);
    console.log(`💬 Total de mensagens: ${totalMessages}`);
    console.log(`🎤 Total de áudios transcritos: ${totalAudioMessages}`);
    console.log(`📊 Total de grupos analisados: ${activeGroups.length}`);
    console.log(`📈 Média por grupo: ${Math.round(totalMessages / activeGroups.length)} mensagens`);
    
    // Tabela resumida por grupo
    console.log('\n📋 RESUMO POR GRUPO:');
    console.log('-'.repeat(80));
    allGroupsAnalysis.forEach(stats => {
      console.log(`🏢 ${stats.grupo}:`);
      console.log(`   📊 ${stats.totalMensagens} mensagens`);
      console.log(`   🎤 ${stats.audioTranscritos} áudios transcritos`);
      console.log(`   ✅ ${stats.taxaSucessoAudio} de sucesso em áudios`);
      console.log(`   💡 ${stats.resumo}`);
      console.log('');
    });
    
    console.log('\n💡 ANÁLISE GERAL:');
    console.log(generalSummary?.short || 'Análise completa disponível.');
    
    // Preparar conteúdo completo do relatório
    const fullReportContent = `# RELATÓRIO SEMANAL DETALHADO

## PERÍODO: ${weekStart} até ${weekEnd}

### ESTATÍSTICAS GERAIS
- Total de mensagens: ${totalMessages}
- Total de áudios transcritos: ${totalAudioMessages}
- Grupos analisados: ${activeGroups.length}
- Média por grupo: ${Math.round(totalMessages / activeGroups.length)} mensagens

### ANÁLISE GERAL
${generalSummary?.full || 'Análise completa dos grupos.'}

### DETALHAMENTO POR GRUPO
${allGroupsAnalysis.map(stats => `
#### ${stats.grupo}
- **Mensagens:** ${stats.totalMensagens}
- **Áudios transcritos:** ${stats.audioTranscritos}
- **Sucesso em áudios:** ${stats.taxaSucessoAudio}
- **Resumo:** ${stats.resumo}
${stats.transcricoes.length > 0 ? `
**Transcrições de áudio:**
${stats.transcricoes.map(audio => `- [${audio.data} ${audio.hora}] ${audio.de}: "${audio.texto}"${audio.duracao ? ` (${audio.duracao}s)` : ''}`).join('\n')}` : ''}
`).join('\n')}

### OBSERVAÇÕES
- Relatório gerado em: ${new Date().toLocaleString('pt-BR')}
- Período analisado: 7 dias
- Todos os grupos com atividade na semana foram incluídos
`;

    // Salvar relatório
    console.log('\n💾 Salvando relatório semanal no banco...');
    const reportRecord = await saveWeeklyReport({
      content: fullReportContent,
      week_start: startDate.toISOString().split('T')[0],
      week_end: endDate.toISOString().split('T')[0],
      total_messages: totalMessages,
      total_groups: activeGroups.length,
      groups_analysis: allGroupsAnalysis
    });
    
    console.log(`\n✅ RELATÓRIO SEMANAL DETALHADO SALVO!`);
    console.log(`📄 ID: ${reportRecord.id}`);
    console.log(`🔗 URL: ${process.env.VERCEL_URL || 'https://assistente-wp-resumo.vercel.app'}/api/relatorio-semanal?id=${reportRecord.id}`);
    
    console.log('\n' + '🎉'.repeat(25));
    console.log('✅ RELATÓRIO SEMANAL DETALHADO GERADO!');
    console.log('🎉'.repeat(25));
    
  } catch (error) {
    console.error('❌ Erro ao gerar relatório semanal detalhado:', error);
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
  generateDetailedWeeklyReport();
}