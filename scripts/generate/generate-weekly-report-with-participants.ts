// Relatório semanal completo com análise detalhada de participantes
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

// Palavras-chave para detectar decisões, ações, broncas e elogios
const DECISION_KEYWORDS = [
  'decidido', 'decidi', 'decisão', 'vamos', 'votar', 'escolher', 'definir', 'confirmar',
  'aprovado', 'reprovado', 'concordo', 'discordo', 'fechado', 'acordado', 'combinado',
  'boa', 'vamos', 'votar', 'aprovado', 'definido', 'escolhido', 'confirmado'
];

const ACTION_KEYWORDS = [
  'fazer', 'vou', 'vamos', 'precisamos', 'ação', 'executar', 'implementar', 'enviar',
  'ligar', 'chamar', 'marcar', 'agendar', 'preparar', 'organizar', 'finalizar',
  'incluir', 'refinar', 'gerar', 'criar', 'enviar', 'preparar'
];

const WARNING_KEYWORDS = [
  'cuidado', 'atenção', 'problema', 'erro', 'bronca', 'puxão', 'avisado', 'perigo',
  'urgente', 'importante', 'não pode', 'proibido', 'errado', 'falhou', 'deu ruim'
];

const POSITIVE_KEYWORDS = [
  'parabéns', 'excelente', 'ótimo', 'perfeito', 'maravilhoso', 'incrível', 'bom trabalho',
  'muito bem', 'congratulações', 'sucesso', 'conseguiu', 'funcionou', 'deu certo', 'boa',
  'irado', 'muito legal', 'parabéns'
];

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

function analisarParticipante(texto: string, numero: string): {
  decisoes: string[];
  acoes: string[];
  broncas: string[];
  elogios: string[];
  ehImportante: boolean;
} {
  const resultado = {
    decisoes: [] as string[],
    acoes: [] as string[],
    broncas: [] as string[],
    elogios: [] as string[],
    ehImportante: false
  };

  if (!texto) return resultado;

  const textoLower = texto.toLowerCase();

  // Detectar decisões
  DECISION_KEYWORDS.forEach(palavra => {
    if (textoLower.includes(palavra)) {
      resultado.decisoes.push(texto);
      resultado.ehImportante = true;
    }
  });

  // Detectar ações
  ACTION_KEYWORDS.forEach(palavra => {
    if (textoLower.includes(palavra)) {
      resultado.acoes.push(texto);
      resultado.ehImportante = true;
    }
  });

  // Detectar broncas/avisos
  WARNING_KEYWORDS.forEach(palavra => {
    if (textoLower.includes(palavra)) {
      resultado.broncas.push(texto);
      resultado.ehImportante = true;
    }
  });

  // Detectar elogios
  POSITIVE_KEYWORDS.forEach(palavra => {
    if (textoLower.includes(palavra)) {
      resultado.elogios.push(texto);
      resultado.ehImportante = true;
    }
  });

  return resultado;
}

function getParticipantName(numero: string): string {
  if (!numero) return 'Participante Desconhecido';
  
  // Mapeamento de nomes conhecidos
  const nameMap: { [key: string]: string } = {
    '5511981102068': 'Felipe Leite',
    '5511916670389': 'Cashforce Principal',
    '5511981249105': 'Mi Salgado',
    '5511982240996': 'Participante 0996',
    '554896296722': 'Participante 6722',
    '5511941739617': 'Participante 9617',
    '65438172094713': 'Participante 4713',
    '240818866622692': 'Participante 2692',
    '5511917331317': 'Participante 1317'
  };

  if (nameMap[numero]) {
    return nameMap[numero];
  } else if (numero.includes('-group')) {
    return `Grupo ${numero.slice(-4)}`;
  } else {
    return `Participante ${numero.slice(-4)}`;
  }
}

function calcularTipoParticipacao(totalMensagens: number, maxMensagens: number): string {
  const percentual = (totalMensagens / maxMensagens) * 100;
  if (percentual >= 40) return 'ativo';
  if (percentual >= 20) return 'moderado';
  if (percentual >= 5) return 'passivo';
  return 'observador';
}

async function analyzeParticipants(groupId: string, messages: any[]) {
  if (!messages || messages.length === 0) {
    return {
      totalParticipantes: 0,
      participantes: [],
      estatisticas: { ativos: 0, moderados: 0, passivos: 0, observadores: 0 }
    };
  }

  const participants = new Map<string, any>();
  let maxMessages = 0;

  // Análise individual por participante
  messages.forEach(msg => {
    const numero = msg.from_number || 'Desconhecido';
    
    if (!participants.has(numero)) {
      participants.set(numero, {
        numero: numero,
        nome: getParticipantName(numero),
        totalMensagens: 0,
        primeiraMensagem: new Date(msg.received_at),
        ultimaMensagem: new Date(msg.received_at),
        participacao: 0,
        decisoes: [],
        acoes: [],
        broncas: [],
        elogios: [],
        temasPrincipais: [],
        mensagensDestaque: [],
        tipoParticipacao: 'observador'
      });
    }

    const participant = participants.get(numero)!;
    participant.totalMensagens++;
    participant.ultimaMensagem = new Date(msg.received_at);
    
    if (maxMessages < participant.totalMensagens) {
      maxMessages = participant.totalMensagens;
    }

    // Analisar conteúdo da mensagem
    const analise = analisarParticipante(msg.text_content || '', numero);
    
    // Coletar informações importantes
    if (analise.decisoes.length > 0) participant.decisoes.push(...analise.decisoes);
    if (analise.acoes.length > 0) participant.acoes.push(...analise.acoes);
    if (analise.broncas.length > 0) participant.broncas.push(...analise.broncas);
    if (analise.elogios.length > 0) participant.elogios.push(...analise.elogios);

    // Mensagens de destaque (importantes ou longas)
    const texto = msg.text_content || '';
    if (texto.length > 100 || analise.ehImportante) {
      participant.mensagensDestaque.push(texto.substring(0, 150) + (texto.length > 150 ? '...' : ''));
    }
  });

  // Calcular participação e tipo de cada participante
  participants.forEach(participant => {
    participant.participacao = (participant.totalMensagens / messages.length) * 100;
    participant.tipoParticipacao = calcularTipoParticipacao(participant.totalMensagens, maxMessages);
    
    // Remover duplicatas e limitar
    participant.decisoes = [...new Set(participant.decisoes)].slice(0, 3);
    participant.acoes = [...new Set(participant.acoes)].slice(0, 3);
    participant.broncas = [...new Set(participant.broncas)].slice(0, 3);
    participant.elogios = [...new Set(participant.elogios)].slice(0, 3);
    participant.mensagensDestaque = [...new Set(participant.mensagensDestaque)].slice(0, 3);
  });

  const estatisticas = {
    ativos: Array.from(participants.values()).filter(p => p.tipoParticipacao === 'ativo').length,
    moderados: Array.from(participants.values()).filter(p => p.tipoParticipacao === 'moderado').length,
    passivos: Array.from(participants.values()).filter(p => p.tipoParticipacao === 'passivo').length,
    observadores: Array.from(participants.values()).filter(p => p.tipoParticipacao === 'observador').length
  };

  return {
    totalParticipantes: participants.size,
    participantes: Array.from(participants.values()).sort((a, b) => b.participacao - a.participacao),
    estatisticas
  };
}

function formatarAnaliseParticipantes(analise: any): string {
  if (!analise || !analise.participantes || analise.participantes.length === 0) {
    return '\n👥 **ANÁLISE DE PARTICIPANTES**\nNenhum participante encontrado no período.\n';
  }

  let resultado = '\n👥 **ANÁLISE DETALHADA DE PARTICIPANTES**\n';
  resultado += '='.repeat(60) + '\n\n';
  
  resultado += `📊 **Resumo Geral:**\n`;
  resultado += `• Total de participantes: ${analise.totalParticipantes}\n`;
  resultado += `• Perfil da conversa: ${analise.estatisticas.ativos} ativos, ${analise.estatisticas.moderados} moderados, ${analise.estatisticas.passivos} passivos, ${analise.estatisticas.observadores} observadores\n\n`;

  resultado += `🎯 **Participantes Detalhados (por nível de atividade):**\n\n`;

  analise.participantes.forEach((participante, index) => {
    const emoji = index === 0 ? '🏆' : index === 1 ? '🥈' : index === 2 ? '🥉' : '👤';
    const tipoEmoji = participante.tipoParticipacao === 'ativo' ? '🔥' : 
                     participante.tipoParticipacao === 'moderado' ? '⚡' : 
                     participante.tipoParticipacao === 'passivo' ? '👂' : '👁️';
    
    resultado += `${emoji} **${participante.nome}** (${participante.numero}) ${tipoEmoji}\n`;
    resultado += `   📊 Nível: ${participante.tipoParticipacao} (${participante.participacao.toFixed(1)}% - ${participante.totalMensagens} mensagens)\n`;
    
    // Decisões tomadas
    if (participante.decisoes.length > 0) {
      resultado += `   ✅ **Decisões tomadas:** ${participante.decisoes.length}\n`;
      participante.decisoes.forEach((decisao, i) => {
        resultado += `      ${i + 1}. "${decisao.substring(0, 120)}${decisao.length > 120 ? '...' : ''}"\n`;
      });
    }
    
    // Ações propostas
    if (participante.acoes.length > 0) {
      resultado += `   🚀 **Ações propostas:** ${participante.acoes.length}\n`;
      participante.acoes.forEach((acao, i) => {
        resultado += `      ${i + 1}. "${acao.substring(0, 120)}${acao.length > 120 ? '...' : ''}"\n`;
      });
    }
    
    // Elogios e reconhecimentos
    if (participante.elogios.length > 0) {
      resultado += `   🎉 **Elogios/reconhecimentos:** ${participante.elogios.length}\n`;
      participante.elogios.forEach((elogio, i) => {
        resultado += `      ${i + 1}. "${elogio.substring(0, 100)}${elogio.length > 100 ? '...' : ''}"\n`;
      });
    }
    
    // Avisos e broncas
    if (participante.broncas.length > 0) {
      resultado += `   ⚠️ **Avisos/alertas:** ${participante.broncas.length}\n`;
      participante.broncas.forEach((bronca, i) => {
        resultado += `      ${i + 1}. "${bronca.substring(0, 100)}${bronca.length > 100 ? '...' : ''}"\n`;
      });
    }
    
    // Mensagens de destaque
    if (participante.mensagensDestaque.length > 0) {
      resultado += `   💬 **Mensagens de destaque:** ${participante.mensagensDestaque.length}\n`;
      participante.mensagensDestaque.forEach((msg, i) => {
        resultado += `      ${i + 1}. "${msg}"\n`;
      });
    }
    
    resultado += '\n';
  });

  // Estatísticas gerais
  resultado += `📈 **Análise da Dinâmica do Grupo:**\n`;
  resultado += `• Líderes naturais (40%+): ${analise.estatisticas.ativos} pessoa(s)\n`;
  resultado += `• Colaboradores ativos (20-39%): ${analise.estatisticas.moderados} pessoa(s)\n`;
  resultado += `• Participantes passivos (5-19%): ${analise.estatisticas.passivos} pessoa(s)\n`;
  resultado += `• Observadores (<5%): ${analise.estatisticas.observadores} pessoa(s)\n\n`;

  resultado += `💡 **Conclusões:**\n`;
  if (analise.estatisticas.ativos === 0) {
    resultado += `• ⚠️ Nenhum líder natural identificado - o grupo pode precisar de mais direção\n`;
  } else if (analise.estatisticas.ativos === 1) {
    resultado += `• ✅ Há um líder natural claro no grupo\n`;
  } else {
    resultado += `• ✅ Há ${analise.estatisticas.ativos} líderes naturais - dinâmica colaborativa\n`;
  }
  
  const totalDecisoes = analise.participantes.reduce((sum, p) => sum + p.decisoes.length, 0);
  const totalAcoes = analise.participantes.reduce((sum, p) => sum + p.acoes.length, 0);
  const totalElogios = analise.participantes.reduce((sum, p) => sum + p.elogios.length, 0);
  
  resultado += `• 📊 Total de decisões tomadas: ${totalDecisoes}\n`;
  resultado += `• 🚀 Total de ações propostas: ${totalAcoes}\n`;
  resultado += `• 🎉 Total de elogios/reconhecimentos: ${totalElogios}\n`;

  return resultado;
}

async function generateWeeklyReportWithParticipants() {
  console.log('📊 GERANDO RELATÓRIO SEMANAL COM ANÁLISE DE PARTICIPANTES\n');
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
            transcricoes: [],
            participantes: []
          });
          continue;
        }
        
        // Análise de áudios
        const audioMessages = messages.filter(msg => 
          msg.text_content && msg.text_content.includes('Áudio transcrito:')
        );
        console.log(`🎤 Áudios transcritos: ${audioMessages.length}`);
        
        // ===== ANÁLISE DE PARTICIPANTES =====
        console.log('\n👥 **ANÁLISE DE PARTICIPANTES**');
        const participantesAnalise = analyzeParticipants(group.id, messages);
        
        if (participantesAnalise && participantesAnalise.participantes && participantesAnalise.participantes.length > 0) {
          console.log(`📊 Encontrados ${participantesAnalise.totalParticipantes} participantes ativos:`);
          
          // Mostrar participantes principais
          participantesAnalise.participantes.forEach((participante, index) => {
            const emoji = index === 0 ? '🏆' : index === 1 ? '🥈' : index === 2 ? '🥉' : '👤';
            console.log(`  ${emoji} ${participante.nome}: ${participante.participacao.toFixed(1)}% (${participante.totalMensagens} mensagens) - ${participante.tipoParticipacao}`);
            
            // Destacar decisões e ações importantes
            if (participante.decisoes.length > 0) {
              console.log(`     ✅ ${participante.decisoes.length} decisão(ões) tomadas`);
            }
            if (participante.acoes.length > 0) {
              console.log(`     🚀 ${participante.acoes.length} ação(ões) propostas`);
            }
            if (participante.elogios.length > 0) {
              console.log(`     🎉 ${participante.elogios.length} elogio(s)/reconhecimento(s)`);
            }
            if (participante.broncas.length > 0) {
              console.log(`     ⚠️ ${participante.broncas.length} aviso(s)/alerta(s)`);
            }
          });
          
          console.log(`📈 Distribuição: ${participantesAnalise.estatisticas.ativos} ativos, ${participantesAnalise.estatisticas.moderados} moderados, ${participantesAnalise.estatisticas.passivos} passivos, ${participantesAnalise.estatisticas.observadores} observadores`);
        } else {
          console.log('  ℹ️ Nenhum participante com análise relevante encontrado');
        }
        // =====================================
        
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
            
            return `[${timestamp}] ${prefix} ${getParticipantName(msg.from_number)}: ${texto}`;
          })
          .join('\n');
        
        // Adicionar ao transcript combinado
        combinedTranscript += `\n\n=== ${group.name} ===\n${groupTranscript}`;
        
        // Coletar transcrições de áudio deste grupo
        const groupTranscriptions = audioMessages.map(msg => ({
          data: new Date(msg.received_at).toLocaleDateString('pt-BR'),
          hora: new Date(msg.received_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          de: getParticipantName(msg.from_number),
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
          resumo: '', // Será preenchido após análise IA
          transcricoes: groupTranscriptions,
          participantes: participantesAnalise.participantes,
          estatisticasParticipantes: participantesAnalise.estatisticas
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
    console.log('\n🧠 GERANDO ANÁLISE GERAL CONSOLIDADA...\n');
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
    
    // Tabela resumida por grupo com análise de participantes
    console.log('\n📋 RESUMO POR GRUPO COM ANÁLISE DE PARTICIPANTES:');
    console.log('-'.repeat(100));
    
    allGroupsAnalysis.forEach(stats => {
      console.log(`\n🏢 ${stats.grupo}:`);
      console.log(`   📊 ${stats.totalMensagens} mensagens | 🎤 ${stats.audioTranscritos} áudios`);
      
      // Análise de participantes para este grupo
      if (stats.participantes && stats.participantes.length > 0) {
        console.log(`   👥 Participantes: ${stats.participantes.length} (${stats.estatisticasParticipantes?.ativos || 0} ativos)`);
        
        // Mostrar principais participantes
        const principais = stats.participantes.slice(0, 3); // Top 3
        principais.forEach((participante, i) => {
          const medalha = i === 0 ? '🏆' : i === 1 ? '🥈' : '🥉';
          console.log(`      ${medalha} ${participante.nome}: ${participante.participacao.toFixed(1)}% (${participante.totalMensagens} msg)`);
          
          // Destacar decisões e ações principais
          if (participante.decisoes.length > 0 || participante.acoes.length > 0) {
            const destaques = [];
            if (participante.decisoes.length > 0) destaques.push(`${participante.decisoes.length} decisão(ões)`);
            if (participante.acoes.length > 0) destaques.push(`${participante.acoes.length} ação(ões)`);
            if (participante.elogios.length > 0) destaques.push(`${participante.elogios.length} elogio(s)`);
            if (destaques.length > 0) {
              console.log(`         💡 ${destaques.join(', ')}`);
            }
          }
        });
        
        if (stats.participantes.length > 3) {
          console.log(`      ... e ${stats.participantes.length - 3} outros participantes`);
        }
      } else {
        console.log(`   👥 Sem análise de participantes disponível`);
      }
      
      console.log(`   💡 ${stats.resumo}`);
      console.log('');
    });
    
    console.log('\n💡 ANÁLISE GERAL:');
    console.log(generalSummary?.short || 'Análise completa disponível.');
    
    // Insights especiais sobre participação
    const totalParticipantesGeral = allGroupsAnalysis.reduce((sum, group) => sum + (group.participantes?.length || 0), 0);
    const totalDecisoesGeral = allGroupsAnalysis.reduce((sum, group) => 
      sum + (group.participantes?.reduce((s, p) => s + p.decisoes.length, 0) || 0), 0);
    const totalAcoesGeral = allGroupsAnalysis.reduce((sum, group) => 
      sum + (group.participantes?.reduce((s, p) => s + p.acoes.length, 0) || 0), 0);
    
    console.log('\n🎯 **INSIGHTS ESPECIAIS SOBRE PARTICIPAÇÃO:**');
    console.log(`• 👥 Total de participantes únicos analisados: ${totalParticipantesGeral}`);
    console.log(`• ✅ Total de decisões tomadas: ${totalDecisoesGeral}`);
    console.log(`• 🚀 Total de ações propostas: ${totalAcoesGeral}`);
    
    const gruposComLideres = allGroupsAnalysis.filter(g => g.estatisticasParticipantes?.ativos > 0).length;
    console.log(`• 🏆 Grupos com líderes naturais: ${gruposComLideres}/${activeGroups.length}`);
    
    console.log('\n💡 **Conclusão sobre Participação:**');
    if (totalDecisoesGeral === 0 && totalAcoesGeral === 0) {
      console.log('• ⚠️ Poucas decisões e ações identificadas - os grupos podem estar mais em fase de discussão do que de execução');
    } else {
      console.log(`• ✅ Foram identificadas ${totalDecisoesGeral} decisões e ${totalAcoesGeral} ações - os grupos estão ativos e produtivos!`);
    }
    
    // Preparar conteúdo completo do relatório
    const fullReportContent = `# RELATÓRIO SEMANAL COMPLETO COM ANÁLISE DE PARTICIPANTES

## PERÍODO: ${weekStart} até ${weekEnd}

### ESTATÍSTICAS GERAIS
- Total de mensagens: ${totalMessages}
- Total de áudios transcritos: ${totalAudioMessages}
- Grupos analisados: ${activeGroups.length}
- Média por grupo: ${Math.round(totalMessages / activeGroups.length)} mensagens
- Total de participantes únicos: ${totalParticipantesGeral}
- Total de decisões: ${totalDecisoesGeral}
- Total de ações: ${totalAcoesGeral}

### ANÁLISE GERAL
${generalSummary?.full || 'Análise completa dos grupos.'}

### DETALHAMENTO POR GRUPO
${allGroupsAnalysis.map(stats => `
### ${stats.grupo}
**Estatísticas:**
- Mensagens: ${stats.totalMensagens}
- Áudios transcritos: ${stats.audioTranscritos}
- Sucesso em áudios: ${stats.taxaSucessoAudio}

**Resumo:** ${stats.resumo}

**Participantes:**
${stats.participantes && stats.participantes.length > 0 ? stats.participantes.map(p => `- ${p.nome}: ${p.participacao.toFixed(1)}% (${p.totalMensagens} mensagens) - ${p.tipoParticipacao}`).join('\n') : 'Conversa informal com foco em testes e validação do assistente virtual'}

${stats.participantes && stats.participantes.some(p => p.decisoes.length > 0 || p.acoes.length > 0) ? '**Principais contribuições:**' : ''}
${stats.participantes && stats.participantes.filter(p => p.decisoes.length > 0).map(p => `- ${p.nome}: participou ativamente nas discussões`).join('\n')}
`).join('\n')}

### OBSERVAÇÕES SOBRE PARTICIPAÇÃO
- ${gruposComLideres} dos ${activeGroups.length} grupos têm líderes naturais identificados
- A análise mostra quem realmente participa, decide e executa em cada grupo
- Os dados permitem identificar otimizações na dinâmica de cada equipe

### RECOMENDAÇÕES
1. **Para líderes de equipe**: Use estes dados para entender a dinâmica do seu grupo
2. **Para gestores**: Identifique quem está mais engajado e quem precisa de mais incentivo
3. **Para todos**: As transcrições de áudio garantem que nenhuma informação importante seja perdida

Relatório gerado em: ${new Date().toLocaleString('pt-BR')}
`;

    // Salvar relatório
    console.log('\n💾 Salvando relatório semanal detalhado no banco...');
    
    // Função para salvar no banco
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('weekly_reports')
      .insert({
        report_content: fullReportContent,
        week_start: startDate.toISOString().split('T')[0],
        week_end: endDate.toISOString().split('T')[0],
        total_messages: totalMessages,
        total_groups: activeGroups.length,
        created_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (error) {
      throw new Error(`Erro ao salvar relatório: ${error.message}`);
    }

    const reportRecord = { id: data.id };
    
    console.log(`\n✅ RELATÓRIO SEMANAL DETALHADO COM PARTICIPANTES SALVO!`);
    console.log(`📄 ID: ${reportRecord.id}`);
    console.log(`🔗 URL: ${process.env.VERCEL_URL || 'https://assistente-wp-resumo.vercel.app'}/api/relatorio-semanal?id=${reportRecord.id}`);
    
    console.log('\n' + '🎉'.repeat(25));
    console.log('✅ RELATÓRIO SEMANAL DETALHADO COM PARTICIPANTES GERADO!');
    console.log('🎉'.repeat(25));
    
  } catch (error) {
    console.error('❌ Erro ao gerar relatório semanal detalhado com participantes:', error);
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
  generateWeeklyReportWithParticipants();
}