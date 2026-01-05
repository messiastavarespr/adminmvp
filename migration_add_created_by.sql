ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS created_by text;
