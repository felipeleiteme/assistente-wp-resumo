#!/usr/bin/env node

/**
 * Script para forçar envio de notificação para Teams
 */

require('dotenv').config({ path: '.env.local' });

async function forceTeamsNotification() {
  console.log('📤 FORÇANDO ENVIO PARA MS TEAMS');
  console.log('='.repeat(50));
  
  const webhookUrl = process.env.TEAMS_WEBHOOK_URL;
  
  if (!webhookUrl) {
    console.log('❌ TEAMS_WEBHOOK_URL não configurado');
    return;
  }
  
  // Criar payload de notificação forçada
  const payload = {
    '@type': 'MessageCard',
    '@context': 'http://schema.org/extensions',
    'summary': '🚨 Teste Forçado - Sistema WhatsApp',
    'themeColor': 'FF6B35',
    'sections': [{
      'activityTitle': '🚨 TESTE FORÇADO DO SISTEMA',
      'activitySubtitle': new Date().toLocaleString('pt-BR'),
      'activityImage': 'https://img.icons8.com/color/48/000000/whatsapp.png',
      'facts': [
        {
          'name': 'Status do Sistema:',
          'value': '🟢 Funcionando'
        },
        {
          'name': 'Último Relatório:',
          'value': '17 mensagens (Carbon Capital)'
        },
        {
          'name': 'Próxima Execução:',
          'value': 'Hoje às 19:00 BRT'
        },
        {
          'name': 'Webhook Status:',
          'value': '✅ Ativo'
        }
      ],
      'text': '🔍 **TESTE FORÇADO DE NOTIFICAÇÃO**\n\nEste é um teste manual para verificar se as notificações estão chegando no Teams.\n\n📊 **Status Atual do Sistema:**\n• ✅ Coleta de mensagens: Funcionando\n• ✅ Processamento: Funcionando\n• ✅ Geração de resumos: Funcionando\n• ✅ Envio para Teams: Funcionando\n\n🔗 **Acesse o sistema:** https://assistente-wp-resumo.vercel.app\n\n📅 **Próximas execuções automáticas:**\n• Hoje às 19:00 BRT - Resumo diário\n• Amanhã às 19:00 BRT - Resumo diário\n• Próxima segunda às 06:00 BRT - Relatório semanal'
    }],
    'potentialAction': [{
      '@type': 'OpenUri',
      'name': '🔗 Acessar Sistema',
      'targets': [{
        'os': 'default',
        'uri': 'https://assistente-wp-resumo.vercel.app'
      }]
    }, {
      '@type': 'OpenUri', 
      'name': '📊 Ver Relatório Carbon Capital',
      'targets': [{
        'os': 'default',
        'uri': 'https://assistente-wp-resumo.vercel.app/api/resumo?id=carbon-capital-test'
      }]
    }]
  };
  
  try {
    console.log('📤 Preparando notificação...');
    console.log('📋 Título:', payload.summary);
    console.log('🔗 Link principal configurado');
    console.log('🔗 Link específico configurado');
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    console.log('✅ NOTIFICAÇÃO ENVIADA COM SUCESSO!');
    console.log('⏰ Verifique o Teams nos próximos 2-3 minutos');
    console.log('📍 Procure na aba "Atualizações" ou chat do conector');
    
  } catch (error) {
    console.log('❌ ERRO ao enviar notificação:', error.message);
    console.log('💡 Possíveis soluções:');
    console.log('   • Recriar webhook no Teams');
    console.log('   • Verificar URL do webhook');
    console.log('   • Testar conexão com internet');
  }
}

// Executar
forceTeamsNotification().catch(console.error);