---
name: inbox-triage
description: >
  Work the inbound replies: surface the conversations that matter first, give the user
  compact thread context, draft responses together, send only what was explicitly approved,
  and record the outcome of each conversation. Use when the user asks about replies, inbox
  triage, responding to prospects, or finding the interested leads.
metadata:
  version: 2.0.0
  pack: ai-sdr-core
  category: strategy
  maturity: draft
  status: active
  owner: outbound-experts
  tags: [inbox, replies, triage, dispositions]
  tools: []
  api: []
  relations:
    depends-on: [sdr-operations, approval-boundaries]
    recommends: [performance-analysis, campaign-launch]
---

# Inbox triage

> **Partly an expert skeleton.** The triage procedure and the sending gate are complete.
> Reply strategy — how to answer an objection, when to push for a meeting, how long to keep
> a thread alive — is marked `TODO(expert)` and needs validation by outbound experts before
> this skill leaves `draft`.

## Purpose

A campaign that generates replies nobody works is a campaign that generated nothing. This
skill keeps the pipeline moving: find the conversations that deserve attention today, give
the user enough context to decide quickly, draft the response with them, send exactly what
they approved, and record what came of it so the next person or session knows.

## When to use / when NOT to use

- Use for reviewing replies, drafting and sending responses, and recording dispositions.
- Do NOT use for bulk campaign changes — that is `campaign-launch` or `performance-analysis`.
- Do NOT use for the calendar hand-off after a prospect says yes: meeting booking is a named
  gap in the operation contract.

## Prerequisites

- Conversations exist — i.e. something has been sent (`campaign-launch`).
- Operations used: `conversation.list`, `conversation.read`, `conversation.reply`,
  `conversation.classify`. `conversation.reply` is `act`, irreversible, and requires
  `exact-text` approval every time.

## Planning guidance

Agree the scope before opening anything: everything, or a slice — one campaign, one
disposition, one time window? An inbox reviewed without a scope tends to be reviewed
half-way.

**Triage order serves the business, not the timestamp.** Work the conversations where a
human reply changes the outcome, before the ones where it does not. Meeting intent and clear
interest come first; recency is a tiebreaker, not the ordering.

- TODO(expert): the signals that reliably mark meeting intent versus polite interest, and the
  order of the remaining categories.
- TODO(expert): how quickly a reply must go out before the interest goes cold, per channel.

## Execution guidance

1. **Get the shape of the work** (`conversation.list`). Counts by disposition and unread, so
   the user knows how big the job is before starting it.
2. **Present a triage list** — person, company, subject, current disposition, last activity —
   ordered as above. Let the user pick, or confirm working through in order.
3. **Open the conversation** (`conversation.read`). Present the exchange compactly: who said
   what, when. Note the **channel** — the reply goes out on the same one it arrived on.
4. **Draft with the user.** Ground the draft in the actual thread and in the user's stored
   preferences — tone, sign-off, hard constraints — if those are available. Iterate. Then
   show the **final exact text**.
   - TODO(expert): response patterns for the recurring cases — not interested, wrong person,
     not now, price objection, "send me info".
5. **Confirm and send** (`conversation.reply`). The user approves the literal text, to this
   person, on this channel. Then verify the message was actually created and report it.
6. **Record the outcome** (`conversation.classify`) — interested · not interested · not now ·
   do-not-contact. Suggest the disposition; confirm when it is ambiguous, and **always**
   confirm do-not-contact.
7. **Continue** through the remaining conversations as the user wants.

## Validation

The send is confirmed by the created message appearing in the thread — re-read if in doubt,
never assume. After classifying, the conversation's disposition reflects the change. At the
end, the count of conversations reviewed plus those still waiting adds up to what you started
with.

## Reporting

Conversations reviewed, replies sent (with recipients and thread identifiers), dispositions
assigned, and what is still waiting on attention. Then the useful part: interested people with
no meeting yet, and the follow-up that should exist for them.

## Failure modes

- **Batch-sending drafts.** Every message to a real person is approved individually. There is
  no bulk mode for this, by design.
- **Switching channel silently** when the original channel is unavailable. That is a different
  conversation; tell the user instead.
- **Recording a disposition the user did not agree with**, especially do-not-contact — which
  has lasting consequences for that person's contactability.
- **Triaging by timestamp** and burying the interested reply under twenty automated bounces.
- **Losing thread context** by summarising away the specific thing the prospect asked.

## Safety

Sending a reply to a real prospect requires the user's explicit confirmation of the exact
final text — every time, no exceptions, no batching. Recording do-not-contact is
consequential and permanent in effect: confirm before applying it, and never infer it from
silence or from a lukewarm reply. Conversations contain personal data; keep quotes to what the
decision requires. Full rules: `approval-boundaries`.

## Related skills

- `sdr-operations` — the conversation operations and their classification.
- `performance-analysis` — when reply volume or quality suggests a campaign problem rather
  than an inbox problem.
- `approval-boundaries` — the exact-text gate.

## Changelog

- 2.0.0 (2026-07-30): renamed from `manage-replies` and rewritten vendor-neutral for the
  `ai-sdr-core` pack — Reply inbox endpoints and scopes moved to `reply-operations-mapping`.
  Reply-strategy gaps marked for expert validation; safety now defers to
  `approval-boundaries`.
- 1.0.0 (2026-07-27): ported from the prototype workflow as `manage-replies`.
