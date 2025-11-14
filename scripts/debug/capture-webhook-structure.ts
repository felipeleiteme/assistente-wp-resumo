// Script para capturar e analisar a estrutura real dos webhooks da Z-API
// Use este script para entender como os áudios estão sendo enviados

import express from 'express';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware para parse de JSON
app.use(express.json({ limit: '50mb' }));
app.use(express.raw({ type: 'application/octet-stream', limit: '50mb' }));

// Endpoint para capturar webhooks
app.post('/capture', (req, res) => {
  console.log('\n' + '='.repeat(80));
  console.log('📨 NOVO WEBHOOK CAPTURADO');
  console.log('⏰ Timestamp:', new Date().toISOString());
  console.log('🔒 Headers:', JSON.stringify(req.headers, null, 2));
  console.log('📦 Body completo:', JSON.stringify(req.body, null, 2));
  
  // Análise específica
  const body = req.body;
  const analysis = analyzeStructure(body);
  
  console.log('\n🔍 ANÁLISE DA ESTRUTURA:');
  console.log('Tipo detectado:', analysis.detectedType);
  console.log('Tem áudio?', analysis.hasAudio);
  console.log('Campos de áudio encontrados:', analysis.audioFields);
  console.log('Todos os campos:', analysis.allFields);
  
  if (analysis.hasAudio) {
    console.log('\n🎵 INFORMAÇÕES DO ÁUDIO:');
    console.log('URL encontrada:', analysis.audioUrl);
    console.log('Tipo:', analysis.audioType);
    console.log('Mime Type:', analysis.mimeType);
  }
  
  console.log('='.repeat(80));
  
  res.status(200).json({ 
    success: true, 
    message: 'Webhook capturado e analisado',
    analysis 
  });
});

function analyzeStructure(data: any): any {
  const analysis = {
    detectedType: 'unknown',
    hasAudio: false,
    audioFields: [] as string[],
    audioUrl: null,
    audioType: null,
    mimeType: null,
    allFields: [] as string[],
    timestamp: null,
    from: null,
    groupId: null
  };

  if (!data) return analysis;

  // Extrair informações básicas
  analysis.timestamp = data.timestamp || data.moment || data.time || Date.now();
  analysis.from = data.from || data.participantPhone || data.author || data.phone || null;
  analysis.groupId = data.phone || data.chatId || data.chat?.id || data.instanceId || null;

  // Detectar tipo de mensagem
  const typeFields = [
    data.type,
    data.messageType,
    data.mediaType,
    data.typeMessage,
    data.message?.type,
    data.media?.type,
    data.payload?.type
  ].filter(Boolean);

  analysis.detectedType = typeFields[0] || 'text';

  // Varredura completa de campos
  function scanFields(obj: any, path = ''): void {
    if (typeof obj !== 'object' || obj === null) return;

    for (const [key, value] of Object.entries(obj)) {
      const currentPath = path ? `${path}.${key}` : key;
      analysis.allFields.push(currentPath);

      // Detectar campos de áudio
      const keyLower = key.toLowerCase();
      if (['audio', 'voice', 'ptt', 'sound', 'media'].some(term => keyLower.includes(term))) {
        analysis.audioFields.push(`${currentPath} = ${typeof value === 'string' && value.length > 50 ? value.substring(0, 50) + '...' : value}`);
        
        // Se for URL de áudio
        if (typeof value === 'string' && (value.includes('http') || value.includes('base64'))) {
          analysis.hasAudio = true;
          analysis.audioUrl = value;
          analysis.audioType = key;
        }
      }

      // Recursão
      if (typeof value === 'object' && !Array.isArray(value) && value !== null) {
        scanFields(value, currentPath);
      }
    }
  }

  scanFields(data);

  // Detectar MIME type
  const mimeFields = [
    data.mimetype,
    data.mimeType,
    data.media?.mimetype,
    data.message?.mimetype,
    data.payload?.mimetype
  ].filter(Boolean);

  if (mimeFields.length > 0) {
    analysis.mimeType = mimeFields[0];
  }

  // Verificar se é áudio pelo tipo
  if (['audio', 'voice', 'ptt', 'voicenote', 'voice_note'].includes(analysis.detectedType.toLowerCase())) {
    analysis.hasAudio = true;
  }

  return analysis;
}

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🎯 Capturador de webhooks rodando em http://localhost:${PORT}`);
  console.log(`📍 Endpoint: POST http://localhost:${PORT}/capture`);
  console.log('💡 Configure este URL no Z-API para capturar a estrutura real dos webhooks');
  console.log('📝 Após capturar um áudio real, copie a estrutura e me envie para atualizar o código');
});