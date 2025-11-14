import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const instanceId = process.env.ZAPI_INSTANCE_ID;
  const token = process.env.ZAPI_TOKEN;

  if (!instanceId || !token) {
    return res.status(500).json({ error: 'Z-API não configurado' });
  }

  try {
    // Listar todos os chats (grupos e conversas)
    const response = await fetch(
      `https://api.z-api.io/instances/${instanceId}/token/${token}/chats`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    // Filtrar apenas grupos
    const groups = Array.isArray(data)
      ? data.filter((chat: any) => chat.isGroup || chat.id?.includes('@g.us'))
      : [];

    return res.status(200).json({
      success: true,
      totalChats: Array.isArray(data) ? data.length : 0,
      groups: groups.map((group: any) => ({
        id: group.id,
        name: group.name || group.formattedTitle,
        participantsCount: group.participants?.length || 0,
      })),
      raw: data, // Retornar dados completos para debug
    });
  } catch (error) {
    console.error('Error listing chats:', error);
    return res.status(500).json({
      error: 'Erro ao listar chats',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
