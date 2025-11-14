-- Adicionar coluna group_name à tabela messages
-- Execute este SQL no Supabase SQL Editor

ALTER TABLE messages
ADD COLUMN IF NOT EXISTS group_name TEXT;

-- Opcional: Adicionar índice para melhorar performance de buscas
CREATE INDEX IF NOT EXISTS idx_messages_group_name ON messages(group_name);

-- Verificar se a coluna foi criada
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'messages'
AND column_name = 'group_name';
