# 📱 Sistema de Resumo WhatsApp - Projeto Organizado

## 🏗️ **ESTRUTURA DO PROJETO**

```
📁 Assistente-WP-resumo/
├── 📄 package.json                    # Configuração do projeto Node.js
├── 📄 README.md                       # Este arquivo
├── 📁 api/                            # Vercel Serverless Functions
│   ├── 📁 cron/                       # Jobs automatizados
│   ├── 📁 webhooks/                   # Webhooks do Z-API
│   ├── 📁 debug/                      # Endpoints de debug
│   ├── resumo.ts                      # Página web do resumo diário
│   └── relatorio-semanal.ts           # Página web do relatório semanal
├── 📁 src/                           # Código fonte principal
│   ├── 📁 handlers/                   # Handlers das operações
│   └── 📁 services/                   # Serviços externos
├── 📁 tests/                          # Scripts de teste organizados
│   ├── 📁 integration/               # Testes de integração
│   ├── 📁 unit/                      # Testes unitários
│   └── 📁 performance/               # Testes de performance
├── 📁 scripts/                        # Scripts utilitários organizados
│   ├── 📁 generate/                  # Scripts de geração
│   ├── 📁 debug/                     # Scripts de debug
│   ├── 📁 database/                  # Scripts de banco
│   ├── 📁 notifications/             # Scripts de notificação
│   └── security-instructions.sh      # Instruções de segurança
├── 📁 docs/                          # Documentação organizada
├── 📁 reports/                       # Relatórios gerados
├── 📁 config/                        # Arquivos de configuração
├── 📁 templates/                     # Templates e exemplos
├── 📁 .github/                       # GitHub Actions
└── 📁 node_modules/                  # Dependências (auto-gerado)
```

## 🚀 **COMANDOS PRINCIPAIS**

### **🧪 Testes**
```bash
# Teste completo do sistema
npx tsx tests/integration/test-daily-summary.ts

# Verificar credenciais
npx tsx tests/unit/verify-credentials.ts

# Teste de webhook local
npx tsx tests/integration/test-webhook-local.ts
```

### **📊 Geração de Relatórios**
```bash
# Gerar relatório real do Carbon Capital
npx tsx scripts/generate/carbon-capital-report.ts

# Gerar relatório semanal
npx tsx scripts/generate/generate-weekly-report.ts

# Forçar notificação Teams
npx tsx scripts/notifications/force-teams-notification.ts
```

### **🔧 Manutenção**
```bash
# Limpar banco de dados
npx tsx scripts/database/clear-database.ts

# Verificar performance
npx tsx tests/performance/check-latest-messages.ts

# Ver instruções de segurança
bash scripts/security-instructions.sh
```

## 📋 **FUNCIONALIDADES PRINCIPAIS**

### ✅ **Sistema de Monitoramento**
- 📱 **Webhook Z-API**: Recebe mensagens WhatsApp em tempo real
- 🗄️ **Supabase**: Armazena e processa dados
- 🤖 **Qwen AI**: Gera resumos inteligentes
- 🔊 **Gladia**: Transcrição de áudios

### ✅ **Automação Completa**
- 📅 **Resumo diário**: 19:00 BRT (GitHub Actions)
- 📊 **Relatório semanal**: Segunda 06:00 BRT (GitHub Actions)
- 🔔 **MS Teams**: Notificações automáticas
- 🧹 **Limpeza**: Remove mensagens > 7 dias

### ✅ **Interface Web**
- 📄 **Páginas responsivas**: Design profissional
- 🔗 **Links únicos**: Cada relatório com ID próprio
- 📱 **Mobile-friendly**: Funciona em qualquer dispositivo

## 🔐 **CONFIGURAÇÃO**

### **1. Variáveis de Ambiente**
```bash
# Copie template
cp config/.env.example config/.env.local

# Edite com suas credenciais
nano config/.env.local
```

### **2. Executar Testes**
```bash
# Verificar se tudo está funcionando
npm install
npx tsx tests/unit/verify-credentials.ts
```

## 🎯 **STATUS ATUAL**

- ✅ **Sistema operacional**: 100% funcional
- 📊 **Dados processados**: 108 mensagens de 8 grupos
- 🔗 **Relatórios disponíveis**: 10 resumos salvos
- 📱 **Grupos monitorados**: Carbon Capital, Onboarding, Teste Bot, etc.
- ⏰ **Próxima execução**: Hoje às 19:00 BRT

## 📞 **SUPORTE**

Para dúvidas sobre o sistema organizado:
- 📖 **Documentação**: `docs/README.md`
- 🧪 **Testes**: `tests/`
- 🔧 **Scripts**: `scripts/`
- 📊 **Relatórios**: `reports/`
