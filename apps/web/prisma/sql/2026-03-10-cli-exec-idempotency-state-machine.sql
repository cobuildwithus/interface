-- Hosted CLI exec idempotency state-machine hardening.

ALTER TABLE IF EXISTS cobuild.cli_tx_logs
  ADD COLUMN IF NOT EXISTS status VARCHAR(32);

ALTER TABLE IF EXISTS cobuild.cli_tx_logs
  ADD COLUMN IF NOT EXISTS user_op_hash VARCHAR(66);

ALTER TABLE IF EXISTS cobuild.cli_tx_logs
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

ALTER TABLE IF EXISTS cobuild.cli_tx_logs
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

UPDATE cobuild.cli_tx_logs
SET status = CASE
  WHEN tx_hash IS NOT NULL THEN 'confirmed'
  ELSE 'failed'
END
WHERE status IS NULL;

ALTER TABLE IF EXISTS cobuild.cli_tx_logs
  ALTER COLUMN status SET NOT NULL;

ALTER TABLE IF EXISTS cobuild.cli_tx_logs
  ALTER COLUMN status SET DEFAULT 'confirmed';

CREATE INDEX IF NOT EXISTS cli_tx_logs_owner_agent_status_idx
  ON cobuild.cli_tx_logs (owner_address, agent_key, status);

CREATE INDEX IF NOT EXISTS cli_tx_logs_status_idx
  ON cobuild.cli_tx_logs (status);

CREATE INDEX IF NOT EXISTS cli_tx_logs_user_op_hash_idx
  ON cobuild.cli_tx_logs (user_op_hash);
