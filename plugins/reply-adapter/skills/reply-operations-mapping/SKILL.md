---
name: reply-operations-mapping
description: >
  Maps each vendor-neutral SDR business operation onto its Reply.io execution: which API v3
  endpoint group and doc page, which scope, what order to call things in, and how Reply's
  errors translate back into operation outcomes. Use when a plan names an operation and you
  need to actually perform it against Reply, or when a Reply response needs interpreting in
  business terms.
metadata:
  version: 1.0.0
  pack: reply-adapter
  category: execution
  maturity: draft
  status: active
  owner: skills-maintainers
  tags: [mapping, operations, endpoints, scopes, adapter]
  tools: [reply-cli, reply-mcp]
  api: [contacts, contact-lists, sequences, sequence-steps, sequence-contacts, inbox, reports, email-accounts, linkedin-accounts, schedules, background-jobs]
  relations:
    depends-on: [reply-api, reply-cli, sdr-operations]
    recommends: [reply-auth, reply-mcp]
---

# Reply operations mapping

## Purpose

`sdr-operations` says what `enrollment.create` *means*. This skill says how to make it
happen in Reply.io — which endpoint group owns it, which scope it needs, what must be true
first, and what the response tells you in business terms. It is the whole reason the
vendor-neutral layer can stay vendor-neutral.

## When to use / when NOT to use

- Use when executing a plan written in operation names against Reply.
- Use when a Reply response or error needs translating back into "what happened to the
  business intent".
- Do NOT use it as an endpoint reference. It names the **endpoint group and doc page**;
  exact paths, parameters and body schemas come from the docs at call time — see
  `reply-api` for the discovery-first workflow. Paths written from memory are how agents
  invent endpoints that do not exist.
- Do NOT put business judgement here. Whether to dedupe by skipping or updating is a
  decision owned by the core pack; this skill only knows how to carry it out.

## Prerequisites

- A working credential — `reply auth whoami` succeeds (see `reply-cli`).
- The scopes listed per family below (see `reply-auth` for the scope grammar).
- The operation you intend to perform, taken from the `sdr-operations` catalog.

## Planning guidance

**Read the operation's classification first, then map it.** The core contract already told
you whether the operation is `act`, whether it is reversible and whether it needs approval.
Mapping does not change any of that — an operation that requires `exact-text` approval still
requires it after you know which endpoint performs it.

Two Reply-specific facts shape almost every plan:

1. **Bulk work is asynchronous.** Large writes return `202 Accepted` with a background-job
   reference. The operation is not complete when the call returns — it is complete when the
   job reaches a terminal state. Plan the poll, and report the job's result rather than the
   `202`.
2. **Measurement is rate-limited harder than the rest.** Reporting and sequence-stats
   endpoints have stricter limits than general endpoints. Sequential calls, cached within
   the session, no polling.

## Execution guidance

Every row below means: *use the `reply api` command with the path taken from that doc page*.
Fetch `https://docs.reply.io/llms.txt` once per session, then the specific page as raw
markdown (append `.md` to its URL) before the first call of that kind.

### `contact.*` — scopes `contacts:read`, `contacts:write`, `contacts:operate`

| Operation | Reply surface | Notes |
|---|---|---|
| `contact.find` | contacts → *Filter contacts*, *List all contacts* | Filtering by email is the identity check before any create |
| `contact.create` | contacts → *Import contacts* | Bulk-oriented: a large import returns a background job. Field mapping is decided in the core layer, applied here |
| `contact.update` | contacts → *Import contacts* with an update policy, or the update endpoint per its doc page | Which of the two applies depends on the dedupe policy the user chose |
| `contact.delete` | contacts → the delete endpoint per its doc page | Irreversible in Reply as well as in the contract |
| `contact.suppress` | contacts → the opt-out / do-not-contact endpoint per its doc page | Verify the resulting state by re-reading the contact |
| `contact.list.create` | contact-lists → *Create a contact list* | Check *List contact lists* first — reuse beats proliferation |
| `contact.list.add` / `.remove` | contact-lists → the membership endpoints per their doc pages | Reconcile counts afterwards by filtering contacts by list |
| `contact.deduplicate` | No single endpoint. Realised as `contact.find` + the chosen import policy | *Skip existing* is the import default that never overwrites; *update existing* is the deliberate alternative |

### `sequence.*` — scopes `sequences:read`, `sequences:write`, `sequences:operate`

| Operation | Reply surface | Notes |
|---|---|---|
| `sequence.state` | sequences → *Get a sequence* | The verification read after every mutation |
| `sequence.create` | sequences → *Create a sequence* | List first (*List all sequences*) — reuse is usually right |
| `sequence.add-step` / `.update-step` | sequence-steps → *Create a sequence step* and its variants | **Honest gap:** complex step editing — A/B variants on a live sequence, LinkedIn steps — is often better done in the Reply app. Say so and hand off rather than guessing |
| `sequence.assign-sender` | sequence-email-accounts → *Assign email account to sequence* | Requires a healthy sender; see `sender.*` |
| `sequence.assign-schedule` | schedules → *List schedules*, then the assignment endpoint | A sequence without a schedule will not send when expected |
| `sequence.activate` | sequences → *Start a sequence* | Needs `sequences:operate`. Verify `status` flipped to active by re-reading |
| `sequence.pause` | sequences → *Pause a sequence* | Cheap and reversible — the protective move |
| `sequence.archive` | sequences → the archive endpoint per its doc page | Treat as irreversible |

### `enrollment.*` — scopes `sequences:operate`, `contacts:read`

| Operation | Reply surface | Notes |
|---|---|---|
| `enrollment.state` | sequence-contacts → the per-contact state endpoint per its doc page | Check before enrolling and before any retry |
| `enrollment.create` | sequence-contacts → *Bulk add contacts to sequence* | Returns per-contact results. Reconcile every one: `added` vs not-processed reasons (already in sequence · not found · forbidden · limit exceeded). Never summarise partial results as success |
| `enrollment.pause` / `.resume` / `.remove` | sequence-contacts → the corresponding endpoints per their doc pages | Per-contact, does not affect the rest of the sequence |

### `conversation.*` — scopes `inbox:read`, `inbox:operate`

| Operation | Reply surface | Notes |
|---|---|---|
| `conversation.list` | inbox → *List inbox categories* (carries unread counts), *List/Filter inbox threads* | Categories first gives the shape of the work before reading threads |
| `conversation.read` | inbox → *Get inbox thread*, *List messages in an inbox thread* | Note the thread's **channel** — the reply must go out on the same one |
| `conversation.reply` | inbox → *Send a reply within a thread* | The response must contain the created message; re-read the thread if in doubt. If the channel's account is disconnected the send fails — tell the user to reconnect, never switch channel silently |
| `conversation.classify` | inbox → *Assign or clear a thread's category* | Verify the thread's category field reflects the change |

### `sender.*` — scopes `channels:read`, `channels:operate`

| Operation | Reply surface | Notes |
|---|---|---|
| `sender.list` · `sender.health` | email-accounts → *List email accounts*; linkedin-accounts → the account listing endpoint | Connection status and configured limits come from the same read. Disconnected or erroring account = hard stop |
| `sender.limits.read` / `.update` | the per-channel limits endpoints per their doc pages | Lowering is protective and needs no approval; raising does |

### `metrics.*` — scope `reporting:read` (plus `sequences:read`)

| Operation | Reply surface | Notes |
|---|---|---|
| `metrics.account-overview` | reports → *Get email reporting overview* | Always paired with the window it covers |
| `metrics.sequence` | sequences → *Get stats for all sequences* (`/v3/sequences/stats`), then *Get sequence stats* (`/v3/sequences/{id}/stats`) for outliers | Both are documented as stable paths. Stricter rate limits — sequential only |
| `metrics.channel-efficiency` | reports → *Get channel efficiency overview* | For comparing channels, not for judging one in isolation |

### Composite ordering

Two flows where order is not obvious and getting it wrong wastes real sends:

**Launch.** `sender.health` (no healthy sender → stop) → `sequence.create` or reuse →
`sequence.add-step` → `sequence.assign-sender` → `sequence.assign-schedule` →
`sequence.state` to verify all three are attached → `enrollment.create` →
**approval gate** → `sequence.activate` → `sequence.state` to confirm active.

**Import.** Inspect the source locally, zero API calls → `contact.list.create` or reuse →
**approval gate** (file, count, mapping, dedupe policy, target list) → `contact.create` in
bulk → poll the background job → reconcile created/updated/skipped/failed against the list.

### Async work

A `202` response carries a background-job reference. Poll `GET /v3/background-jobs/{id}`
(documented stable) to a terminal state, then report that job's counts. A job that ends
`failed` gets its body fetched for the reason — never blind-retry a bulk write, because
the first attempt may have partially succeeded.

### Error translation

| Reply signal | What it means for the operation | What to do |
|---|---|---|
| `400` + `errors[]` with JSON Pointers | The request was malformed, the intent was fine | Fix the indicated field, retry once |
| `401`, empty body | Credential invalid or expired — not an operation failure | Re-authenticate; see `reply-cli` |
| `403 insufficient_scope` | The credential may not perform this class of operation | Name the missing scope to the user; do not retry |
| `403`/`401` `TEAM_REQUIRED` · `TEAM_NOT_ACCESSIBLE` · `USER_REQUIRED` · `USER_NOT_FOUND` | The call could not be attributed to one team or acting user | See `reply-auth`; the CLI prints the exact fix |
| `404` | The identifier is wrong or stale, so the precondition never held | Re-resolve the entity; never invent an identifier |
| `429` | The operation is fine, the pace is not | Honour `Retry-After`, go sequential |
| `5xx` | Unknown whether the operation took effect | Run the operation's *check first* before any retry |
| Per-contact `not processed` in a bulk result | Partial success — a normal outcome, not an error | Report each reason; offer the corresponding fix |

### Choosing CLI or MCP

`reply api` reaches every operation in the catalog, because it reaches the whole API. The
MCP tool catalog is a curated subset — convenient where no shell exists, but when an
operation has no matching tool, fall back to the CLI rather than approximating it with a
different tool. See `reply-mcp`.

## Validation

After every `write` or `act`, perform the operation's **check first** from the catalog as a
read-back: re-read the entity and confirm identifiers, counts and status. An operation is
reported complete only when that read agrees. For async work, terminal job state plus
reconciled counts.

## Reporting

Report in operation terms with Reply identifiers attached — `enrollment.create → sequence
12345, 214 requested, 211 added, 3 already enrolled`. Include background-job identifiers,
the endpoints used for writes, and any scope or team change that the run required.

## Failure modes

- **Inventing a path** instead of fetching the doc page. The single most common way an
  agent fails against Reply.
- **Reporting the `202`** as the result of a bulk operation.
- **Treating a partial bulk result as success**, hiding the per-contact reasons.
- **Enrolling into a live sequence** without noticing that this makes the operation `act`.
- **Parallelising measurement** reads and hitting `429`, then retrying harder.
- **Endpoint availability**: parts of the surface — notably much of the AI-SDR cluster:
  autopilot, pending approvals, enrichment, live data — are marked *Beta* or *Coming soon*
  in the docs. Check the page before relying on one, and say so honestly if it is not
  callable. Never substitute an unrelated endpoint for a missing capability.

## Safety

Mapping an operation never changes its approval requirement — `sequence.activate` mapped
onto *Start a sequence* still requires the user to have approved the literal first message.
`reply api` has no dry-run: any POST/PATCH/DELETE is live the moment it is issued. The
protective actions (`sequence.pause`, `enrollment.pause`, lowering limits) are the ones that
may be performed first and reported immediately — see `approval-boundaries` in the core pack
for the full rule, which this skill does not restate or override.

## Related skills

- `sdr-operations` (core pack) — what each operation means. This skill is its Reply implementation.
- `reply-api` — discovery-first endpoint workflow, error conventions, rate limits.
- `reply-cli` — how to actually issue the calls.
- `reply-auth` — scopes, key types, team and acting-user resolution.

## Changelog

- 1.0.0 (2026-07-30): initial mapping of the six operation families onto Reply API v3,
  including composite launch/import ordering, async handling and error translation.
  Consolidates the Reply-specific execution detail previously embedded in the business
  skills, which are now vendor-neutral.
