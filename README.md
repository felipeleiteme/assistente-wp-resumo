# Repórter Clandestino (V1.5)

Sistema passivo de resumo de mensagens WhatsApp usando Vercel Functions, Supabase e Qwen.

**V1.5:** Suporte a múltiplos grupos do WhatsApp.

## Stack

- **Runtime:** Vercel Functions (TypeScript)
- **Database:** Supabase (PostgreSQL)
- **WhatsApp:** Z-API
- **LLM:** Qwen
- **Notificações:** Resend (Email) + MS Teams (Webhook)

## Estrutura

```
/api
  /webhooks
    receiver.ts         # Endpoint para receber webhooks do Z-API
  /cron
    summarize.ts        # Endpoint do cron job (20:00 UTC)
/src
  /handlers
    handleWebhook.ts    # Lógica de ingestão de mensagens
    handleSummary.ts    # Lógica de resumo diário
  /services
    supabase.service.ts # CRUD com Supabase
    qwen.service.ts     # Integração com Qwen
    zapi.service.ts     # Envio de mensagens via Z-API
```

## Setup

1. Instalar dependências:
```bash
npm install
```

2. Configurar variáveis de ambiente:
```bash
cp .env.example .env.local
# Editar .env.local com suas credenciais
```

3. Criar tabelas no Supabase:

**messages:**
```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  raw_data JSONB NOT NULL,
  from_number TEXT,
  group_id TEXT,
  text_content TEXT,
  received_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**daily_summaries:**
```sql
CREATE TABLE daily_summaries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  summary_content TEXT NOT NULL,
  summary_date DATE NOT NULL,
  message_count INTEGER NOT NULL,
  group_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

4. Deploy para Vercel:
```bash
vercel --prod
```

5. Configurar webhook do Z-API para apontar para:
```
https://seu-dominio.vercel.app/api/webhooks/receiver
```

## Fluxo V1.5

1. **Ingestão:** Z-API envia webhook → `/api/webhooks/receiver` → salva em `messages`
2. **Resumo (Cron 20:00 UTC):**
   - Aguarda atraso aleatório (1-10 min) para camuflagem
   - Busca todos os `group_id` distintos que enviaram mensagens hoje
   - **Para cada grupo:**
     - Busca mensagens do dia (filtradas por grupo)
     - Gera resumo com Qwen
     - Salva em `daily_summaries` (com `group_id`)
     - Envia resumo completo para Teams + Resend (identificando o grupo)
     - Envia mensagem curta + link para o grupo específico via WhatsApp

## Notas V1.5

- **100% passivo:** sem RAG, sem `@bot`, sem interatividade
- **Multi-grupo:** processa múltiplos grupos em um único cron job
- **Isolamento:** falha em um grupo não afeta outros grupos
- **Camuflagem:** atraso aleatório antes de enviar resumo
- **Segurança:** link público para resumo (sem resumo completo no WhatsApp)
