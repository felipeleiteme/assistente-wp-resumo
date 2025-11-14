import { handleWebhook } from './src/handlers/handleWebhook';

// Configurar variáveis de ambiente com valores seguros
process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://seu-projeto.supabase.co';
process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'sua_anon_key_aqui';
process.env.ZAPI_SECRET = process.env.ZAPI_SECRET || 'seu_secret_aqui';

const mockRequest: any = {
  headers: {
    'x-zapi-secret': process.env.ZAPI_SECRET || 'seu_secret_aqui'
  },
  body: {
    // Mock data para teste do webhook
    phone: 'test_group',
    chatName: 'Grupo Teste',
    from: '5511999999999',
    text: {
      message: 'Mensagem de teste do webhook'
    },
    timestamp: Date.now()
  }
};

async function testWebhook() {
  console.log('🧪 Testando webhook localmente...\n');
  console.log('='.repeat(60));
  console.log('⚠️  ATENÇÃO: Usando credenciais de teste/placeholder');
  console.log('   Configure suas variáveis de ambiente para testes reais.\n');

  try {
    await handleWebhook(mockRequest as any);
    console.log('\n✅ WEBHOOK TESTADO COM SUCESSO!');
    console.log('='.repeat(60));
    console.log('\n✨ Teste local concluído!');
  } catch (error) {
    console.error('\n❌ ERRO no teste do webhook:');
    console.error(error);
    if (error instanceof Error) {
      console.error('\nStack trace:', error.stack);
    }
    console.error('\n💡 DICA: Configure as variáveis de ambiente corretamente');
    process.exit(1);
  }
}

// Executar apenas se chamado diretamente
if (require.main === module) {
  testWebhook();
}

export { testWebhook };
