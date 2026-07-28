---
name: manage-replies
description: >
  Triage the Reply.io inbox, surface conversations that matter (interested prospects and
  meeting intent first), and send user-approved replies on the right channel. Use when the
  user asks about replies, inbox triage, responding to prospects, or finding interested leads.
metadata:
  version: 1.0.0
  category: business
  maturity: draft
  status: active
  owner: outbound-experts
  tags: [inbox, replies, triage]
  tools: [reply-cli]
  api: [inbox]
  relations:
    depends-on: [reply-cli, reply-api]
    recommends: [analyze-performance]
---

# Manage replies

## Purpose

Keep the pipeline moving: find the replies that matter, give the user compact thread context,
draft responses together, send only what was explicitly approved, and keep threads categorized.

## When to use / when NOT to use

- Use for inbox review, reply drafting/sending, thread categorization.
- Do NOT use for bulk campaign changes (that's `launch-outreach` / `analyze-performance`).

## Prerequisites

- Scopes: `inbox:read` + `inbox:operate`.
- Doc pages to fetch before first use in a session: inbox → *List inbox categories*,
  *List/Filter inbox threads*, *Get inbox thread*, *List messages in an inbox thread*,
  *Send a reply within a thread*, *Assign or clear a thread's category*.

## Planning guidance

Triage order that serves the business: meeting-intent and "interested" threads first, then unread
by recency. Ask the user upfront: reviewing everything, or a slice (category, sequence, search)?

## Execution guidance

1. **Lay of the land:** `reply api /v3/inbox/categories` (includes unread counts) and the thread
   list/filter endpoint for unread threads. Summarize: counts per category, meeting-intent flags.
2. **Present a triage list:** contact, company, subject, category, last activity — interested
   first. Let the user pick.
3. **Open a thread:** get the thread + its messages; present the exchange compactly (who said
   what, when). Note the thread's **channel** — the reply goes out on the same channel (email or
   LinkedIn).
4. **Draft with the user.** Ground the draft in thread context and `memory/` preferences (tone,
   sign-off) if a workspace exists. Iterate. Show the FINAL exact text.
5. **CONFIRM** ("Send this to <contact>?") — then send via the *Send a reply within a thread*
   doc-page contract. Verify the response contains the sent message; report it.
6. **Categorize** the thread (Interested / Not interested / Not now / Do not contact) via the
   assign-category endpoint; suggest, confirm if ambiguous.
7. **Loop** through remaining threads as the user wants.

## Validation

The send response must include the created message; re-read the thread if in doubt. After
categorization, the thread's category field reflects the change.

## Reporting

Threads reviewed, replies sent (thread IDs + recipients), categories assigned, threads still
needing attention. Next step: for interested prospects with no meeting, propose a follow-up plan.

## Failure modes

- Thread channel is LinkedIn but the LinkedIn account is disconnected → sending fails; tell the
  user to reconnect the account, don't switch channels silently.
- 403 on send → key lacks `inbox:operate`.
- AI-draft endpoints may be marked Beta/Coming soon in the docs — check before relying on them.

## Safety

**Sending a reply to a real prospect requires the user's explicit confirmation of the exact final
text — every time, no exceptions.** Never batch-send drafts. "Do not contact" categorization is
consequential — confirm before applying it.

## Related skills

- `analyze-performance` — when reply quality/quantity signals a campaign problem.

## Changelog

- 1.0.0 (2026-07-27): ported from prototype workflow onto `reply api`; added workspace-memory
  grounding for drafts and channel-mismatch failure mode.
