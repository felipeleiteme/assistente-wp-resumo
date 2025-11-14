// Análise detalhada de participantes - quem falou, decisões, ações e broncas
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

// Palavras-chave para detectar decisões, ações, broncas e temas importantes
const DECISION_KEYWORDS = [
  'decidido', 'decidi', 'decisão', 'vamos', 'votar', 'escolher', 'definir', 'confirmar',
  'aprovado', 'reprovado', 'concordo', 'discordo', 'fechado', 'acordado', 'combinado'
];

const ACTION_KEYWORDS = [
  'fazer', 'vou', 'vamos', 'precisamos', 'ação', 'executar', 'implementar', 'enviar',
  'ligar', 'chamar', 'marcar', 'agendar', 'preparar', 'organizar', 'finalizar'
];

const WARNING_KEYWORDS = [
  'cuidado', 'atenção', 'problema', 'erro', 'bronca', 'puxão', 'avisado', 'perigo',
  'urgente', 'importante', 'não pode', 'proibido', 'errado', 'falhou', 'deu ruim'
];

const POSITIVE_KEYWORDS = [
  'parabéns', 'excelente', 'ótimo', 'perfeito', 'maravilhoso', 'incrível', 'bom trabalho',
  'muito bem', 'congratulações', 'sucesso', 'conseguiu', 'funcionou', 'deu certo'
];

interface ParticipantAnalysis {
  numero: string;
  nome: string;
  totalMensagens: number;
  primeiraMensagem: Date;
  ultimaMensagem: Date;
  participacao: number; // percentual
  decisoes: string[];
  acoes: string[];
  broncas: string[];
  elogios: string[];
  temasPrincipais: string[];
  mensagensDestaque: string[];
  tipoParticipacao: 'ativo' | 'moderado' | 'passivo' | 'observador';
}

function detectarTipoParticipacao(totalMensagens: number, maxMensagens: number): string {
  const percentual = (totalMensagens / maxMensagens) * 100;
  if (percentual >= 40) return 'ativo';
  if (percentual >= 20) return 'moderado';
  if (percentual >= 5) return 'passivo';
  return 'observador';
}

function analisarMensagem(texto: string, numero: string): {
  decisoes: string[];
  acoes: string[];
  broncas: string[];
  elogios: string[];
  temas: string[];
} {
  const resultado = {
    decisoes: [] as string[],
    acoes: [] as string[],
    broncas: [] as string[],
    elogios: [] as string[],
    temas: [] as string[]
  };

  if (!texto) return resultado;

  const textoLower = texto.toLowerCase();

  // Detectar decisões
  DECISION_KEYWORDS.forEach(palavra => {
    if (textoLower.includes(palavra)) {
      resultado.decisoes.push(texto);
    }
  });

  // Detectar ações
  ACTION_KEYWORDS.forEach(palavra => {
    if (textoLower.includes(palavra)) {
      resultado.acoes.push(texto);
    }
  });

  // Detectar broncas/avisos
  WARNING_KEYWORDS.forEach(palavra => {
    if (textoLower.includes(palavra)) {
      resultado.broncas.push(texto);
    }
  });

  // Detectar elogios
  POSITIVE_KEYWORDS.forEach(palavra => {
    if (textoLower.includes(palavra)) {
      resultado.elogios.push(texto);
    }
  });

  // Detectar temas principais (palavras-chave)
  const palavras = texto.split(/\s+/);
  const temasUnicos = new Set<string>();
  palavras.forEach(palavra => {
    if (palavra.length > 4 && !palavra.match(/^\d+$/)) {
      temasUnicos.add(palavra.toLowerCase());
    }
  });
  resultado.temas = Array.from(temasUnicos).slice(0, 5); // Top 5 temas

  return resultado;
}

async function getParticipantAnalysis(groupId: string, period: 'daily' | 'weekly' = 'weekly') {
  const client = getSupabaseClient();
  
  // Definir período
  const endDate = new Date();
  const startDate = new Date();
  
  if (period === 'weekly') {
    startDate.setDate(startDate.getDate() - 7);
  } else {
    startDate.setDate(startDate.getDate() - 1);
  }
  
  console.log(`\n🔍 ANALISANDO PARTICIPANTES DO GRUPO: ${groupId}`);
  console.log(`📅 Período: ${startDate.toLocaleDateString('pt-BR')} até ${endDate.toLocaleDateString('pt-BR')}`);
  
  try {
    // Buscar mensagens do período
    const { data: messages, error } = await client
      .from('messages')
      .select('from_number, text_content, received_at')
      .eq('group_id', groupId)
      .gte('received_at', startDate.toISOString())
      .lte('received_at', endDate.toISOString())
      .order('received_at', { ascending: true });

    if (error) {
      throw new Error(`Erro ao buscar mensagens: ${error.message}`);
    }

    if (!messages || messages.length === 0) {
      console.log('⏭️  Nenhuma mensagem encontrada no período');
      return null;
    }

    console.log(`💬 Total de mensagens encontradas: ${messages.length}`);

    // Análise por participante
    const participants = new Map<string, ParticipantAnalysis>();
    let maxMensagens = 0;

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
      
      if (maxMensagens < participant.totalMensagens) {
        maxMensagens = participant.totalMensagens;
      }

      // Analisar conteúdo da mensagem
      const analise = analisarMensagem(msg.text_content || '', numero);
      
      // Coletar informações importantes
      if (analise.decisoes.length > 0) participant.decisoes.push(...analise.decisoes);
      if (analise.acoes.length > 0) participant.acoes.push(...analise.acoes);
      if (analise.broncas.length > 0) participant.broncas.push(...analise.broncas);
      if (analise.elogios.length > 0) participant.elogios.push(...analise.elogios);
      if (analise.temas.length > 0) participant.temasPrincipais.push(...analise.temas);

      // Mensagens de destaque (longas ou com palavras-chave)
      const texto = msg.text_content || '';
      if (texto.length > 100 || analise.decisoes.length > 0 || analise.acoes.length > 0) {
        participant.mensagensDestaque.push(texto.substring(0, 200) + (texto.length > 200 ? '...' : ''));
      }
    });

    // Calcular participação e tipo de cada participante
    participants.forEach(participant => {
      participant.participacao = (participant.totalMensagens / messages.length) * 100;
      participant.tipoParticipacao = detectarTipoParticipacao(participant.totalMensagens, maxMensagens) as any;
      
      // Remover duplicatas e limitar arrays
      participant.decisoes = [...new Set(participant.decisoes)].slice(0, 3);
      participant.acoes = [...new Set(participant.acoes)].slice(0, 3);
      participant.broncas = [...new Set(participant.broncas)].slice(0, 3);
      participant.elogios = [...new Set(participant.elogios)].slice(0, 3);
      participant.temasPrincipais = [...new Set(participant.temasPrincipais)].slice(0, 5);
      participant.mensagensDestaque = [...new Set(participant.mensagensDestaque)].slice(0, 3);
    });

    return {
      totalMensagens: messages.length,
      totalParticipantes: participants.size,
      periodo: {
        inicio: startDate,
        fim: endDate,
        dias: period === 'weekly' ? 7 : 1
      },
      participantes: Array.from(participants.values())
    };

  } catch (error) {
    console.error('❌ Erro na análise de participantes:', error);
    return null;
  }
}

function getParticipantName(numero: string): string {
  // Mapeamento de nomes conhecidos
  const nameMap: { [key: string]: string } = {
    '5511981102068': 'Felipe Leite',
    '5511916670389': 'Cashforce Principal',
    '5511981249105': 'Mi Salgado',
    '120363422615703440-group': 'Grupo Teste Bot',
    '120363169699505156-group': 'Onboarding Cashforce',
    '120363312076571833-group': 'Carbon Capital :: Cashforce'
  };

  // Extrair últimos 4 dígitos para anonimização parcial
  const last4 = numero.slice(-4);
  
  if (nameMap[numero]) {
    return nameMap[numero];
  } else if (numero.includes('-group')) {
    return `Grupo ${last4}`;
  } else {
    return `Participante ${last4}`;
  }
}

function formatarAnaliseParticipantes(analise: any): string {
  if (!analise || !analise.participantes || analise.participantes.length === 0) {
    return 'Nenhum participante encontrado no período.';
  }

  let resultado = '\n👥 **ANÁLISE DE PARTICIPANTES**\n';
  resultado += '='.repeat(50) + '\n\n';
  
  resultado += `📊 **Resumo Geral:**\n`;
  resultado += `• Total de participantes: ${analise.totalParticipantes}\n`;
  resultado += `• Total de mensagens: ${analise.totalMensagens}\n`;
  resultado += `• Período: ${analise.periodo.dias} dias\n\n`;

  // Ordenar por participação (mais ativo primeiro)
  const participantesOrdenados = [...analise.participantes].sort((a, b) => b.participacao - a.participacao);

  resultado += `🎯 **Participantes Detalhados:**\n\n`;

  participantesOrdenados.forEach((participante, index) => {
    const emoji = index === 0 ? '🏆' : index === 1 ? '🥈' : index === 2 ? '🥉' : '👤';
    
    resultado += `${emoji} **${participante.nome}** (${participante.numero})\n`;
    resultado += `   📊 Participação: ${participante.participacao.toFixed(1)}% (${participante.totalMensagens} mensagens)\n`;
    resultado += `   🏷️ Tipo: ${participante.tipoParticipacao}\n`;
    
    if (participante.decisoes.length > 0) {
      resultado += `   ✅ Decisões: ${participante.decisoes.length}\n`;
      participante.decisoes.forEach((decisao, i) => {
        resultado += `      ${i + 1}. "${decisao.substring(0, 100)}${decisao.length > 100 ? '...' : ''}"\n`;
      });
    }
    
    if (participante.acoes.length > 0) {
      resultado += `   🚀 Ações: ${participante.acoes.length}\n`;
      participante.acoes.forEach((acao, i) => {
        resultado += `      ${i + 1}. "${acao.substring(0, 100)}${acao.length > 100 ? '...' : ''}"\n`;
      });
    }
    
    if (participante.broncas.length > 0) {
      resultado += `   ⚠️ Avisos/Alertas: ${participante.broncas.length}\n`;
      participante.broncas.forEach((bronca, i) => {
        resultado += `      ${i + 1}. "${bronca.substring(0, 100)}${bronca.length > 100 ? '...' : ''}"\n`;
      });
    }
    
    if (participante.elogios.length > 0) {
      resultado += `   🎉 Elogios: ${participante.elogios.length}\n`;
      participante.elogios.forEach((elogio, i) => {
        resultado += `      ${i + 1}. "${elogio.substring(0, 100)}${elogio.length > 100 ? '...' : ''}"\n`;
      });
    }
    
    if (participante.temasPrincipais.length > 0) {
      resultado += `   🏷️ Temas principais: ${participante.temasPrincipais.join(', ')}\n`;
    }
    
    resultado += '\n';
  });

  // Estatísticas adicionais
  const ativos = analise.participantes.filter(p => p.tipoParticipacao === 'ativo').length;
  const moderados = analise.participantes.filter(p => p.tipoParticipacao === 'moderado').length;
  const passivos = analise.participantes.filter(p => p.tipoParticipacao === 'passivo').length;
  const observadores = analise.participantes.filter(p => p.tipoParticipacao === 'observador').length;

  resultado += `📈 **Distribuição de Participação:**\n`;
  resultado += `• Ativos (40%+): ${ativos} participantes\n`;
  resultado += `• Moderados (20-39%): ${moderados} participantes\n`;
  resultado += `• Passivos (5-19%): ${passivos} participantes\n`;
  resultado += `• Observadores (<5%): ${observadores} participantes\n`;

  return resultado;
}

async function generateParticipantReport() {
  console.log('👥 GERANDO RELATÓRIO DE PARTICIPANTES COM ANÁLISE DE DECISÕES E AÇÕES\n');
  console.log('='.repeat(80));
  
  // Analisar os principais grupos
  const grupos = [
    '120363422615703440-group', // Grupo Teste Bot
    '120363169699505156-group', // Onboarding Cashforce
    '120363312076571833-group'  // Carbon Capital :: Cashforce
  ];
  
  for (const groupId of grupos) {
    console.log(`\n🔍 ANALISANDO PARTICIPANTES DO GRUPO: ${groupId}`);
    
    const analise = await getParticipantAnalysis(groupId, 'weekly');
    
    if (analise) {
      const relatorioFormatado = formatarAnaliseParticipantes(analise);
      console.log(relatorioFormatado);
      
      // Gerar insights adicionais com IA
      if (analise.participantes.length > 0) {
        const participantesTexto = analise.participantes.map(p => 
          `${p.nome}: ${p.totalMensagens} mensagens, ${p.decisoes.length} decisões, ${p.acoes.length} ações`
        ).join('\n');
        
        const promptInsights = `Analise este resumo de participantes de um grupo do WhatsApp e gere insights sobre:
1. Quem são os líderes/líderes naturais
2. Quem toma mais decisões
3. Quem executa mais ações
4. Dinâmica do grupo
5. Recomendações para melhorar a participação

Dados:
${participantesTexto}

Gere um parágrafo com insights valiosos.`;
        
        try {
          const insights = await getSummary(participantesTexto);
          console.log('\n💡 **INSIGHTS DA IA:**');
          console.log(insights.full);
        } catch (error) {
          console.log('\n💡 **INSIGHTS:** Análise completa disponível nos dados acima.');
        }
      }
    } else {
      console.log('⚠️  Nenhum dado de participante encontrado para este grupo.');
    }
    
    console.log('\n' + '='.repeat(80));
  }
  
  console.log('\n✅ RELATÓRIO DE PARTICIPANTES CONCLUÍDO!');
  console.log('📊 Agora você tem visibilidade de quem realmente participa, decide e age em cada grupo!');
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
  generateParticipantReport();
}