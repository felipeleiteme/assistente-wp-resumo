import { handleWebhook } from './src/handlers/handleWebhook';

// Configurar variáveis de ambiente
process.env.SUPABASE_URL = 'https://lnrnkbazzsqpaozchcoz.supabase.co';
process.env.SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxucm5rYmF6enNxcGFvemNoY296Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwNTk1NjYsImV4cCI6MjA3ODYzNTU2Nn0.JpRQhKfQmDeE35-_7y1vqi9GMAR1yIR8uLQEXl8JqGM';
process.env.ZAPI_SECRET = 'Fe4bcaddc9e8d45dd9dddae5ce9fda9f1S';

const mockRequest: any = {
  headers: {
    'x-zapi-secret': 'Fe4bcaddc9e8d45dd9dddae5ce9fda9f1S'
  },
  body: {
    instanceId: '3E9E3E55DA46F12CE77F6EB14D89919B',
    messageId: 'TEST123',
    phone: '120363422615703440-group',
    fromMe: false,
    momment: Date.now(),
    status: 'RECEIVED',
    chatName: 'Grupo Teste Bot',
    senderName: 'Felipe',
    from: '5511916670389',
    type: 'ReceivedCallback',
    text: {
      message: 'Teste local do webhook'
    }
  }
};

async function testWebhook() {
  console.log('🧪 Testando webhook localmente...\n');

  try {
    await handleWebhook(mockRequest);
    console.log('\n✅ Webhook processado com sucesso!');
  } catch (error) {
    console.error('\n❌ Erro:', error);
    if (error instanceof Error) {
      console.error('Stack:', error.stack);
    }
  }
}

testWebhook();
