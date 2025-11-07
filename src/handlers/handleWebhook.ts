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

  // 3. Salvar mensagem crua no Supabase
  await saveMessage({
    raw_data: messageData,
    from: messageData.from || messageData.phone || null,
    group_id: messageData.chatId || messageData.instanceId || null,
    text: messageData.text?.message || messageData.body || null,
    timestamp: messageData.momment || messageData.timestamp || new Date().toISOString(),
  });
}
