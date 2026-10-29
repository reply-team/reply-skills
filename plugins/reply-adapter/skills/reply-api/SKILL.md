---
name: reply-api
description: >
  Work with the Reply.io API v3 correctly: discover endpoints through the machine-readable
  docs, respect scopes and rate limits, handle problem+json errors and background jobs.
  Use before calling any non-trivial v3 endpoint, when choosing an endpoint for a task,
  or when an API call fails and needs interpretation.
metadata:
  version: 1.3.0
  pack: reply-adapter
  category: execution
  maturity: reviewed
  status: active
  owner: skills-maintainers
  tags: [api, docs, errors, rate-limits]
  tools: [reply-cli, reply-mcp]
  api: [introduction, authentication, rate-limits]
  relations:
    depends-on: [reply-cli]
    recommends: [reply-auth, reply-operations-mapping]
---

# Working with Reply API v3

## Purpose

API v3 (`https://api.reply.io/v3`) is the full execution surface of Reply — contacts, sequences,
inbox, channels, tasks, schedules, reports, webhooks and the AI-SDR cluster. The docs are built
for agents: this skill teaches the discovery-first workflow that avoids invented endpoints and
malformed bodies.

## When to use / when NOT to use

- Use whenever a task needs an endpoint you haven't verified in this session, or an error needs
  interpreting.
- Do NOT guess endpoint paths or body shapes from memory — verify against the docs first.

## Prerequisites

A working credential (`reply auth whoami` succeeds) with the scopes the target endpoints require.

## Execution guidance

### Discovery-first workflow (always)

1. **Fetch the index once per session:** `https://docs.reply.io/llms.txt` — every endpoint with
   its doc URL and required scope, one line each.
2. **Fetch the endpoint's doc page as raw markdown** by requesting its URL with the `.md` suffix
   (e.g. `https://docs.reply.io/api-reference/sequences/list-all-sequences.md`) — exact path,
   parameters, body schema, response examples.
3. **Call it:** `reply api <path exactly as documented>`.

Known-stable anchors you may use without re-checking: `GET /v3/whoami` (identity; no scope),
`GET /v3/whoami/team-users` (accessible teams), `GET /v3/background-jobs/{id}`,
`GET /v3/sequences/{id}/stats` and `GET /v3/sequences/stats` (stricter rate limits).
The full OpenAPI 3.1 spec exists at `https://docs.reply.io/api-reference/bundled.yaml` — prefer
per-page `.md` fetches; the spec is large.

### Conventions

- REST, plural nouns: `GET` read, `POST` create, `PATCH` update, `DELETE` remove; JSON bodies.
- **Errors** are RFC 9457 `application/problem+json` with a stable `code` slug
  (`<resource>.<variant>`, e.g. `webHook.invalidEvent`). Validation 400s add an `errors[]` array
  with JSON Pointers to the offending fields — read them, fix, retry once.
- **Async:** long operations return `202 Accepted` + `Location: /v3/background-jobs/{id}`.
  Poll that endpoint until it completes; report the job result, not the 202.
- **Change feed:** `GET /v3/inbox/threads/changes` lists the inbox threads that changed, oldest
  first, a page at a time from an opaque `cursor` or a `since` moment, and holds the last 30 days
  only; from reply-cli 0.17.0 it is `reply inbox changes`. Keep the cursor it hands back, even on an
  empty page, and pass it unchanged. A cursor or moment older than the window is refused (CLI code
  `inbox.cursor_expired`), and so is a cursor the feed never issued or one ahead of its clock (CLI
  code `inbox.cursor_refused`): read again from a moment inside the window. An account whose Reply
  has no feed yet answers a bare 404 — page through the inbox threads instead.
- **Rate limits:** 100 req/min and 3000 req/hour per user; reporting and sequence-stats endpoints
  are stricter. On 429 the CLI already retried honoring `Retry-After` — if it still fails, wait
  and reduce concurrency (sequential calls for bulk work).
- **Direct sends** (from reply-cli 0.17.0): `--send-after <moment>` takes a moment with its offset
  and sends it as UTC, and Reply holds the send until then. `--idempotency-key <key>` goes as the
  `Idempotency-Key` header: the same request repeated under it answers the send Reply took rather
  than sending again; `idempotency_key.in_use` says the first send under it is still being made
  (wait and repeat), and `idempotency_key.reused` that it was taken for another request, whose send
  the error's `details` names. The answer carries the send's `reference` and `state`, and its
  `send_after` where one was given; take each field only when the answer gives it, and read a
  `send_after` of null as no moment given. `reply direct-send get <reference>` reads the send and
  `reply direct-send cancel <reference>` cancels one still held. Nothing lists the pending sends: a
  harness that keeps the reference reads and cancels by it.
  - **State:** `sent` means it went. `failed` and `cancelled` are final: Reply will not send it,
    and neither a repeat under the key nor a read changes that. Any other state — `queued`,
    `sending`, `waitingForSchedule`, or one this skill does not name — means Reply took the send
    and it has not gone yet. Every such send can still be cancelled except a `sending` one, which
    Reply is already sending.
  - **Text:** where the answer carries `rendered_subject` and `rendered_body`, they are the
    message as sent — the subject rendered, the body rendered with the account's signature and
    the tracking applied. Reply keeps no other rendered copy.
  - **A lost answer:** where an earlier try returned a `reference`, read it first with `reply
    direct-send get <reference>` (from reply-cli 0.17.0), and let its state decide; repeat only
    when the read says nothing of the send. Reply keeps a key for a day, so a repeat goes under
    the same key only within 23 hours of the first try. Past that, or where the account's Reply
    has no direct-send route (a bare 404 on the read), the key no longer settles a repeat: send
    nothing, and leave whether the first try went to a person to check at Reply.

### Endpoint availability (GA / Beta / Coming soon)

The docs mark endpoints as **Beta** (shape may change) or **Coming soon** (not callable yet) —
much of the AI-SDR cluster (autopilot, pending approvals, enrichment, Live Data) carries such
marks. Check the endpoint's doc page; if it's Coming soon, say so honestly — never improvise a
replacement with unrelated endpoints.

Not every account's Reply has every route yet. A bare 404 — no `code` of Reply's own — on a
direct send, `direct-send get` or `direct-send cancel` means the account's Reply does not have the
route, not that an identifier is wrong; from reply-cli 0.17.0 the CLI passes it through as
`reply.refused` with status 404 and no Reply code. Say the capability is not there yet; never
retry it as a stale identifier.

## Validation

For writes: re-read the entity (`GET`) and verify the change. For bulk/async: poll the background
job to terminal state and reconcile counts (created/updated/skipped/failed).

## Reporting

Record endpoint paths used, entity IDs created/modified, background-job IDs and final counts.

## Failure modes

| Signal | Meaning | Action |
|---|---|---|
| 400 + `errors[]` | invalid body/params | fix per JSON Pointer, retry once |
| 401 empty body | bad/expired credential | fix auth (`reply auth login`) |
| 403 `insufficient_scope` | key lacks the endpoint's scope | tell the user which scope is missing; don't retry |
| 403/401 `TEAM_REQUIRED`·`TEAM_NOT_ACCESSIBLE`·`USER_REQUIRED`·`USER_NOT_FOUND` | team/user resolution | see reply-auth skill |
| 404 | wrong/stale ID | re-list the entity, re-resolve the ID — don't invent IDs |
| 429 | rate limit | respect `Retry-After`; go sequential |
| 5xx | transient | already retried; wait, retry once, then report the API may be down |

## Safety

Read endpoints are safe. Treat every POST/PATCH/DELETE as a live mutation subject to the calling
skill's confirmation rules — especially anything that sends messages or starts sequences.

## Related skills

- `reply-cli` — the execution command (`reply api`).
- `reply-auth` — scopes model and team/org resolution.

## Changelog

- 1.3.0 (2026-10-29): *Conventions* names the direct sends' `--send-after` and `--idempotency-key`,
  the two `idempotency_key.*` codes and `reply direct-send get` and `cancel`, from reply-cli
  0.17.0, and what a send's answer says: its fields only when given, its state (`sent`, final
  `failed` and `cancelled`, anything else held), its rendered text as sent, and a lost answer read
  back by reference first and repeated under the key within 23 hours; *Endpoint availability*
  says what a bare 404 on those routes means.
- 1.2.0 (2026-10-29): the inbox change feed, `GET /v3/inbox/threads/changes`, and its window.
- 1.1.0 (2026-07-30): moved into the `reply-adapter` pack; category `technical` → `execution`;
  `auth-and-keys` renamed `reply-auth`.
- 1.0.0 (2026-07-27): initial version against docs.reply.io (v3, July 2026).
