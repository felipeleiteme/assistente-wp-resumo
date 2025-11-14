# 📱 Assistente WhatsApp - Resumo Automático

Sistema de resumo automático de conversas WhatsApp com análise semanal, usando Vercel Functions, Supabase e Qwen AI.

## 🚀 Funcionalidades

- ✅ **Webhook Z-API**: Recebe mensagens do WhatsApp em tempo real
- ✅ **Resumo Diário**: Geração automática às 19h (via GitHub Actions)
- ✅ **Relatório Semanal**: Análise completa toda segunda às 6h
- ✅ **Transcrição de Áudios**: Integração automática com Gladia para voice notes
- ✅ **Notificações MS Teams**: Cards interativos com links para resumos
- ✅ **Páginas Web**: Visualização profissional dos resumos
- ✅ **Multi-grupo**: Suporta múltiplos grupos WhatsApp

## 📦 Stack Tecnológica

- **Backend**: Vercel Serverless Functions (TypeScript)
- **Banco de Dados**: Supabase (PostgreSQL)
- **WhatsApp API**: Z-API
- **IA**: Qwen (Alibaba Cloud)
- **Notificações**: MS Teams Webhooks
- **Automação**: GitHub Actions (cron jobs)

## 📁 Estrutura do Projeto

```
├── api/                          # Vercel Serverless Functions
│   ├── webhooks/
│   │   ├── receiver.ts          # Recebe mensagens do Z-API
│   │   └── debug.ts             # Debug de webhooks
│   ├── cron/
│   │   ├── summarize.ts         # Cron job - resumo diário
│   │   └── weekly-report.ts     # Cron job - relatório semanal
│   ├── debug/
│   │   └── list-chats.ts        # Listar chats Z-API
│   ├── resumo.ts                # Página web do resumo diário
│   └── relatorio-semanal.ts     # Página web do relatório semanal
│
├── src/
│   ├── handlers/
│   │   ├── handleWebhook.ts     # Processa webhooks do Z-API
│   │   ├── handleSummary.ts     # Gera resumos diários
│   │   └── handleWeeklyReport.ts # Gera relatórios semanais
│   └── services/
│       ├── supabase.service.ts  # Operações com Supabase
│       ├── qwen.service.ts      # Integração com Qwen AI
│       ├── zapi.service.ts      # Envio via Z-API (desativado)
│       ├── weekly-analysis.service.ts
│       └── supabase-weekly.service.ts
│
├── scripts/                     # Scripts utilitários
│   ├── check-latest-messages.ts # Verificar mensagens recentes
│   ├── clear-database.ts        # Limpar banco de dados
│   ├── test-daily-summary.ts    # Testar resumo diário
│   ├── test-weekly-report.ts    # Testar relatório semanal
│   └── test-webhook-local.ts    # Testar webhook localmente
│
├── docs/                        # Documentação e SQL
│   ├── migration-add-group-name.sql
│   └── supabase-weekly-reports-table.sql
│
├── .github/workflows/           # GitHub Actions
│   └── daily-summary.yml        # Cron job diário (19h BRT)
│
├── .env.example                 # Exemplo de variáveis de ambiente
├── tsconfig.json                # Configuração TypeScript
├── vercel.json                  # Configuração Vercel
└── package.json                 # Dependencies
```

## ⚙️ Setup

### 1. Instalar dependências

```bash
npm install
```

### 2. Configurar variáveis de ambiente

```bash
cp .env.example .env.local
# Editar .env.local com suas credenciais
```

Variáveis necessárias:
- `SUPABASE_URL` e `SUPABASE_ANON_KEY`
- `QWEN_API_KEY` e `QWEN_API_URL`
- `GLADIA_API_KEY` (opcional: `GLADIA_API_URL`, `GLADIA_DEFAULT_LANGUAGE`, `GLADIA_POLL_*`)
- `ZAPI_INSTANCE_ID`, `ZAPI_TOKEN`, `ZAPI_CLIENT_TOKEN`
- `TEAMS_WEBHOOK_URL`
- `CRON_SECRET` (para GitHub Actions)

### 3. Criar tabelas no Supabase

Execute os scripts SQL em `docs/`:

```sql
-- 1. Tabela de mensagens
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  raw_data JSONB NOT NULL,
  from_number TEXT,
  group_id TEXT,
  group_name TEXT,
  text_content TEXT,
  received_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Tabela de resumos diários
CREATE TABLE daily_summaries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  summary_content TEXT NOT NULL,
  summary_date DATE NOT NULL,
  message_count INTEGER NOT NULL,
  group_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Tabela de relatórios semanais
CREATE TABLE weekly_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_content TEXT NOT NULL,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  total_messages INTEGER NOT NULL,
  total_groups INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Índices
CREATE INDEX idx_messages_group_id ON messages(group_id);
CREATE INDEX idx_messages_group_name ON messages(group_name);
CREATE INDEX idx_messages_received_at ON messages(received_at);
```

### 4. Deploy para Vercel

```bash
vercel --prod
```

### 5. Configurar Z-API Webhook

No painel do Z-API, configure o webhook "Ao receber":

```
https://seu-dominio.vercel.app/api/webhooks/receiver
```

### 6. Configurar GitHub Actions

Adicione o secret `CRON_SECRET` no repositório GitHub:
- Settings → Secrets → Actions → New repository secret
- Name: `CRON_SECRET`
- Value: (mesmo valor da variável `CRON_SECRET` do .env)

## 🔄 Fluxo de Funcionamento

### Recebimento de Mensagens
1. Usuário envia mensagem no grupo WhatsApp
2. Z-API dispara webhook → `/api/webhooks/receiver`
3. Mensagens de texto são salvas imediatamente no Supabase
4. Mensagens de áudio têm o link enviado para a Gladia, que transcreve o conteúdo antes de salvar (ou registra um placeholder caso falhe)

### Resumo Diário (19h BRT)
1. GitHub Action dispara cron job
2. Endpoint `/api/cron/summarize` é chamado
3. Para cada grupo ativo:
   - Busca mensagens do dia
   - Gera resumo com Qwen AI
   - Salva no banco de dados
   - Envia notificação para MS Teams com link

### Relatório Semanal (Segunda 6h BRT)
1. GitHub Action dispara cron job semanal
2. Endpoint `/api/cron/weekly-report` é chamado
3. Coleta estatísticas da semana
4. Gera análise com Qwen AI
5. Envia para MS Teams

## 🧪 Scripts de Teste

```bash
# Verificar mensagens recentes
npx tsx scripts/check-latest-messages.ts

# Testar resumo diário
npx tsx tests/integration/test-daily-summary.ts

# Testar relatório semanal
npx tsx tests/integration/test-weekly-report.ts

# Limpar banco de dados
npx tsx scripts/database/clear-database.ts

# Testar webhook localmente
npx tsx tests/integration/test-webhook-local.ts
```

## 📝 Notas

- **Sistema 100% passivo**: Não responde mensagens, apenas observa e resume
- **Privacidade**: Resumos acessíveis apenas via link (não enviados no WhatsApp)
- **Multi-grupo**: Processa múltiplos grupos independentemente
- **Limpeza automática**: Mensagens > 7 dias são deletadas automaticamente

## 🔗 Links Úteis

- [Documentação Z-API](https://developer.z-api.io/)
- [Qwen AI (Alibaba Cloud)](https://www.alibabacloud.com/help/en/model-studio/developer-reference/qwen-api)
- [Supabase Docs](https://supabase.com/docs)
- [Vercel Functions](https://vercel.com/docs/functions)

## 📄 Licença

Uso privado.
