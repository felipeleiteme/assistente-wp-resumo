# 📋 NAVEGAÇÃO RÁPIDA - SCRIPTS PRINCIPAIS

## 🧪 **TESTES ESSENCIAIS**
```bash
# Verificar se as credenciais estão configuradas
npx tsx tests/unit/verify-credentials.ts

# Testar geração de resumo diário
npx tsx tests/integration/test-daily-summary.ts

# Testar webhook localmente
npx tsx tests/integration/test-webhook-local.ts

# Verificar performance do sistema
npx tsx tests/performance/check-latest-messages.ts
```

## 📊 **GERAÇÃO DE RELATÓRIOS**
```bash
# Relatório do Carbon Capital (último gerado)
npx tsx scripts/generate/carbon-capital-report.ts

# Relatório real completo com dados do banco
npx tsx scripts/generate/generate-carbon-real-report.ts

# Relatório semanal detalhado
npx tsx scripts/generate/generate-weekly-report.ts

# Relatório com análise de participantes
npx tsx scripts/generate/generate-weekly-report-with-participants.ts
```

## 🔔 **NOTIFICAÇÕES**
```bash
# Forçar envio de notificação para MS Teams
npx tsx scripts/notifications/force-teams-notification.ts

# Ver instruções de segurança
bash scripts/security-instructions.sh
```

## 🔧 **MANUTENÇÃO**
```bash
# Limpar dados antigos do banco
npx tsx scripts/database/clear-database.ts

# Capturar estrutura do webhook para debug
npx tsx scripts/debug/capture-webhook-structure.ts

# Debug de grupos ativos
npx tsx scripts/debug/debug-groups.ts
```

## 📋 **LINKS ÚTEIS**
- **Sistema**: https://assistente-wp-resumo.vercel.app
- **Relatório Carbon Capital**: https://assistente-wp-resumo.vercel.app/api/resumo?id=84784da0-0029-4459-ab81-609a95bee55b
- **Documentação**: docs/README.md