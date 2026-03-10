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
      coalesce(outbox.action, 'upsert') AS action,
      outbox.reason,
      outbox.source_type,
      outbox.source_id,
      lower(trim(outbox.actor_wallet_address)) AS actor_wallet_address,
      outbox.block_number,
      outbox.log_index,
      TIMESTAMPTZ 'epoch' + outbox.timestamp * interval '1 second' AS event_at,
      outbox.payload
    FROM "cobuild-onchain".protocol_notification_outbox outbox
    JOIN target_ids target ON target.id = outbox.id
    WHERE outbox.recipient_wallet_address IS NOT NULL
      AND btrim(outbox.recipient_wallet_address) <> ''
      AND outbox.recipient_wallet_address ~* '^0x[0-9a-f]{40}$'
  ),
  target_keys AS (
    SELECT DISTINCT
      selected.recipient_wallet_address,
      selected.source_type,
      selected.source_id
    FROM selected
  ),
  history AS (
    SELECT
      outbox.id,
      lower(trim(outbox.recipient_wallet_address)) AS recipient_wallet_address,
      coalesce(outbox.action, 'upsert') AS action,
      outbox.reason,
      outbox.source_type,
      outbox.source_id,
      lower(trim(outbox.actor_wallet_address)) AS actor_wallet_address,
      outbox.block_number,
      outbox.log_index,
      TIMESTAMPTZ 'epoch' + outbox.timestamp * interval '1 second' AS event_at,
      outbox.payload
    FROM "cobuild-onchain".protocol_notification_outbox outbox
    JOIN target_keys target
      ON target.recipient_wallet_address = lower(trim(outbox.recipient_wallet_address))
      AND target.source_type = outbox.source_type
      AND target.source_id = outbox.source_id
    WHERE outbox.recipient_wallet_address IS NOT NULL
      AND btrim(outbox.recipient_wallet_address) <> ''
      AND outbox.recipient_wallet_address ~* '^0x[0-9a-f]{40}$'
  ),
  latest_history AS (
    SELECT DISTINCT ON (history.recipient_wallet_address, history.source_type, history.source_id)
      history.id,
      history.recipient_wallet_address,
      history.action,
      history.reason,
      history.source_type,
      history.source_id,
      history.actor_wallet_address,
      history.block_number,
      history.log_index,
      history.event_at,
      history.payload
    FROM history
    ORDER BY
      history.recipient_wallet_address,
      history.source_type,
      history.source_id,
      history.block_number DESC,
      history.log_index DESC,
      history.id DESC
  ),
  upserted AS (
    INSERT INTO cobuild.notifications AS notification (
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
    FROM latest_history selected
    WHERE selected.action = 'upsert'
    ON CONFLICT (recipient_wallet_address, source_type, source_id) DO UPDATE
    SET
      kind = EXCLUDED.kind,
      reason = EXCLUDED.reason,
      actor_fid = EXCLUDED.actor_fid,
      actor_wallet_address = EXCLUDED.actor_wallet_address,
      event_at = EXCLUDED.event_at,
      payload = EXCLUDED.payload,
      invalidated_at = NULL,
      created_at = CASE
        WHEN notification.invalidated_at IS NOT NULL THEN clock_timestamp()
        ELSE notification.created_at
      END,
      updated_at = clock_timestamp()
    RETURNING 1
  ),
  invalidated AS (
    UPDATE cobuild.notifications AS notification
    SET
      reason = selected.reason,
      actor_wallet_address = selected.actor_wallet_address,
      payload = selected.payload,
      invalidated_at = selected.event_at,
      updated_at = clock_timestamp()
    FROM latest_history selected
    WHERE selected.action = 'invalidate'
      AND notification.recipient_wallet_address = selected.recipient_wallet_address
      AND notification.source_type = selected.source_type
      AND notification.source_id = selected.source_id
    RETURNING 1
  )
  SELECT (SELECT COUNT(*) FROM upserted) + (SELECT COUNT(*) FROM invalidated)
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
  target_keys AS (
    SELECT DISTINCT
      selected.recipient_wallet_address,
      selected.source_type,
      selected.source_id
    FROM selected
  ),
  latest_outbox AS (
    SELECT DISTINCT ON (
      lower(trim(outbox.recipient_wallet_address)),
      outbox.source_type,
      outbox.source_id
    )
      lower(trim(outbox.recipient_wallet_address)) AS recipient_wallet_address,
      coalesce(outbox.action, 'upsert') AS action,
      outbox.source_type,
      outbox.source_id
    FROM "cobuild-onchain".protocol_notification_outbox outbox
    JOIN target_keys target
      ON target.recipient_wallet_address = lower(trim(outbox.recipient_wallet_address))
      AND target.source_type = outbox.source_type
      AND target.source_id = outbox.source_id
    WHERE outbox.recipient_wallet_address IS NOT NULL
      AND btrim(outbox.recipient_wallet_address) <> ''
      AND outbox.recipient_wallet_address ~* '^0x[0-9a-f]{40}$'
    ORDER BY
      lower(trim(outbox.recipient_wallet_address)),
      outbox.source_type,
      outbox.source_id,
      outbox.block_number DESC,
      outbox.log_index DESC,
      outbox.id DESC
  ),
  upserted AS (
    INSERT INTO cobuild.notifications AS notification (
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
    LEFT JOIN latest_outbox
      ON latest_outbox.recipient_wallet_address = selected.recipient_wallet_address
      AND latest_outbox.source_type = selected.source_type
      AND latest_outbox.source_id = selected.source_id
    WHERE coalesce(latest_outbox.action, 'upsert') <> 'invalidate'
    ON CONFLICT (recipient_wallet_address, source_type, source_id) DO UPDATE
    SET
      kind = EXCLUDED.kind,
      reason = EXCLUDED.reason,
      actor_fid = EXCLUDED.actor_fid,
      actor_wallet_address = EXCLUDED.actor_wallet_address,
      event_at = EXCLUDED.event_at,
      payload = EXCLUDED.payload,
      invalidated_at = NULL,
      created_at = CASE
        WHEN notification.invalidated_at IS NOT NULL THEN clock_timestamp()
        ELSE notification.created_at
      END,
      updated_at = clock_timestamp()
    RETURNING 1
  )
  SELECT COUNT(*)::integer FROM upserted
$$;
