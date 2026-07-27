---
name: launch-outreach
description: >
  Prepare and launch a Reply.io outreach sequence with every precondition checked and
  explicit confirmation before anything goes live. Use when the user wants to create or
  start a sequence, launch a campaign, add contacts to a sequence, or begin sending.
metadata:
  version: 1.0.0
  category: business
  maturity: draft
  status: active
  owner: outbound-experts
  tags: [sequences, sending, launch, safety]
  tools: [reply-cli]
  api: [sequences, sequence-steps, sequence-contacts, sequence-email-accounts, email-accounts, schedules]
  relations:
    depends-on: [reply-cli, reply-api]
    recommends: [email-deliverability, import-prospects, analyze-performance]
---

# Launch outreach

## Purpose

Get a sequence ready and start sending to a chosen set of contacts — with sending capability
verified, steps and schedule in place, and the user's explicit go-ahead before anything reaches
a real prospect.

## When to use / when NOT to use

- Use for creating/preparing/starting sequences and enrolling contacts.
- Do NOT use for one-off direct messages (see the direct-outreach endpoint group) or for
  analyzing running campaigns (`analyze-performance`).

## Prerequisites

- Scopes: `sequences:read/write/operate`, `contacts:read`, `channels:read`.
- Contacts exist (else run `import-prospects` first).
- Doc pages to fetch before first use in a session: email-accounts → *List email accounts*;
  schedules → *List schedules*; sequences → *Create/Get/Start a sequence*; sequence-steps →
  *Create a sequence step* / variants; sequence-email-accounts → *Assign email account to
  sequence*; sequence-contacts → *Bulk add contacts to sequence*.

## Planning guidance

Decide with the user before executing: reuse an existing sequence or create new; which sending
account(s) and schedule; which contacts (list / filter / explicit IDs); copy for each step
(subject + body written WITH the user — never invent outreach copy silently). Deliverability
sanity first: read `email-deliverability` when volume is significant or the account is fresh.

## Execution guidance

1. **Verify sending is possible:** `reply api /v3/email-accounts` — at least one connected,
   healthy account. None → stop; the user must connect one in Reply → Settings → Email Accounts.
2. **Pick or create the sequence:** `reply api /v3/sequences` to list; create per the *Create a
   sequence* doc page. Add steps/variants via sequence-steps endpoints (bodies per docs).
   **Honest gap:** complex step editing (A/B variants on live sequences, LinkedIn steps) may be
   better done in the Reply app — say so and hand off rather than guessing.
3. **Wire it up:** assign email account(s) and schedule per the respective doc pages; verify with
   `reply api /v3/sequences/<id>` that steps, accounts and schedule all show as expected.
4. **Enroll contacts:** bulk-add per the *Bulk add contacts to sequence* doc page. Reconcile the
   per-contact results (`added` vs not-processed reasons: already in sequence, not found,
   forbidden, limit exceeded) — explain every skipped contact.
5. **CONFIRM LAUNCH:** show the user exactly what will go live — sequence name/ID, step count,
   first-step copy, N contacts, sending account, schedule. Wait for explicit "yes".
6. **Start:** per the *Start a sequence* doc page (`sequences:operate`). Verify status flipped to
   active by re-reading the sequence.

## Validation

Re-read the sequence after each mutation (steps present, accounts assigned, contact count,
status). After start: confirm status=active and report the enrolled count.

## Reporting

Sequence ID/name, steps created, contacts added/skipped (with reasons), account+schedule used,
start confirmation. Next step: check `analyze-performance` after meaningful volume accumulates.

## Failure modes

- No email accounts → hard stop with the setting-up instruction; never try to send anyway.
- Partial enrollment → report reasons per contact; offer to fix (import missing, dedupe).
- 403 on start → key lacks `sequences:operate`; see `auth-and-keys`.

## Safety

**Never without explicit user confirmation in this conversation:** starting a sequence,
archiving/deleting a sequence, enrolling contacts in bulk. Show the exact copy of the first
message before launch. Pausing is reversible and safe; starting sends real emails to real people.

## Related skills

- `import-prospects` — get the contacts in first.
- `email-deliverability` — protect the sending domain before volume.
- `analyze-performance` — the follow-up once it runs.

## Changelog

- 1.0.0 (2026-07-27): ported from prototype workflow onto `reply api` endpoint-level execution;
  added deliverability cross-check and docs-first endpoint discovery.
