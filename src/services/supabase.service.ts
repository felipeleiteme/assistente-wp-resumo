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

export async function saveMessage(message: {
  raw_data: any;
  from: string | null;
  group_id: string | null;
  text: string | null;
  timestamp: string;
}): Promise<void> {
  const client = getSupabaseClient();

  const { error } = await client
    .from('messages')
    .insert({
      raw_data: message.raw_data,
      from_number: message.from,
      group_id: message.group_id,
      text_content: message.text,
      received_at: message.timestamp,
      created_at: new Date().toISOString(),
    });

  if (error) {
    throw new Error(`Erro ao salvar mensagem: ${error.message}`);
  }
}

export async function getDailyMessages(): Promise<Array<{
  from: string;
  text: string;
  timestamp: string;
}>> {
  const client = getSupabaseClient();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayIso = today.toISOString();

  const { data, error } = await client
    .from('messages')
    .select('from_number, text_content, received_at')
    .gte('received_at', todayIso)
    .order('received_at', { ascending: true });

  if (error) {
    throw new Error(`Erro ao buscar mensagens: ${error.message}`);
  }

  return (data || []).map(row => ({
    from: row.from_number || 'Desconhecido',
    text: row.text_content || '',
    timestamp: row.received_at,
  }));
}

export async function saveSummary(summary: {
  content: string;
  date: string;
  message_count: number;
}): Promise<{ id: string }> {
  const client = getSupabaseClient();

  const { data, error } = await client
    .from('daily_summaries')
    .insert({
      summary_content: summary.content,
      summary_date: summary.date,
      message_count: summary.message_count,
      created_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (error) {
    throw new Error(`Erro ao salvar resumo: ${error.message}`);
  }

  return { id: data.id };
}
