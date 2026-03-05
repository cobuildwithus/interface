-- CLI hardening updates
-- NOTE: cli_cli_tokens schema changes are owned by chat-api migrations.

ALTER TABLE IF EXISTS cobuild.cli_tx_logs
  ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(128);

CREATE UNIQUE INDEX IF NOT EXISTS cli_tx_logs_owner_agent_idempotency_uidx
  ON cobuild.cli_tx_logs (owner_address, agent_key, idempotency_key);
