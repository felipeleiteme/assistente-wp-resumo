// Script para debug - verificar todos os grupos do banco de dados
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://lnrnkbazzsqpaozchcoz.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'sua_anon_key_aqui';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugGroups() {
  console.log('🔍 DEBUG - VERIFICANDO TODOS OS GRUPOS DO BANCO\n');
  console.log('='.repeat(80));
  
  try {
    // Buscar todos os grupos únicos que já apareceram
    const { data: allGroups, error: allError } = await supabase
      .from('messages')
      .select('group_id, group_name')
      .order('group_id');

    if (allError) {
      console.error('❌ Erro ao buscar todos os grupos:', allError);
      return;
    }

    console.log('📊 TODOS OS GRUPOS ENCONTRADOS:');
    const uniqueGroups = new Map();
    (allGroups || []).forEach(msg => {
      if (msg.group_id && !uniqueGroups.has(msg.group_id)) {
        uniqueGroups.set(msg.group_id, {
          id: msg.group_id,
          name: msg.group_name || 'Sem nome',
          totalMessages: 0
        });
      }
    });
    
    console.log(`Total de grupos únicos: ${uniqueGroups.size}`);
    uniqueGroups.forEach(group => {
      console.log(`  📱 ${group.name} (${group.id})`);
    });
    
    // Buscar contagens por grupo
    console.log('\n' + '='.repeat(80));
    console.log('📈 MENSAGENS POR GRUPO:');
    
    for (const [groupId, groupInfo] of uniqueGroups) {
      const { count, error: countError } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('group_id', groupId);

      if (countError) {
        console.error(`❌ Erro ao contar mensagens do grupo ${groupId}:`, countError);
        continue;
      }
      
      groupInfo.totalMessages = count || 0;
      console.log(`  📱 ${groupInfo.name}: ${count} mensagens`);
    }
    
    // Buscar atividade recente (últimos 7 dias)
    console.log('\n' + '='.repeat(80));
    console.log('📅 ATIVIDADE RECENTE (Últimos 7 dias):');
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);
    
    for (const [groupId, groupInfo] of uniqueGroups) {
      const { count, error: recentError } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('group_id', groupId)
        .gte('received_at', startDate.toISOString());

      if (recentError) {
        console.error(`❌ Erro ao contar mensagens recentes do grupo ${groupId}:`, recentError);
        continue;
      }
      
      const recentCount = count || 0;
      const status = recentCount > 0 ? '✅ ATIVO' : '❌ INATIVO';
      console.log(`  ${status} ${groupInfo.name}: ${recentCount} mensagens recentes`);
    }
    
    // Buscar áudios transcritos por grupo
    console.log('\n' + '='.repeat(80));
    console.log('🎤 ÁUDIOS TRANSCRITOS POR GRUPO:');
    
    for (const [groupId, groupInfo] of uniqueGroups) {
      const { count, error: audioError } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('group_id', groupId)
        .like('text_content', '%Áudio transcrito:%');

      if (audioError) {
        console.error(`❌ Erro ao contar áudios do grupo ${groupId}:`, audioError);
        continue;
      }
      
      const audioCount = count || 0;
      if (audioCount > 0) {
        console.log(`  🎤 ${groupInfo.name}: ${audioCount} áudios transcritos`);
      }
    }
    
    // Verificar daily summaries por grupo
    console.log('\n' + '='.repeat(80));
    console.log('📋 RESUMOS DIÁRIOS POR GRUPO:');
    
    const { data: summaries, error: summaryError } = await supabase
      .from('daily_summaries')
      .select('group_id, count(*)')
      .group('group_id');

    if (!summaryError && summaries) {
      summaries.forEach(summary => {
        const group = uniqueGroups.get(summary.group_id);
        if (group) {
          console.log(`  📊 ${group.name}: ${summary.count} resumos diários`);
        }
      });
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('💡 CONCLUSÕES:');
    console.log(`- Total de grupos únicos: ${uniqueGroups.size}`);
    console.log(`- Grupos com mensagens recentes: ${Array.from(uniqueGroups.values()).filter(g => g.totalMessages > 0).length}`);
    console.log(`- Grupos com áudios transcritos: ${Array.from(uniqueGroups.values()).filter(g => g.totalMessages > 0).length}`);
    
    // Sugestão para o relatório semanal
    console.log('\n💡 SUGESTÃO PARA RELATÓRIO SEMANAL:');
    const activeGroupsRecent = Array.from(uniqueGroups.values()).filter(g => g.totalMessages > 0);
    console.log(`Analisar ${activeGroupsRecent.length} grupo(s) ativo(s):`);
    activeGroupsRecent.forEach(group => {
      console.log(`  - ${group.name} (${group.id})`);
    });
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

// Executar debug
if (require.main === module) {
  debugGroups();
}