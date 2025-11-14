import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabase: SupabaseClient;

function getSupabaseClient(): SupabaseClient {
  if (!supabase) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('SUPABASE_URL e SUPABASE_ANON_KEY devem estar configurados.');
    }

    supabase = createClient(supabaseUrl, supabaseKey);
  }
  return supabase;
}

export async function saveWeeklyReport(report: {
  content: string;
  weekStart: string;
  weekEnd: string;
  totalMessages: number;
  totalGroups: number;
  stats: any;
}): Promise<{ id: string }> {
  const client = getSupabaseClient();

  const { data, error } = await client
    .from('weekly_reports')
    .insert({
      report_content: report.content,
      week_start: report.weekStart,
      week_end: report.weekEnd,
      total_messages: report.totalMessages,
      total_groups: report.totalGroups,
      stats_data: report.stats,
      created_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (error) {
    throw new Error(`Erro ao salvar relatório semanal: ${error.message}`);
  }

  return { id: data.id };
}

export async function getLatestWeeklyReports(limit: number = 10): Promise<Array<{
  id: string;
  week_start: string;
  week_end: string;
  total_messages: number;
  total_groups: number;
  created_at: string;
}>> {
  const client = getSupabaseClient();

  const { data, error } = await client
    .from('weekly_reports')
    .select('id, week_start, week_end, total_messages, total_groups, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Erro ao buscar relatórios: ${error.message}`);
  }

  return data || [];
}

export async function getWeeklyReportById(id: string): Promise<{
  id: string;
  report_content: string;
  week_start: string;
  week_end: string;
  total_messages: number;
  total_groups: number;
  stats_data: any;
  created_at: string;
} | null> {
  const client = getSupabaseClient();

  const { data, error } = await client
    .from('weekly_reports')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Erro ao buscar relatório:', error.message);
    return null;
  }

  return data;
}

export async function getPreviousWeekReport(weekStart: string): Promise<{
  id: string;
  week_start: string;
  week_end: string;
} | null> {
  const client = getSupabaseClient();

  const { data, error } = await client
    .from('weekly_reports')
    .select('id, week_start, week_end')
    .lt('week_start', weekStart)
    .order('week_start', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    return null;
  }

  return data;
}

export async function getNextWeekReport(weekStart: string): Promise<{
  id: string;
  week_start: string;
  week_end: string;
} | null> {
  const client = getSupabaseClient();

  const { data, error } = await client
    .from('weekly_reports')
    .select('id, week_start, week_end')
    .gt('week_start', weekStart)
    .order('week_start', { ascending: true })
    .limit(1)
    .single();

  if (error || !data) {
    return null;
  }

  return data;
}
