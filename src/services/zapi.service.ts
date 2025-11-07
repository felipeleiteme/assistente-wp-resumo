export async function sendSummaryLink(shortMessage: string, summaryUrl: string): Promise<void> {
  const instanceId = process.env.ZAPI_INSTANCE_ID;
  const token = process.env.ZAPI_TOKEN;
  const groupId = process.env.ZAPI_GROUP_ID;

  if (!instanceId || !token || !groupId) {
    console.warn('Z-API não está completamente configurado. Mensagem não enviada.');
    return;
  }

  const apiUrl = `https://api.z-api.io/instances/${instanceId}/token/${token}/send-text`;

  const message = `${shortMessage}\n\n🔗 ${summaryUrl}`;

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

  if (!response.ok) {
    throw new Error(`Erro ao enviar mensagem via Z-API: ${response.statusText}`);
  }

  console.log('Mensagem enviada ao grupo via Z-API.');
}
