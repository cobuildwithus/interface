-- Build-bot hardening updates

ALTER TABLE IF EXISTS cobuild.build_bot_cli_tokens
  ADD COLUMN IF NOT EXISTS agent_key VARCHAR(64) NOT NULL DEFAULT 'default';

ALTER TABLE IF EXISTS cobuild.build_bot_tx_logs
  ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(128);

CREATE UNIQUE INDEX IF NOT EXISTS build_bot_tx_logs_owner_agent_idempotency_uidx
  ON cobuild.build_bot_tx_logs (owner_address, agent_key, idempotency_key);
