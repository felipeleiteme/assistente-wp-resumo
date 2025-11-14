import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Capturar o payload completo
    const messageData = req.body;
    const headers = req.headers;

    console.log('='.repeat(60));
    console.log('[INSPECT] Nova mensagem recebida para análise');
    console.log('[INSPECT] Headers:', JSON.stringify(headers, null, 2));
    console.log('[INSPECT] Body completo:', JSON.stringify(messageData, null, 2));
    
    // Análise específica para áudio
    const audioAnalysis = analyzeAudioFields(messageData);
    console.log('[INSPECT] Análise de áudio:', audioAnalysis);
    console.log('='.repeat(60));

    return res.status(200).json({ 
      success: true, 
      message: 'Payload inspecionado - ver logs',
      analysis: audioAnalysis
    });
  } catch (error) {
    console.error('[INSPECT] Erro ao processar:', error);
    return res.status(500).json({ 
      error: 'Erro ao inspecionar payload',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

function analyzeAudioFields(data: any): any {
  const analysis: any = {
    hasAudio: false,
    audioType: null,
    audioUrl: null,
    allFields: {},
    audioCandidates: []
  };

  // Varredura completa de todos os campos
  function scanObject(obj: any, path = ''): void {
    if (typeof obj !== 'object' || obj === null) return;

    for (const [key, value] of Object.entries(obj)) {
      const currentPath = path ? `${path}.${key}` : key;
      
      // Registrar todos os campos
      analysis.allFields[currentPath] = {
        type: typeof value,
        value: typeof value === 'string' && value.length > 100 ? `${value.substring(0, 100)}...` : value
      };

      // Procurar candidatos a áudio
      const keyLower = key.toLowerCase();
      const isAudioKey = ['audio', 'voice', 'ptt', 'sound', 'media'].some(term => keyLower.includes(term));
      const isUrlValue = typeof value === 'string' && (value.includes('http') || value.includes('base64'));
      
      if (isAudioKey) {
        analysis.audioCandidates.push({
          path: currentPath,
          key: key,
          value: typeof value === 'string' && value.length > 100 ? `${value.substring(0, 100)}...` : value,
          type: typeof value
        });
      }

      // Recursão para objetos aninhados
      if (typeof value === 'object' && !Array.isArray(value) && value !== null) {
        scanObject(value, currentPath);
      }
    }
  }

  scanObject(data);

  // Análise específica com base nos campos encontrados
  const typeCandidates = [
    data.type,
    data.messageType,
    data.mediaType,
    data.typeMessage,
    data.message?.type,
    data.media?.type
  ].filter(Boolean);

  const urlCandidates = [
    data.audioUrl,
    data.audio_url,
    data.voiceUrl,
    data.voice_url,
    data.mediaUrl,
    data.media_url,
    data.url,
    data.message?.audioUrl,
    data.message?.mediaUrl,
    data.message?.url,
    data.media?.url,
    data.media?.audioUrl,
    data.payload?.audioUrl,
    data.payload?.mediaUrl,
    data.payload?.url,
    data.fileUrl,
    data.file_url,
    data.base64,
    data.data
  ].filter(Boolean);

  analysis.typeCandidates = typeCandidates;
  analysis.urlCandidates = urlCandidates.map(url => 
    typeof url === 'string' && url.length > 100 ? `${url.substring(0, 100)}...` : url
  );

  // Detectar se é áudio
  const isAudioType = typeCandidates.some(type => 
    ['audio', 'voice', 'ptt', 'voicenote', 'voice_note'].includes(type.toString().toLowerCase())
  );

  const hasAudioUrl = urlCandidates.some(url => 
    typeof url === 'string' && (url.includes('http') || url.includes('audio') || url.includes('base64'))
  );

  analysis.hasAudio = isAudioType || hasAudioUrl;
  analysis.audioType = isAudioType ? typeCandidates.find(t => 
    ['audio', 'voice', 'ptt', 'voicenote', 'voice_note'].includes(t.toString().toLowerCase())
  ) : null;
  analysis.audioUrl = hasAudioUrl ? urlCandidates.find(url => 
    typeof url === 'string' && (url.includes('http') || url.includes('audio') || url.includes('base64'))
  ) : null;

  return analysis;
}