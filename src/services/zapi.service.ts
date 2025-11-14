async function getGroupIdByName(groupId: string): Promise<string> {
  const instanceId = process.env.ZAPI_INSTANCE_ID;
  const token = process.env.ZAPI_TOKEN;
  const clientToken = process.env.ZAPI_CLIENT_TOKEN;

  // Se já está no formato correto (números-group), retorna
  if (/^\d+-group$/.test(groupId)) {
    return groupId;
  }

  // Buscar lista de grupos para encontrar o ID correto
  try {
    const chatsUrl = `https://api.z-api.io/instances/${instanceId}/token/${token}/chats`;
    const response = await fetch(chatsUrl, {
      headers: {
        'Content-Type': 'application/json',
        'Client-Token': clientToken!,
      },
    });

    if (response.ok) {
      const chats = await response.json() as any[];
      const group = chats.find((chat: any) =>
        chat.isGroup &&
        (chat.phone === groupId ||
         chat.phone === `${groupId}-group` ||
         chat.name?.toLowerCase().includes(groupId.toLowerCase()))
      );

      if (group) {
        console.log(`Grupo encontrado: ${group.name} (${group.phone})`);
        return group.phone;
      }
    }
  } catch (error) {
    console.warn('Erro ao buscar grupos, usando ID fornecido:', error);
  }

  // Fallback: tentar formato padrão
  return groupId.includes('-group') ? groupId : `${groupId}-group`;
}

export async function sendSummaryLink(shortMessage: string, summaryUrl: string, groupId: string): Promise<void> {
  const instanceId = process.env.ZAPI_INSTANCE_ID;
  const token = process.env.ZAPI_TOKEN;
  const clientToken = process.env.ZAPI_CLIENT_TOKEN;

  if (!instanceId || !token || !clientToken || !groupId) {
    console.warn('Z-API não está completamente configurado. Mensagem não enviada.');
    return;
  }

  // Buscar ID correto do grupo
  const phoneNumber = await getGroupIdByName(groupId);

  const apiUrl = `https://api.z-api.io/instances/${instanceId}/token/${token}/send-text`;
  const message = `${shortMessage}\n\n🔗 ${summaryUrl}`;

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Client-Token': clientToken,
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

  console.log(`Mensagem enviada ao grupo ${groupId} (${phoneNumber}) via Z-API. Response: ${responseData}`);
}
