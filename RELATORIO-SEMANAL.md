# 📊 Relatório Semanal - Guia de Implementação

## Visão Geral

O sistema de Relatório Semanal fornece **análise estratégica completa** das comunicações do WhatsApp, incluindo:

- 📈 Estatísticas de volume e engajamento
- 👥 Análise de participação por grupo e pessoa
- ⏰ Padrões temporais (horários de pico, dias mais ativos)
- 🎯 Insights estratégicos gerados por IA
- ⚠️ Alertas e pontos de atenção
- 💡 Recomendações acionáveis

## Configuração no Supabase

### 1. Criar a tabela `weekly_reports`

Execute o SQL abaixo no **SQL Editor** do Supabase:

\`\`\`sql
-- Copie o conteúdo do arquivo: supabase-weekly-reports-table.sql
\`\`\`

## Funcionamento

### Execução Automática

O relatório é gerado automaticamente **toda segunda-feira às 06:00 (horário de Brasília)** via GitHub Actions.

### Execução Manual

Para gerar um relatório manualmente:

\`\`\`bash
curl -X GET \\
  -H "Authorization: Bearer SEU_CRON_SECRET" \\
  https://assistente-wp-resumo.vercel.app/api/cron/weekly-report
\`\`\`

## O que o Relatório Contém

### 📊 Métricas Quantitativas

- Total de mensagens na semana
- Número de grupos ativos
- Média de mensagens por dia
- Média de mensagens por grupo
- Distribuição diária de mensagens
- Top 10 participantes mais ativos
- 5 horários de maior atividade

### 🧠 Análise com IA

A IA (Qwen) analisa os dados e gera:

1. **Resumo Executivo** - Visão geral da semana em 2-3 parágrafos
2. **Análise de Tendências** - Padrões de crescimento/queda, dias úteis vs fim de semana
3. **Análise de Engajamento** - Grupos e participantes mais/menos ativos
4. **Padrões Temporais** - Melhores horários e dias para comunicação
5. **Insights Estratégicos** - 3-5 insights acionáveis numerados
6. **Alertas** - Riscos, quedas de engajamento, grupos inativos
7. **Recomendações** - 3-5 ações concretas para a próxima semana
8. **Conclusão** - Principais takeaways

## Notificações

### MS Teams

O relatório é enviado automaticamente para o MS Teams com:
- Card formatado com métricas principais
- Resumo executivo
- Link para o relatório completo

### Formato do Card

\`\`\`
📊 Relatório Semanal de Análise
13/11/2025 - 20/11/2025

💬 Total de Mensagens: 245
👥 Grupos Ativos: 3
📈 Média por Dia: 35
📊 Média por Grupo: 82

[Resumo executivo...]

[📄 Ver Relatório Completo]
\`\`\`

## Visualização Web

Cada relatório tem uma URL única e pode ser acessado via:

\`\`\`
https://assistente-wp-resumo.vercel.app/api/relatorio-semanal?id=UUID
\`\`\`

A página inclui:
- Header com período do relatório
- Barra de estatísticas visual
- Relatório completo formatado
- Design corporativo responsivo

## Casos de Uso

### Para Gestores

- Identificar tendências de engajamento
- Detectar grupos com baixa atividade
- Planejar horários de comunicação
- Avaliar efetividade da equipe

### Para Customer Success

- Monitorar satisfação dos clientes (via análise de sentimento)
- Identificar clientes que precisam de atenção
- Medir engajamento por cliente/grupo
- Detectar problemas antes que escalem

### Para Estratégia

- Comparar semanas para identificar sazonalidade
- Avaliar impacto de mudanças/campanhas
- Otimizar recursos da equipe
- Tomar decisões baseadas em dados

## Exemplo de Insights Gerados

\`\`\`markdown
### 🎯 Insights Estratégicos

1. **Queda de 23% no engajamento do Grupo A** - Comparado à semana anterior,
   sugerindo necessidade de reengajamento.

2. **Horário de pico consistente às 14h-15h** - 38% das mensagens ocorrem
   neste período, ideal para anúncios importantes.

3. **3 participantes representam 65% da comunicação** - Concentração alta
   de participação pode indicar falta de engajamento geral.

4. **Fim de semana com 12% mais atividade** - Grupos de suporte precisam
   de cobertura estendida.

5. **Grupo C sem mensagens há 5 dias** - Possível churn, requer ação
   imediata da equipe de CS.
\`\`\`

## Manutenção

### Alterar Horário de Execução

Edite `.github/workflows/weekly-report.yml`:

\`\`\`yaml
schedule:
  # Formato: minuto hora dia-do-mês mês dia-da-semana
  # 0 = Domingo, 1 = Segunda, etc.
  - cron: '0 9 * * 1'  # Segunda às 09:00 UTC (06:00 BRT)
\`\`\`

### Personalizar Prompt da IA

Edite `src/services/weekly-analysis.service.ts` na função `generateWeeklyInsights()`.

## Troubleshooting

### Relatório não foi gerado

1. Verifique os logs do GitHub Actions
2. Confirme que o `CRON_SECRET` está configurado nos Secrets do GitHub
3. Verifique se há mensagens no período (sem mensagens = sem relatório)

### Erro ao salvar no Supabase

1. Confirme que a tabela `weekly_reports` foi criada
2. Verifique as credenciais `SUPABASE_URL` e `SUPABASE_ANON_KEY`
3. Confirme as permissões da API key no Supabase

### IA não gera insights

1. Verifique se `QWEN_API_KEY` está configurada
2. Confirme que a key não expirou
3. Verifique o saldo/créditos da conta Qwen

## Roadmap Futuro

- [ ] Comparação com semanas anteriores
- [ ] Gráficos interativos na página web
- [ ] Exportação para PDF
- [ ] Alertas automáticos por email quando métricas caem
- [ ] Dashboard com histórico de todos os relatórios
- [ ] Análise de sentimento por mensagem
- [ ] Predição de tendências com ML
