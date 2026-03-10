# Notification Review Follow-Ups

Status: in_progress
Updated: 2026-03-10

## Goal

Fix protocol notification materialization and presentation issues found in review.

## Scope

- Make protocol materialization replay-safe for partial retries and replays.
- Restore unread semantics for cyclical state notifications on reopen.
- Improve protocol deep links so dispute/request/mechanism rows route with the payload refs already available.
- Bring protocol presentation logic back into sync with chat-api.
- Make the goal `events` and `allocate` surfaces actually respond to the structured focus/query refs carried by protocol notifications.
- Keep exact routing aligned with the shared presenter as success-assertion and controller-role reasons are added.

## Current Slice

- Unify reopen semantics so `invalidated_at` toggling does not also invent a new inbox `created_at` for protocol rows.
- Keep discussion semantics as the reference behavior: invalidated rows can be re-materialized without becoming newly unread solely because they reopened.
- Lock the contract with protocol SQL regression tests around preserved `created_at`.
