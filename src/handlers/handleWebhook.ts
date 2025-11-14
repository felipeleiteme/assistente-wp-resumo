import { VercelRequest } from '@vercel/node';
import { saveMessage } from '../services/supabase.service';

export async function handleWebhook(req: VercelRequest): Promise<void> {
  // 1. Validar Z-API (se houver segredo)
  const zapiSecret = process.env.ZAPI_SECRET;
  if (zapiSecret) {
    const providedSecret = req.headers['x-zapi-secret'];
    if (providedSecret !== zapiSecret) {
      throw new Error('Invalid Z-API secret');
    }
  }

  // 2. Extrair dados da mensagem
  const messageData = req.body;

  if (!messageData) {
    throw new Error('No message data provided');
  }

  // 3. Extrair informações da mensagem (suporta múltiplos formatos do Z-API)
  const groupId = messageData.phone || messageData.chatId || messageData.chat?.id || messageData.instanceId || null;
  const fromNumber = messageData.from || messageData.participantPhone || messageData.author || null;
  const textContent = messageData.text?.message || messageData.body || messageData.content || null;

  // Converter timestamp (Z-API envia em milissegundos)
  let timestamp: string;
  if (messageData.momment || messageData.timestamp) {
    const ts = messageData.momment || messageData.timestamp;
    // Se for número (milissegundos), converter para ISO string
    timestamp = typeof ts === 'number' ? new Date(ts).toISOString() : ts;
  } else {
    timestamp = new Date().toISOString();
  }

  console.log('[Webhook] Mensagem recebida:', {
    groupId,
    fromNumber,
    textPreview: textContent?.substring(0, 50),
    timestamp
  });

  // 4. Salvar mensagem crua no Supabase
  await saveMessage({
    raw_data: messageData,
    from: fromNumber,
    group_id: groupId,
    text: textContent,
    timestamp: timestamp,
  });

  console.log('[Webhook] Mensagem salva com sucesso');
}
