// Script para testar com um payload real de áudio
// Cole aqui o payload real que você capturou e teste

const REAL_AUDIO_PAYLOAD = {
  // COLE AQUI O PAYLOAD REAL QUE VOCÊ CAPTUROU
  // Exemplo de como deve vir:
  /*
  {
    "type": "voice_message",
    "messageType": "voice",
    "audioUrl": "https://file.api.whatsapp.com/voice/123456.ogg",
    "mimeType": "audio/ogg; codecs=opus",
    "from": "5511981102068",
    "phone": "120363422615703440-group",
    "chatName": "Nome do Grupo",
    "timestamp": 1731604901001
  }
  */
};

async function testRealPayload() {
  if (!REAL_AUDIO_PAYLOAD || Object.keys(REAL_AUDIO_PAYLOAD).length === 0) {
    console.log('❌ Nenhum payload real configurado');
    console.log('📝 Por favor:');
    console.log('  1. Configure o endpoint de capture em seu Z-API');
    console.log('  2. Envie um áudio para o grupo');
    console.log('  3. Copie o payload dos logs');
    console.log('  4. Cole no objeto REAL_AUDIO_PAYLOAD');
    console.log('  5. Execute este script novamente');
    return;
  }

  console.log('🧪 Testando payload real de áudio...');
  console.log('📦 Payload:', JSON.stringify(REAL_AUDIO_PAYLOAD, null, 2));
  
  try {
    // Testar contra o endpoint de inspect
    const response = await fetch('http://localhost:3001/capture', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(REAL_AUDIO_PAYLOAD)
    });

    const result = await response.json();
    console.log('\n✅ Resultado da análise:', result);
    
    if (result.analysis?.hasAudio) {
      console.log('\n🎵 ÁUDIO DETECTADO!');
      console.log('  URL:', result.analysis.audioUrl);
      console.log('  Tipo:', result.analysis.audioType);
      console.log('  Campos encontrados:', result.analysis.audioFields);
    }
    
  } catch (error) {
    console.error('❌ Erro ao testar:', error);
    console.log('💡 Certifique-se de que o capture está rodando em http://localhost:3001');
  }
}

// Se quiser testar diretamente no handler
testHandlerWithRealPayload();

async function testHandlerWithRealPayload() {
  console.log('\n🔧 Testando com o handler real...');
  
  // Simular a requisição
  const mockReq = {
    body: REAL_AUDIO_PAYLOAD,
    headers: {}
  } as any;
  
  try {
    // Importar e testar o extractAudioInfo
    const { extractAudioInfo } = await import('../src/handlers/handleWebhook');
    
    // @ts-ignore - vamos acessar a função interna
    const audioInfo = extractAudioInfo(REAL_AUDIO_PAYLOAD);
    
    console.log('🔍 Resultado do extractAudioInfo:', audioInfo);
    
    if (audioInfo) {
      console.log('✅ Áudio seria processado!');
      console.log('  URL:', audioInfo.url);
      console.log('  Tipo:', audioInfo.type);
      console.log('  Mime:', audioInfo.mimeType);
    } else {
      console.log('❌ Áudio NÃO seria detectado');
      console.log('📝 Precisamos atualizar o código com os novos campos');
    }
    
  } catch (error) {
    console.error('❌ Erro no teste:', error);
  }
}

// Executar
if (require.main === module) {
  testRealPayload();
}