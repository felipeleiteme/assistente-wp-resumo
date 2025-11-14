import { setTimeout as delay } from 'timers/promises';

interface GladiaJobResponse {
  id?: string;
  result_id?: string;
  transcription_id?: string;
  task_id?: string;
  status?: string;
  result?: any;
  error?: string;
  message?: string;
}

const DEFAULT_API_URL = 'https://api.gladia.io/v2/transcription';

function getApiConfig() {
  const apiKey = process.env.GLADIA_API_KEY;
  if (!apiKey) {
    throw new Error('GLADIA_API_KEY não está configurada.');
  }

  return {
    apiKey,
    baseUrl: process.env.GLADIA_API_URL || DEFAULT_API_URL,
    pollInterval: Number(process.env.GLADIA_POLL_INTERVAL_MS || 2000),
    timeout: Number(process.env.GLADIA_POLL_TIMEOUT_MS || 60000),
    language: process.env.GLADIA_DEFAULT_LANGUAGE || 'pt',
  };
}

function extractTranscript(payload: any): string | null {
  if (!payload) {
    return null;
  }

  if (typeof payload === 'string') {
    return payload;
  }

  // NOVO: Formato que a Gladia está retornando
  if (payload.transcription?.full_transcript) {
    return payload.transcription.full_transcript;
  }

  if (payload.transcription?.full_text) {
    return payload.transcription.full_text;
  }

  if (payload.result?.transcription?.full_text) {
    return payload.result.transcription.full_text;
  }

  // NOVO: Se tiver utterances, juntar todos os textos
  if (Array.isArray(payload.transcription?.utterances)) {
    return payload.transcription.utterances.map((utterance: any) => utterance.text).join(' ').trim();
  }

  if (Array.isArray(payload.transcription?.segments)) {
    return payload.transcription.segments.map((segment: any) => segment.text).join(' ').trim();
  }

  if (typeof payload.text === 'string') {
    return payload.text;
  }

  if (payload.result?.text) {
    return payload.result.text;
  }

  return null;
}

async function enqueueTranscription(audioUrl: string, language?: string): Promise<string> {
  const { apiKey, baseUrl } = getApiConfig();

  const response = await fetch(baseUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-gladia-key': apiKey,
      Accept: 'application/json',
    },
    body: JSON.stringify({
      audio_url: audioUrl,
      language,
      // Apenas parâmetros essenciais
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Erro ao iniciar transcrição Gladia: ${response.status} ${errorText}`);
  }

  const json = (await response.json()) as GladiaJobResponse;
  const jobId = json.id || json.result_id || json.transcription_id || json.task_id;

  if (!jobId) {
    throw new Error('Resposta da Gladia não contém ID da transcrição.');
  }

  return jobId;
}

async function pollTranscription(jobId: string): Promise<any> {
  const { apiKey, baseUrl, pollInterval, timeout } = getApiConfig();
  const deadline = Date.now() + timeout;

  while (Date.now() < deadline) {
    const response = await fetch(`${baseUrl}/${jobId}`, {
      method: 'GET',
      headers: {
        'x-gladia-key': apiKey,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erro ao consultar transcrição Gladia: ${response.status} ${errorText}`);
    }

    const payload = (await response.json()) as GladiaJobResponse;
    const status = (payload.status || payload.result?.status || '').toLowerCase();

    if (status === 'done' || status === 'finished' || status === 'completed') {
      return payload.result || payload;
    }

    if (status === 'error' || status === 'failed') {
      throw new Error(payload.error || payload.message || 'Transcrição falhou na Gladia');
    }

    await delay(pollInterval);
  }

  throw new Error('Tempo excedido aguardando transcrição da Gladia.');
}

export async function transcribeAudioFromUrl(audioUrl: string, languageHint?: string): Promise<string | null> {
  if (!audioUrl) {
    return null;
  }

  const { language } = getApiConfig();

  console.log('[Gladia] Iniciando transcrição:', {
    audioUrl: audioUrl.substring(0, 50) + '...',
    language: languageHint || language,
    audioUrlLength: audioUrl.length
  });

  try {
    const jobId = await enqueueTranscription(audioUrl, languageHint || language);
    console.log('[Gladia] Job criado:', jobId);
    
    const result = await pollTranscription(jobId);
    console.log('[Gladia] Resultado da transcrição:', JSON.stringify(result, null, 2));
    
    const transcript = extractTranscript(result);
    console.log('[Gladia] Transcrição extraída:', transcript);

    return transcript?.trim() || null;
  } catch (error) {
    console.error('[Gladia] Erro completo na transcrição:', error);
    throw error;
  }
}
