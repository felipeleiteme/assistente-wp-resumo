export async function sendSummaryLink(shortMessage: string, summaryUrl: string, groupId: string): Promise<void> {
  const instanceId = process.env.ZAPI_INSTANCE_ID;
  const token = process.env.ZAPI_TOKEN;

  if (!instanceId || !token || !groupId) {
    console.warn('Z-API não está completamente configurado. Mensagem não enviada.');
    return;
  }

  const apiUrl = `https://api.z-api.io/instances/${instanceId}/token/${token}/send-text`;

  const message = `${shortMessage}\n\n🔗 ${summaryUrl}`;

  // Converter formato do grupo se necessário
  // Formato esperado: 5511888888888-group ou 5511888888888@g.us
  let phoneNumber = groupId;
  if (groupId.includes('-group')) {
    phoneNumber = groupId.replace('-group', '@g.us');
  } else if (!groupId.includes('@g.us')) {
    // Se for só o número, adicionar @g.us para grupos
    phoneNumber = `${groupId}@g.us`;
  }

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      phone: phoneNumber,
      message: message,
    }),
  });

  const responseData = await response.text();

  if (!response.ok) {
    console.error('Z-API Response:', responseData);
    throw new Error(`Erro ao enviar mensagem via Z-API: ${response.statusText} - ${responseData}`);
  }

  console.log(`Mensagem enviada ao grupo ${groupId} via Z-API. Response: ${responseData}`);
}
