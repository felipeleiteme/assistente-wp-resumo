// Script para testar o endpoint de inspect
// Use este script para enviar um payload de teste e ver como o sistema interpreta

const TEST_PAYLOADS = {
  // Simulação de áudio da Z-API (baseado em documentações comuns)
  audio_v1: {
    type: 'audio',
    messageType: 'audio',
    audioUrl: 'https://example.com/audio.ogg',
    mimeType: 'audio/ogg; codecs=opus',
    from: '5511981102068',
    phone: '120363422615703440-group',
    chatName: 'Test Group',
    timestamp: new Date().toISOString()
  },
  
  // Outro formato comum
  audio_v2: {
    message: {
      type: 'voice',
      audioUrl: 'https://example.com/voice.mp3',
      mediaKey: 'some-key',
      duration: 15
    },
    chat: {
      id: '120363422615703440-group',
      name: 'Test Group'
    },
    author: '5511981102068',
    timestamp: new Date().toISOString()
  },
  
  // Formato com payload
  audio_v3: {
    payload: {
      audioUrl: 'https://example.com/audio.wav',
      type: 'ptt',
      duration: 8
    },
    instanceId: '120363422615703440-group',
    participantPhone: '5511981102068',
    moment: Date.now()
  },
  
  // Mensagem de texto normal (seu caso atual)
  text: {
    phone: '120363422615703440-group',
    from: '5511981102068',
    text: {
      message: 'Olá, esta é uma mensagem de teste'
    },
    moment: Date.now()
  }
};

async function testInspectEndpoint() {
  const endpoint = process.env.VERCEL_URL 
    ? `${process.env.VERCEL_URL}/api/webhooks/inspect`
    : 'http://localhost:3000/api/webhooks/inspect';

  console.log('🧪 Testando endpoint de inspect:', endpoint);
  console.log('='.repeat(60));

  for (const [testName, payload] of Object.entries(TEST_PAYLOADS)) {
    console.log(`\n📋 Testando: ${testName}`);
    console.log('Payload:', JSON.stringify(payload, null, 2));
    
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      console.log('✅ Resposta:', result);
      
      if (result.analysis?.hasAudio) {
        console.log('🔊 Áudio detectado!');
        console.log('  - Tipo:', result.analysis.audioType);
        console.log('  - URL:', result.analysis.audioUrl);
      } else {
        console.log('💬 Nenhum áudio detectado');
      }
      
    } catch (error) {
      console.error('❌ Erro:', error);
    }
    
    console.log('-'.repeat(40));
    // Pequena pausa entre testes
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

// Executar teste
if (require.main === module) {
  testInspectEndpoint().catch(console.error);
}