// Script para testar a API Gladia diretamente com a URL do áudio
// Use para debug da transcrição

const TEST_AUDIO_URL = "https://f004.backblazeb2.com/file/temp-file-download/instances/sua_instance_id_aqui/AC2EA9AF230850D52576FF43CC8E41A1/GMx6At98WGr_IFvZ_C_4yA==.ogg";

async function testGladiaDirect() {
  console.log('🧪 Testando API Gladia diretamente...');
  console.log('📢 URL do áudio:', TEST_AUDIO_URL);
  
  // Testar se a URL é acessível
  try {
    console.log('🔍 Verificando se a URL está acessível...');
    const headResponse = await fetch(TEST_AUDIO_URL, { method: 'HEAD' });
    console.log('📊 Status da URL:', headResponse.status);
    console.log('📋 Headers:', {
      'content-type': headResponse.headers.get('content-type'),
      'content-length': headResponse.headers.get('content-length'),
    });
  } catch (error) {
    console.error('❌ URL não acessível:', error);
    return;
  }
  
  // Testar transcrição
  try {
    console.log('\n🎯 Testando transcrição...');
    
    const response = await fetch('https://api.gladia.io/v2/transcription', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-gladia-key': process.env.GLADIA_API_KEY!,
        Accept: 'application/json',
      },
      body: JSON.stringify({
        audio_url: TEST_AUDIO_URL,
        language: 'pt',
        diarization: false,
        enable_vad: true,
        word_timestamps: false,
      }),
    });

    console.log('📊 Status da API:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Erro da API:', errorText);
      return;
    }

    const result = await response.json();
    console.log('✅ Resultado:', JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error('❌ Erro no teste:', error);
  }
}

// Configurar ambiente
if (!process.env.GLADIA_API_KEY) {
  console.log('⚠️  Configurando variáveis de ambiente...');
  process.env.GLADIA_API_KEY = 'sua_chave_gladia_aqui';
}

if (require.main === module) {
  testGladiaDirect();
}