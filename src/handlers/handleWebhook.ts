import { VercelRequest } from '@vercel/node';
import { transcribeAudioFromUrl } from '../services/gladia.service';
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

  // LOG TEMPORÁRIO: Para debug da estrutura Z-API
  console.log('[Webhook] Payload bruto recebido:', JSON.stringify(messageData, null, 2));

  // 3. Extrair informações da mensagem (suporta múltiplos formatos do Z-API)
  const groupId = messageData.phone || messageData.chatId || messageData.chat?.id || messageData.instanceId || null;
  const groupName = messageData.chatName || messageData.chat?.name || null;
  const fromNumber = messageData.from || messageData.participantPhone || messageData.author || null;
  const fromName = messageData.fromName || messageData.senderName || messageData.notifyName || messageData.pushName || null;
  let textContent = messageData.text?.message || messageData.body || messageData.content || null;
  
  // NOVO: Log da estrutura do áudio se existir
  if (messageData.audio) {
    console.log('[Webhook] Áudio detectado na estrutura:', JSON.stringify(messageData.audio, null, 2));
  }
  
  const audioInfo = extractAudioInfo(messageData);

  // Converter timestamp (Z-API envia em milissegundos)
  let timestamp: string;
  if (messageData.momment || messageData.timestamp) {
    const ts = messageData.momment || messageData.timestamp;
    // Se for número (milissegundos), converter para ISO string
    timestamp = typeof ts === 'number' ? new Date(ts).toISOString() : ts;
  } else {
    timestamp = new Date().toISOString();
  }

  if (audioInfo) {
    try {
      console.log('[Webhook] Áudio detectado. Iniciando transcrição com Gladia...', {
        type: audioInfo.type,
        mimeType: audioInfo.mimeType,
      });
      const transcription = await transcribeAudioFromUrl(audioInfo.url, audioInfo.language);
      if (transcription) {
        if (textContent && textContent.trim().length > 0) {
          textContent = `${textContent}\n\nÁudio transcrito: ${transcription}`;
        } else {
          textContent = `Áudio transcrito: ${transcription}`;
        }
        console.log('[Webhook] Transcrição concluída.');
      } else {
        if (!textContent || textContent.trim().length === 0) {
          textContent = 'Áudio recebido (sem transcrição disponível).';
        }
        console.warn('[Webhook] Transcrição vazia retornada pela Gladia.');
      }
    } catch (error) {
      textContent = textContent || 'Áudio recebido (falha de transcrição).';
      console.error('[Webhook] Falha na transcrição de áudio:', error);
    }
  }

  console.log('[Webhook] Mensagem recebida:', {
    groupId,
    fromNumber,
    fromName,
    textPreview: textContent?.substring(0, 50),
    timestamp,
    isAudio: Boolean(audioInfo),
  });

  // 4. Salvar mensagem crua no Supabase
  await saveMessage({
    raw_data: messageData,
    from: fromNumber,
    from_name: fromName,
    group_id: groupId,
    group_name: groupName,
    text: textContent,
    timestamp: timestamp,
  });

  console.log('[Webhook] Mensagem salva com sucesso');
}

interface AudioInfo {
  url: string;
  type?: string;
  mimeType?: string;
  language?: string;
}

function extractAudioInfo(messageData: any): AudioInfo | null {
  // NOVO: Log para debug da estrutura
  console.log('[Webhook] Analisando campos de áudio no payload...');
  
  // ===== ESTRUTURA REAL DA Z-API (detectada no log) =====
  // O áudio vem em messageData.audio { ptt: true, audioUrl: "...", mimeType: "..." }
  if (messageData.audio && typeof messageData.audio === 'object') {
    const audioData = messageData.audio;
    
    console.log('[Webhook] Áudio detectado na estrutura Z-API:', {
      hasPtt: audioData.ptt,
      hasAudioUrl: !!audioData.audioUrl,
      seconds: audioData.seconds,
      mimeType: audioData.mimeType
    });
    
    if (audioData.audioUrl) {
      return {
        url: audioData.audioUrl,
        type: audioData.ptt ? 'ptt' : 'audio',
        mimeType: audioData.mimeType,
        language: messageData.language || undefined,
      };
    }
  }
  
  // ===== ESTRUTURAS ALTERNATIVAS (backup) =====
  const typeCandidates = [
    messageData.type,
    messageData.messageType,
    messageData.mediaType,
    messageData.typeMessage,
    messageData.message?.type,
    messageData.media?.type,
    messageData.payload?.type,
  ];

  const mimeCandidates = [
    messageData.mimetype,
    messageData.mimeType,
    messageData.media?.mimetype,
    messageData.message?.mimetype,
    messageData.payload?.mimetype,
  ];

  const normalizedType = typeCandidates.find(Boolean)?.toString().toLowerCase();
  const isAudioType = normalizedType
    ? ['audio', 'ptt', 'voice', 'voice_note', 'voicenote', 'ptt_message', 'audio_message'].includes(normalizedType)
    : false;

  // Campos candidatos para URLs de áudio
  const urlCandidates = [
    messageData.audioUrl,
    messageData.audio_url,
    messageData.voiceUrl,
    messageData.voice_url,
    messageData.mediaUrl,
    messageData.media_url,
    messageData.url,
    messageData.fileUrl,
    messageData.file_url,
    messageData.base64,
    messageData.data,
    messageData.message?.audioUrl,
    messageData.message?.mediaUrl,
    messageData.message?.url,
    messageData.message?.fileUrl,
    messageData.message?.base64,
    messageData.media?.url,
    messageData.media?.audioUrl,
    messageData.media?.audio?.url,
    messageData.media?.fileUrl,
    messageData.payload?.audioUrl,
    messageData.payload?.mediaUrl,
    messageData.payload?.url,
    messageData.payload?.fileUrl,
    messageData.body?.audioUrl,
    messageData.body?.url,
  ];

  const audioUrl = urlCandidates.find((value): value is string => 
    typeof value === 'string' && value.length > 0
  );
  
  const mimeType = mimeCandidates.find((value): value is string => 
    typeof value === 'string' && value.length > 0
  );

  // Log detalhado da análise
  console.log('[Webhook] Análise de áudio:', {
    normalizedType,
    isAudioType,
    audioUrlFound: !!audioUrl,
    audioUrlPreview: audioUrl ? (audioUrl.length > 50 ? `${audioUrl.substring(0, 50)}...` : audioUrl) : null,
    mimeType,
    typeCandidates: typeCandidates.filter(Boolean),
    urlCandidatesCount: urlCandidates.filter(Boolean).length
  });

  if (!audioUrl) {
    if (isAudioType || (mimeType && mimeType.startsWith('audio'))) {
      console.warn('[Webhook] Payload indica áudio, mas não há URL para transcrição.');
    }
    return null;
  }

  return {
    url: audioUrl,
    type: normalizedType,
    mimeType,
    language: messageData.language || messageData.messageLanguage || messageData.payload?.language || undefined,
  };
}
