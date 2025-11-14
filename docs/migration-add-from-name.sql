-- Adicionar coluna from_name à tabela messages
-- Execute este SQL no Supabase SQL Editor

ALTER TABLE messages
ADD COLUMN IF NOT EXISTS from_name TEXT;

-- Opcional: Adicionar índice para melhorar performance de buscas
CREATE INDEX IF NOT EXISTS idx_messages_from_name ON messages(from_name);

-- Verificar se a coluna foi criada
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'messages'
AND column_name = 'from_name';
