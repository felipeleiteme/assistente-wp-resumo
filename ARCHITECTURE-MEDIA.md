# Arquitetura: Transcrição de Áudios e Análise de Imagens

## 📋 Visão Geral

Sistema para processar mídia (áudios e imagens) recebida via WhatsApp, transcrevendo áudios com **Gladia** e analisando imagens com **Qwen Vision**, integrando esses dados aos resumos diários.

---

## 🏗️ Arquitetura Proposta

### 1. **Fluxo de Dados**

```
WhatsApp (Z-API)
    ↓ webhook
[Webhook Receiver]
    ↓
[Media Type Detector]
    ↓
    ├─→ [Text] → Supabase (como está hoje)
    ├─→ [Audio] → [Audio Processor] → Gladia API → Supabase (transcription)
    └─→ [Image] → [Image Processor] → Qwen Vision → Supabase (description)
    ↓
[Daily Summary Generator]
    ↓
Supabase (daily_summaries) + Notificações
```

---

## 🗄️ Mudanças no Banco de Dados

### Nova Tabela: `media_files`

```sql
CREATE TABLE IF NOT EXISTS media_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES whatsapp_messages(id) ON DELETE CASCADE,

  -- Metadata
  media_type TEXT NOT NULL CHECK (media_type IN ('audio', 'image', 'video', 'document')),
  file_url TEXT NOT NULL,
  mime_type TEXT,
  file_size INTEGER,

  -- Status de processamento
  processing_status TEXT DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
  processed_at TIMESTAMP WITH TIME ZONE,

  -- Conteúdo processado
  transcription TEXT, -- Para áudios
  image_description TEXT, -- Para imagens
  metadata JSONB, -- Dados extras (duração, dimensões, etc)

  -- Controle
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  error_message TEXT
);

CREATE INDEX idx_media_files_message_id ON media_files(message_id);
CREATE INDEX idx_media_files_status ON media_files(processing_status);
CREATE INDEX idx_media_files_type ON media_files(media_type);
```

### Atualizar Tabela: `whatsapp_messages`

```sql
-- Adicionar coluna para indicar se tem mídia
ALTER TABLE whatsapp_messages
ADD COLUMN has_media BOOLEAN DEFAULT FALSE,
ADD COLUMN media_count INTEGER DEFAULT 0;
```

---

## 🔧 Componentes a Implementar

### 2.1 **Media Detector** (`src/services/media-detector.service.ts`)

```typescript
export interface MediaInfo {
  type: 'text' | 'audio' | 'image' | 'video' | 'document';
  url?: string;
  mimeType?: string;
  caption?: string;
}

export function detectMediaType(webhookData: any): MediaInfo {
  // Z-API envia diferentes estruturas para cada tipo de mídia:

  // Audio: webhookData.audio.audioUrl
  if (webhookData.audio) {
    return {
      type: 'audio',
      url: webhookData.audio.audioUrl,
      mimeType: webhookData.audio.mimetype,
      caption: webhookData.text?.message
    };
  }

  // Image: webhookData.image.imageUrl
  if (webhookData.image) {
    return {
      type: 'image',
      url: webhookData.image.imageUrl,
      mimeType: webhookData.image.mimetype,
      caption: webhookData.image.caption
    };
  }

  // Video: webhookData.video.videoUrl
  if (webhookData.video) {
    return {
      type: 'video',
      url: webhookData.video.videoUrl,
      mimeType: webhookData.video.mimetype,
      caption: webhookData.video.caption
    };
  }

  // Document: webhookData.document.documentUrl
  if (webhookData.document) {
    return {
      type: 'document',
      url: webhookData.document.documentUrl,
      mimeType: webhookData.document.mimetype,
      caption: webhookData.document.caption
    };
  }

  // Text only
  return { type: 'text' };
}
```

---

### 2.2 **Gladia Service** (`src/services/gladia.service.ts`)

```typescript
interface GladiaTranscriptionRequest {
  audio_url: string;
  language?: string; // 'pt' para português
  diarization?: boolean; // Identificar diferentes speakers
  callback_url?: string; // Webhook para receber resultado
}

interface GladiaTranscriptionResponse {
  id: string;
  status: 'queued' | 'processing' | 'done' | 'error';
  result?: {
    transcription: {
      full_transcript: string;
      utterances: Array<{
        text: string;
        start: number;
        end: number;
        speaker: number;
      }>;
    };
  };
}

export async function transcribeAudio(audioUrl: string): Promise<string> {
  const gladiaApiKey = process.env.GLADIA_API_KEY;
  const gladiaApiUrl = 'https://api.gladia.io/v2/transcription';

  // 1. Iniciar transcrição (async)
  const response = await fetch(gladiaApiUrl, {
    method: 'POST',
    headers: {
      'x-gladia-key': gladiaApiKey!,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      audio_url: audioUrl,
      language: 'pt',
      diarization: true, // Identificar quem falou
      callback_url: `${process.env.VERCEL_URL}/api/webhooks/gladia-callback`
    } as GladiaTranscriptionRequest),
  });

  const data: GladiaTranscriptionResponse = await response.json();

  if (!response.ok) {
    throw new Error(`Gladia API error: ${data}`);
  }

  return data.id; // Retorna ID para acompanhar
}

export async function getTranscriptionResult(transcriptionId: string): Promise<string | null> {
  const gladiaApiKey = process.env.GLADIA_API_KEY;
  const response = await fetch(
    `https://api.gladia.io/v2/transcription/${transcriptionId}`,
    {
      headers: { 'x-gladia-key': gladiaApiKey! }
    }
  );

  const data: GladiaTranscriptionResponse = await response.json();

  if (data.status === 'done' && data.result) {
    return data.result.transcription.full_transcript;
  }

  if (data.status === 'error') {
    throw new Error('Transcription failed');
  }

  return null; // Ainda processando
}
```

---

### 2.3 **Qwen Vision Service** (`src/services/qwen-vision.service.ts`)

```typescript
interface QwenVisionRequest {
  model: 'qwen-vl-max' | 'qwen-vl-plus';
  messages: Array<{
    role: 'user';
    content: Array<{
      type: 'text' | 'image_url';
      text?: string;
      image_url?: { url: string };
    }>;
  }>;
}

export async function analyzeImage(imageUrl: string, question?: string): Promise<string> {
  const qwenApiKey = process.env.QWEN_API_KEY;
  const qwenApiUrl = process.env.QWEN_API_URL ||
    'https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions';

  const prompt = question ||
    'Descreva esta imagem em detalhes, focando em: texto visível, pessoas, objetos importantes, contexto e informações relevantes para um resumo executivo.';

  const response = await fetch(qwenApiUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${qwenApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'qwen-vl-plus', // ou 'qwen-vl-max' para maior precisão
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: imageUrl } }
        ]
      }],
      temperature: 0.7,
      max_tokens: 500
    } as QwenVisionRequest),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`Qwen Vision API error: ${JSON.stringify(data)}`);
  }

  return data.choices[0].message.content;
}
```

---

### 2.4 **Media Processor** (`src/services/media-processor.service.ts`)

```typescript
import { saveMediaFile, updateMediaFile } from './supabase-media.service';
import { transcribeAudio } from './gladia.service';
import { analyzeImage } from './qwen-vision.service';

export async function processAudio(
  messageId: string,
  audioUrl: string,
  mimeType?: string
): Promise<void> {
  // 1. Salvar registro inicial
  const mediaRecord = await saveMediaFile({
    message_id: messageId,
    media_type: 'audio',
    file_url: audioUrl,
    mime_type: mimeType,
    processing_status: 'pending'
  });

  try {
    // 2. Marcar como processando
    await updateMediaFile(mediaRecord.id, { processing_status: 'processing' });

    // 3. Enviar para Gladia (retorna ID da transcrição)
    const transcriptionId = await transcribeAudio(audioUrl);

    // 4. Salvar ID para acompanhar (webhook irá atualizar quando completar)
    await updateMediaFile(mediaRecord.id, {
      metadata: { gladia_transcription_id: transcriptionId }
    });

    console.log(`Áudio enviado para transcrição: ${transcriptionId}`);

  } catch (error) {
    await updateMediaFile(mediaRecord.id, {
      processing_status: 'failed',
      error_message: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
}

export async function processImage(
  messageId: string,
  imageUrl: string,
  caption?: string,
  mimeType?: string
): Promise<void> {
  const mediaRecord = await saveMediaFile({
    message_id: messageId,
    media_type: 'image',
    file_url: imageUrl,
    mime_type: mimeType,
    processing_status: 'pending'
  });

  try {
    await updateMediaFile(mediaRecord.id, { processing_status: 'processing' });

    // Analisar imagem com Qwen Vision
    const description = await analyzeImage(imageUrl, caption);

    await updateMediaFile(mediaRecord.id, {
      processing_status: 'completed',
      image_description: description,
      processed_at: new Date().toISOString()
    });

    console.log(`Imagem analisada: ${description.substring(0, 100)}...`);

  } catch (error) {
    await updateMediaFile(mediaRecord.id, {
      processing_status: 'failed',
      error_message: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
}
```

---

### 2.5 **Webhook Handler Atualizado** (`src/handlers/handleWebhook.ts`)

```typescript
import { saveMessage } from '../services/supabase.service';
import { detectMediaType } from '../services/media-detector.service';
import { processAudio, processImage } from '../services/media-processor.service';

export async function handleWebhook(req: VercelRequest): Promise<void> {
  const zapiSecret = process.env.ZAPI_SECRET;
  if (zapiSecret) {
    const providedSecret = req.headers['x-zapi-secret'];
    if (providedSecret !== zapiSecret) {
      throw new Error('Invalid Z-API secret');
    }
  }

  const messageData = req.body;

  if (!messageData) {
    throw new Error('No message data provided');
  }

  // Detectar tipo de mídia
  const mediaInfo = detectMediaType(messageData);

  // Salvar mensagem no banco
  const savedMessage = await saveMessage({
    raw_data: messageData,
    from: messageData.from || messageData.phone || null,
    group_id: messageData.chatId || messageData.instanceId || null,
    text: mediaInfo.caption || messageData.text?.message || messageData.body || null,
    timestamp: messageData.momment || messageData.timestamp || new Date().toISOString(),
    has_media: mediaInfo.type !== 'text',
    media_count: mediaInfo.type !== 'text' ? 1 : 0
  });

  // Processar mídia assincronamente (não bloqueia webhook)
  if (mediaInfo.type === 'audio' && mediaInfo.url) {
    processAudio(savedMessage.id, mediaInfo.url, mediaInfo.mimeType)
      .catch(err => console.error('Erro ao processar áudio:', err));
  }

  if (mediaInfo.type === 'image' && mediaInfo.url) {
    processImage(savedMessage.id, mediaInfo.url, mediaInfo.caption, mediaInfo.mimeType)
      .catch(err => console.error('Erro ao processar imagem:', err));
  }
}
```

---

### 2.6 **Gladia Callback Handler** (`api/webhooks/gladia-callback.ts`)

```typescript
import { VercelRequest, VercelResponse } from '@vercel/node';
import { updateMediaFileByGladiaId } from '../../src/services/supabase-media.service';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { id, status, result } = req.body;

    if (status === 'done' && result?.transcription) {
      // Atualizar registro com transcrição completa
      await updateMediaFileByGladiaId(id, {
        processing_status: 'completed',
        transcription: result.transcription.full_transcript,
        processed_at: new Date().toISOString(),
        metadata: {
          gladia_transcription_id: id,
          utterances: result.transcription.utterances
        }
      });

      console.log(`Transcrição recebida para ${id}`);
    }

    if (status === 'error') {
      await updateMediaFileByGladiaId(id, {
        processing_status: 'failed',
        error_message: 'Gladia transcription failed'
      });
    }

    return res.status(200).json({ success: true });

  } catch (error) {
    console.error('Gladia callback error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
```

---

### 2.7 **Summary Generator Atualizado** (`src/handlers/handleSummary.ts`)

```typescript
import { getDailyMessages, getDailyMediaFiles } from '../services/supabase.service';

export async function handleSummary(): Promise<void> {
  const groupIds = await getDistinctGroupIdsToday();

  for (const groupId of groupIds) {
    const messages = await getDailyMessages(groupId);
    const mediaFiles = await getDailyMediaFiles(groupId); // NOVO

    // Montar transcript incluindo transcrições e descrições de imagem
    const transcript = messages.map(msg => {
      let line = `[${msg.timestamp}] ${msg.from}: ${msg.text || ''}`;

      // Adicionar transcrições de áudio
      const audioTranscriptions = mediaFiles
        .filter(m => m.message_id === msg.id && m.media_type === 'audio' && m.transcription)
        .map(m => `\n  [Áudio transcrito]: ${m.transcription}`)
        .join('');

      // Adicionar descrições de imagem
      const imageDescriptions = mediaFiles
        .filter(m => m.message_id === msg.id && m.media_type === 'image' && m.image_description)
        .map(m => `\n  [Imagem]: ${m.image_description}`)
        .join('');

      return line + audioTranscriptions + imageDescriptions;
    }).join('\n');

    const summary = await getSummary(transcript);

    // ... resto do código (salvar, notificar, etc)
  }
}
```

---

## 📊 Considerações de Performance

### Processamento Assíncrono
- ✅ **Webhooks não bloqueiam**: Mídia é processada em background
- ✅ **Gladia usa callbacks**: Não precisa fazer polling
- ✅ **Qwen Vision é síncrono**: Mas processamento é rápido (<2s)

### Custos e Limites
- **Gladia**: Verificar plano (free tier geralmente ~30min/mês)
- **Qwen Vision**: Custos por imagem processada
- **Supabase Storage**: Considerar se vai armazenar mídia ou só URLs

### Retry e Error Handling
```typescript
// Implementar retry para falhas temporárias
export async function retryFailedMedia(): Promise<void> {
  const failedMedia = await getFailedMediaFiles();

  for (const media of failedMedia) {
    if (media.media_type === 'audio') {
      await processAudio(media.message_id, media.file_url, media.mime_type);
    }
    if (media.media_type === 'image') {
      await processImage(media.message_id, media.file_url, undefined, media.mime_type);
    }
  }
}
```

---

## 🔐 Variáveis de Ambiente

```env
# Gladia
GLADIA_API_KEY=gsk_xxxxx

# Qwen (já existe)
QWEN_API_KEY=sk-xxxxx
QWEN_API_URL=https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions

# Webhooks
VERCEL_URL=https://assistente-wp-resumo.vercel.app
```

---

## 🚀 Plano de Implementação

### Fase 1: Infraestrutura (1-2 dias)
1. ✅ Criar tabela `media_files`
2. ✅ Criar `supabase-media.service.ts` com CRUD
3. ✅ Implementar `media-detector.service.ts`
4. ✅ Atualizar `handleWebhook.ts` para detectar mídia

### Fase 2: Transcrição de Áudio (2-3 dias)
1. ✅ Implementar `gladia.service.ts`
2. ✅ Criar `api/webhooks/gladia-callback.ts`
3. ✅ Implementar `processAudio()` em `media-processor.service.ts`
4. ✅ Testar com áudios reais do WhatsApp

### Fase 3: Análise de Imagens (1-2 dias)
1. ✅ Implementar `qwen-vision.service.ts`
2. ✅ Implementar `processImage()` em `media-processor.service.ts`
3. ✅ Testar com imagens do WhatsApp

### Fase 4: Integração com Resumos (2 dias)
1. ✅ Atualizar `handleSummary.ts` para incluir mídia processada
2. ✅ Ajustar prompts do Qwen para contexto rico
3. ✅ Melhorar visualização de resumos com ícones de mídia

### Fase 5: Monitoramento e Refinamento (contínuo)
1. ✅ Adicionar logs detalhados
2. ✅ Criar dashboard de status de processamento
3. ✅ Implementar retry automático para falhas
4. ✅ Otimizar custos (cache, compressão, etc)

---

## 📝 Exemplo de Resumo Final

```markdown
## Resumo Diário - Grupo Marketing (14/11/2025)

### 💬 Mensagens de Texto (15)
- João sugeriu nova campanha para Black Friday
- Maria enviou planilha de resultados Q3
- Pedro confirmou reunião às 14h

### 🎤 Áudios Transcritos (3)
1. **João (09:15)**: "Pessoal, tive uma ideia genial. E se a gente fizesse uma promoção relâmpago de 2 horas? Já testamos isso antes e deu super certo."

2. **Maria (10:30)**: "Concordo com o João, mas precisa ser bem planejado. Vou preparar um cronograma e mando aqui depois do almoço."

3. **Pedro (11:45)**: "Atenção time! A reunião de hoje foi antecipada para 14h na sala 3. Confirmem presença, por favor."

### 🖼️ Imagens Analisadas (2)
1. **Gráfico de Vendas**: Dashboard mostrando crescimento de 23% nas vendas online, com destaque para categoria "Eletrônicos". Período: Out/2025.

2. **Mockup da Campanha**: Arte promocional com logo da empresa, texto "Black Friday 50% OFF" em vermelho, fundo escuro, call-to-action "Aproveite Agora".

### 📌 Principais Decisões
- Aprovar campanha relâmpago de 2h
- Reunião antecipada para 14h
- Maria responsável pelo cronograma

### ⚡ Ações Necessárias
- [ ] Maria: Enviar cronograma até 13h
- [ ] João: Validar arte final da campanha
- [ ] Pedro: Reservar sala 3 para reunião
```

---

## 🎯 Benefícios da Arquitetura

✅ **Escalável**: Processa mídia em background sem bloquear webhooks
✅ **Confiável**: Callbacks + retry automático para falhas
✅ **Rico em Contexto**: Resumos incluem tudo (texto + áudio + imagem)
✅ **Observável**: Status de processamento rastreável no banco
✅ **Econômico**: Processa apenas quando necessário

---

## ❓ Próximos Passos

1. Você quer que eu **implemente toda a arquitetura** ou prefere começar por uma fase específica?
2. Você já tem conta na **Gladia**? Preciso da API key para testar
3. Quer que eu adicione **suporte a vídeos** também? (seria similar a áudio)
4. Prefere **processar mídia imediatamente** ou ter uma **fila de processamento**?

Estou pronto para começar a implementação! 🚀
