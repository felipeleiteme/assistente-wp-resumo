#!/usr/bin/env node

/**
 * Script de verificação de credenciais para relatório real
 */

import { createClient } from '@supabase/supabase-js';

interface CredentialStatus {
  name: string;
  required: boolean;
  value?: string;
  valid: boolean;
  description: string;
}

async function checkSupabaseConnection(url: string, key: string): Promise<boolean> {
  try {
    const supabase = createClient(url, key);
    const { data, error } = await supabase
      .from('messages')
      .select('count')
      .limit(1);
    
    return !error;
  } catch (error) {
    return false;
  }
}

async function verifyCredentials() {
  console.log('🔍 Verificando Credenciais para Relatório Real\n');
  console.log('='.repeat(60));

  const credentials: CredentialStatus[] = [
    {
      name: 'SUPABASE_URL',
      required: true,
      value: process.env.SUPABASE_URL,
      valid: false,
      description: 'URL do seu projeto Supabase'
    },
    {
      name: 'SUPABASE_ANON_KEY',
      required: true,
      value: process.env.SUPABASE_ANON_KEY,
      valid: false,
      description: 'Chave anônima do Supabase'
    },
    {
      name: 'QWEN_API_KEY',
      required: true,
      value: process.env.QWEN_API_KEY,
      valid: false,
      description: 'Chave da API Qwen para IA'
    },
    {
      name: 'ZAPI_INSTANCE_ID',
      required: true,
      value: process.env.ZAPI_INSTANCE_ID,
      valid: false,
      description: 'Instance ID da Z-API'
    },
    {
      name: 'TEAMS_WEBHOOK_URL',
      required: false,
      value: process.env.TEAMS_WEBHOOK_URL,
      valid: false,
      description: 'Webhook do Teams (opcional)'
    }
  ];

  // Verificar credenciais básicas
  let allRequiredValid = true;
  
  for (const cred of credentials) {
    const hasValue = !!cred.value && cred.value !== 'sua_'+cred.name.toLowerCase()+'_aqui';
    cred.valid = hasValue;
    
    if (cred.required && !hasValue) {
      allRequiredValid = false;
    }
    
    const status = hasValue ? '✅' : '❌';
    const required = cred.required ? 'OBRIGATÓRIO' : 'OPCIONAL';
    
    console.log(`${status} ${cred.name}: ${required}`);
    console.log(`   ${cred.description}`);
    if (hasValue) {
      console.log(`   Valor: ${cred.value?.substring(0, 20)}...`);
    }
    console.log();
  }

  // Verificar conexão com Supabase se credenciais existirem
  if (credentials[0].valid && credentials[1].valid) {
    console.log('🔗 Testando conexão com Supabase...');
    const supabaseUrl = credentials[0].value!;
    const supabaseKey = credentials[1].value!;
    
    const connected = await checkSupabaseConnection(supabaseUrl, supabaseKey);
    
    if (connected) {
      console.log('✅ Conexão com Supabase: SUCESSO');
      
      // Verificar se há dados de mensagens
      try {
        const supabase = createClient(supabaseUrl, supabaseKey);
        const { data, error } = await supabase
          .from('messages')
          .select('group_id, group_name')
          .gte('received_at', new Date(Date.now() - 24*60*60*1000).toISOString())
          .limit(10);
        
        if (!error && data && data.length > 0) {
          console.log(`✅ Encontradas ${data.length} mensagens das últimas 24h`);
          const groups = [...new Set(data.map(msg => msg.group_name || msg.group_id))];
          console.log(`✅ Grupos com atividade: ${groups.join(', ')}`);
        } else {
          console.log('⚠️  Nenhuma mensagem encontrada nas últimas 24h');
          console.log('💡 Para testar, envie mensagens no WhatsApp para o grupo conectado');
        }
      } catch (error) {
        console.log('❌ Erro ao buscar mensagens:', error);
      }
    } else {
      console.log('❌ Conexão com Supabase: FALHOU');
      console.log('💡 Verifique URL e chave do Supabase');
    }
  }

  console.log('\n' + '='.repeat(60));
  
  if (allRequiredValid) {
    console.log('🎉 TODAS AS CREDENCIAIS ESTÃO OK!');
    console.log('✅ Você pode gerar um relatório real agora');
    console.log('\n💡 Para gerar o relatório, execute:');
    console.log('   npm run test-daily-summary');
  } else {
    console.log('❌ FALTAM CREDENCIAIS OBRIGATÓRIAS');
    console.log('\n📋 Para configurar:');
    console.log('1. Copie .env.real.example para .env.local');
    console.log('2. Preencha suas credenciais reais');
    console.log('3. Execute este script novamente');
  }
}

// Executar verificação
verifyCredentials().catch(console.error);