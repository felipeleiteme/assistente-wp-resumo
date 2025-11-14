// Teste simplificado com áudio público para validar a API Gladia

const AUDIO_TEST_URL = "https://www.soundjay.com/misc/sounds/bell-ringing-05.wav";

async function testGladiaSimple() {
  console.log('🧪 Teste simplificado Gladia - Áudio público');
  console.log('📢 URL:', AUDIO_TEST_URL);
  
  try {
    const response = await fetch('https://api.gladia.io/v2/transcription', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-gladia-key': process.env.GLADIA_API_KEY!,
        Accept: 'application/json',
      },
      body: JSON.stringify({
        audio_url: AUDIO_TEST_URL,
        language: 'pt',
      }),
    });

    console.log('📊 Status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Erro:', errorText);
      return;
    }

    const result = await response.json();
    console.log('✅ Sucesso! Resultado:', JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

// Configurar API key
if (!process.env.GLADIA_API_KEY) {
  process.env.GLADIA_API_KEY = 'sua_chave_gladia_aqui';
}

if (require.main === module) {
  testGladiaSimple();
}