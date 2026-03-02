-- Build-bot wallet broker tables.
-- NOTE: `cobuild.build_bot_cli_tokens` is owned by chat-api migrations.

CREATE TABLE IF NOT EXISTS cobuild.build_bot_agent_wallets (
  id BIGSERIAL PRIMARY KEY,
  owner_address VARCHAR(42) NOT NULL,
  agent_key VARCHAR(64) NOT NULL,
  cdp_account_name VARCHAR(64) NOT NULL UNIQUE,
  address VARCHAR(42) NOT NULL,
  default_network VARCHAR(64) NOT NULL DEFAULT 'base',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS build_bot_agent_wallets_owner_agent_key_uidx
  ON cobuild.build_bot_agent_wallets (owner_address, agent_key);

CREATE INDEX IF NOT EXISTS build_bot_agent_wallets_owner_idx
  ON cobuild.build_bot_agent_wallets (owner_address);

CREATE TABLE IF NOT EXISTS cobuild.build_bot_tx_logs (
  id BIGSERIAL PRIMARY KEY,
  owner_address VARCHAR(42) NOT NULL,
  agent_key VARCHAR(64) NOT NULL,
  kind VARCHAR(32) NOT NULL,
  network VARCHAR(64) NOT NULL,
  "to" VARCHAR(42) NOT NULL,
  token VARCHAR(42),
  amount VARCHAR(120),
  decimals INTEGER,
  value_eth VARCHAR(120),
  data VARCHAR(8192),
  tx_hash VARCHAR(66),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS build_bot_tx_logs_owner_idx
  ON cobuild.build_bot_tx_logs (owner_address);

CREATE INDEX IF NOT EXISTS build_bot_tx_logs_hash_idx
  ON cobuild.build_bot_tx_logs (tx_hash);
