ALTER TABLE scheduled_transactions
ADD COLUMN IF NOT EXISTS created_by text;
