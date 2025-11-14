// Teste direto da API do Z-API

const instanceId = '3E9E3E55DA46F12CE77F6EB14D89919B';
const token = '00541A519E438939986F3EA2';

async function testZAPI() {
  console.log('🧪 Testando Z-API diretamente...\n');

  // Teste 1: Enviar para grupo com formato @g.us
  const groupId = '5511888888888@g.us';
  const message = 'Teste de mensagem automática do sistema de resumo.';

  const apiUrl = `https://api.z-api.io/instances/${instanceId}/token/${token}/send-text`;

  console.log('URL:', apiUrl);
  console.log('Grupo:', groupId);
  console.log('Mensagem:', message);
  console.log('\nEnviando...\n');

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phone: groupId,
        message: message,
      }),
    });

    const responseText = await response.text();
    console.log('Status:', response.status, response.statusText);
    console.log('Response:', responseText);

    if (response.ok) {
      console.log('\n✅ Mensagem enviada com sucesso!');
    } else {
      console.log('\n❌ Erro ao enviar mensagem');
    }
  } catch (error) {
    console.error('❌ Erro na requisição:', error);
  }
}

testZAPI();
