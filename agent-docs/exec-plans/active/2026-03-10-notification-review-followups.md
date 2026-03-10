# Notification Review Follow-Ups

## Goal

Fix protocol notification materialization and presentation issues found in review.

## Scope

- Make protocol materialization replay-safe for partial retries and replays.
- Restore unread semantics for cyclical state notifications on reopen.
- Improve protocol deep links so dispute/request/mechanism rows route with the payload refs already available.
- Bring protocol presentation logic back into sync with chat-api.
- Make the goal `events` and `allocate` surfaces actually respond to the structured focus/query refs carried by protocol notifications.
- Keep exact routing aligned with the shared presenter as success-assertion and controller-role reasons are added.
