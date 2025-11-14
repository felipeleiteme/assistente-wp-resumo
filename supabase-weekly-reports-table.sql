-- Tabela para armazenar relatórios semanais
CREATE TABLE IF NOT EXISTS weekly_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_content TEXT NOT NULL,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  total_messages INTEGER NOT NULL DEFAULT 0,
  total_groups INTEGER NOT NULL DEFAULT 0,
  stats_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_weekly_reports_created_at ON weekly_reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_weekly_reports_week_start ON weekly_reports(week_start);
CREATE INDEX IF NOT EXISTS idx_weekly_reports_week_end ON weekly_reports(week_end);

-- Comentários
COMMENT ON TABLE weekly_reports IS 'Relatórios semanais de análise com estatísticas e insights';
COMMENT ON COLUMN weekly_reports.report_content IS 'Conteúdo do relatório em Markdown';
COMMENT ON COLUMN weekly_reports.stats_data IS 'Dados estatísticos em JSON para referência';
