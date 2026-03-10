CREATE OR REPLACE FUNCTION cobuild.materialize_protocol_notifications(outbox_ids TEXT[])
RETURNS INTEGER
LANGUAGE sql
AS $$
  WITH target_ids AS (
    SELECT DISTINCT unnest(outbox_ids) AS id
  ),
  selected AS (
    SELECT
      outbox.id,
      lower(trim(outbox.recipient_wallet_address)) AS recipient_wallet_address,
      outbox.reason,
      outbox.source_type,
      outbox.source_id,
      lower(trim(outbox.actor_wallet_address)) AS actor_wallet_address,
      TIMESTAMPTZ 'epoch' + outbox.timestamp * interval '1 second' AS event_at,
      outbox.payload
    FROM "cobuild-onchain".protocol_notification_outbox outbox
    JOIN target_ids target ON target.id = outbox.id
    WHERE outbox.recipient_wallet_address IS NOT NULL
      AND btrim(outbox.recipient_wallet_address) <> ''
      AND outbox.recipient_wallet_address ~* '^0x[0-9a-f]{40}$'
  ),
  upserted AS (
    INSERT INTO cobuild.notifications (
      recipient_wallet_address,
      recipient_fid,
      kind,
      reason,
      source_type,
      source_id,
      actor_fid,
      actor_wallet_address,
      event_at,
      payload,
      invalidated_at,
      created_at,
      updated_at
    )
    SELECT
      selected.recipient_wallet_address,
      NULL,
      'protocol',
      selected.reason,
      selected.source_type,
      selected.source_id,
      NULL,
      selected.actor_wallet_address,
      selected.event_at,
      selected.payload,
      NULL,
      clock_timestamp(),
      clock_timestamp()
    FROM selected
    ON CONFLICT (recipient_wallet_address, source_type, source_id) DO UPDATE
    SET
      kind = EXCLUDED.kind,
      reason = EXCLUDED.reason,
      actor_fid = EXCLUDED.actor_fid,
      actor_wallet_address = EXCLUDED.actor_wallet_address,
      event_at = EXCLUDED.event_at,
      payload = EXCLUDED.payload,
      invalidated_at = NULL,
      updated_at = clock_timestamp()
    RETURNING 1
  )
  SELECT COUNT(*)::integer FROM upserted
$$;

CREATE OR REPLACE FUNCTION cobuild.materialize_protocol_notification_schedules(schedule_ids TEXT[])
RETURNS INTEGER
LANGUAGE sql
AS $$
  WITH target_ids AS (
    SELECT DISTINCT unnest(schedule_ids) AS id
  ),
  selected AS (
    SELECT
      schedule.id,
      lower(trim(schedule.recipient_wallet_address)) AS recipient_wallet_address,
      schedule.reason,
      schedule.source_type,
      schedule.source_id,
      lower(trim(schedule.actor_wallet_address)) AS actor_wallet_address,
      TIMESTAMPTZ 'epoch' + schedule.deliver_at * interval '1 second' AS event_at,
      schedule.payload
    FROM "cobuild-onchain".protocol_notification_schedule schedule
    JOIN target_ids target ON target.id = schedule.id
    WHERE schedule.recipient_wallet_address IS NOT NULL
      AND btrim(schedule.recipient_wallet_address) <> ''
      AND schedule.recipient_wallet_address ~* '^0x[0-9a-f]{40}$'
  ),
  upserted AS (
    INSERT INTO cobuild.notifications (
      recipient_wallet_address,
      recipient_fid,
      kind,
      reason,
      source_type,
      source_id,
      actor_fid,
      actor_wallet_address,
      event_at,
      payload,
      invalidated_at,
      created_at,
      updated_at
    )
    SELECT
      selected.recipient_wallet_address,
      NULL,
      'protocol',
      selected.reason,
      selected.source_type,
      selected.source_id,
      NULL,
      selected.actor_wallet_address,
      selected.event_at,
      selected.payload,
      NULL,
      clock_timestamp(),
      clock_timestamp()
    FROM selected
    ON CONFLICT (recipient_wallet_address, source_type, source_id) DO UPDATE
    SET
      kind = EXCLUDED.kind,
      reason = EXCLUDED.reason,
      actor_fid = EXCLUDED.actor_fid,
      actor_wallet_address = EXCLUDED.actor_wallet_address,
      event_at = EXCLUDED.event_at,
      payload = EXCLUDED.payload,
      invalidated_at = NULL,
      updated_at = clock_timestamp()
    RETURNING 1
  )
  SELECT COUNT(*)::integer FROM upserted
$$;
