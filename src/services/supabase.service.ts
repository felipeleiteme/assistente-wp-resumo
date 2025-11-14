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
  from_name?: string | null;
  group_id: string | null;
  group_name: string | null;
  text: string | null;
  timestamp: string;
}): Promise<void> {
  const client = getSupabaseClient();

  const { error } = await client
    .from('messages')
    .insert({
      raw_data: message.raw_data,
      from_number: message.from,
      from_name: message.from_name || null,
      group_id: message.group_id,
      group_name: message.group_name,
      text_content: message.text,
      received_at: message.timestamp,
      created_at: new Date().toISOString(),
    });

  if (error) {
    throw new Error(`Erro ao salvar mensagem: ${error.message}`);
  }
}

export async function getDailyMessages(groupId: string): Promise<Array<{
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
    .select('from_number, from_name, text_content, received_at')
    .gte('received_at', todayIso)
    .eq('group_id', groupId)
    .order('received_at', { ascending: true });

  if (error) {
    throw new Error(`Erro ao buscar mensagens: ${error.message}`);
  }

  return (data || []).map(row => ({
    from: row.from_name || row.from_number || 'Desconhecido',
    text: row.text_content || '',
    timestamp: row.received_at,
  }));
}

export async function getDistinctGroupIdsToday(): Promise<string[]> {
  const client = getSupabaseClient();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayIso = today.toISOString();

  const { data, error } = await client
    .from('messages')
    .select('group_id')
    .gte('received_at', todayIso);

  if (error) {
    throw new Error(`Erro ao buscar grupos: ${error.message}`);
  }

  const uniqueGroupIds = new Set<string>();
  (data || []).forEach(row => {
    if (row.group_id) {
      uniqueGroupIds.add(row.group_id);
    }
  });

  return Array.from(uniqueGroupIds);
}

export async function getGroupName(groupId: string): Promise<string> {
  const client = getSupabaseClient();

  const { data, error } = await client
    .from('messages')
    .select('group_name')
    .eq('group_id', groupId)
    .not('group_name', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !data?.group_name) {
    return groupId; // Fallback para o ID se não encontrar o nome
  }

  return data.group_name;
}

export async function saveSummary(summary: {
  content: string;
  date: string;
  message_count: number;
}, groupId: string): Promise<{ id: string }> {
  const client = getSupabaseClient();

  const { data, error } = await client
    .from('daily_summaries')
    .insert({
      summary_content: summary.content,
      summary_date: summary.date,
      message_count: summary.message_count,
      group_id: groupId,
      created_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (error) {
    throw new Error(`Erro ao salvar resumo: ${error.message}`);
  }

  return { id: data.id };
}

export async function cleanupOldMessages(): Promise<void> {
  const client = getSupabaseClient();

  // Definir cutoff de 7 dias atrás
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { error, count } = await client
    .from('messages')
    .delete({ count: 'exact' })
    .lte('created_at', cutoff);

  if (error) {
    throw new Error(`Erro ao limpar mensagens antigas: ${error.message}`);
  }

  console.log(`${count || 0} mensagens antigas removidas (> 7 dias).`);
}
