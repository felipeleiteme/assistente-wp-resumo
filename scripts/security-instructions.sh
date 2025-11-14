#!/bin/bash

echo "🚨 INSTRUÇÕES DE SEGURANÇA APÓS VAZAMENTO DE CREDENCIAIS"
echo "=========================================================="
echo ""

echo "❌ SITUAÇÃO:"
echo "   Suas credenciais reais estuvieron expostas no GitHub público"
echo ""

echo "🔄 AÇÕES OBRIGATÓRIAS (FAÇA AGORA):"
echo ""
echo "1. 🔄 REVOGAR TODAS AS CREDENCIAIS:"
echo "   • Supabase: https://supabase.com → Settings → API → Regenerate Key"
echo "   • Z-API: https://z-api.io → Regenerate Instance Tokens"  
echo "   • Qwen AI: https://dashscope-intl.aliyuncs.com → New API Key"
echo "   • Gladia: https://api.gladia.io → Regenerate Token"
echo "   • MS Teams: Recreate Webhook"
echo ""

echo "2. ⚙️ CONFIGURAR AMBIENTE LOCAL CORRETAMENTE:"
echo "   O arquivo .env.local está configurado com placeholders"
echo "   Edite .env.local e coloque SUAS credenciais revogadas"
echo ""

echo "3. ✅ VERIFICAR CONFIGURAÇÃO:"
echo "   npm run verify-credentials"
echo ""

echo "4. 🧪 TESTAR RELATÓRIO REAL:"
echo "   npm run test-daily-summary"
echo ""

echo "⚠️ IMPORTANTE:"
echo "   • .env.local NUNCA deve ir para o Git (está no .gitignore)"
echo "   • .env.real.example deve sempre ter placeholders"
echo "   • Use novas credenciais (revogadas) para não ter acesso público"
echo ""

echo "📋 COMANDOS PARA TESTE:"
echo "   npx tsx scripts/verify-credentials.ts"
echo "   npx tsx scripts/test-daily-summary.ts"
echo ""