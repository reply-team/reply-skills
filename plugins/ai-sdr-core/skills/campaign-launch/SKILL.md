---
name: campaign-launch
description: >
  Prepare and launch an outreach sequence with every precondition checked and the user's
  explicit approval of what will actually be sent. Covers sending capability, step content,
  schedule, enrolment and the go-live gate. Use when the user wants to create or start a
  sequence, launch a campaign, add contacts to a sequence, or begin sending.
metadata:
  version: 2.0.0
  pack: ai-sdr-core
  category: strategy
  maturity: draft
  status: active
  owner: outbound-experts
  tags: [sequences, launch, sending, cadence]
  tools: []
  api: []
  relations:
    depends-on: [sdr-operations, approval-boundaries]
    recommends: [audience-building, sending-guardrails, linkedin-guardrails, performance-analysis]
---

# Campaign launch

> **Partly an expert skeleton.** The launch procedure and its gates are complete. Message
> strategy — cadence, channel mix, what makes an opener work — is marked `TODO(expert)` and
> needs validation by outbound experts before this skill leaves `draft`.

## Purpose

Launching is the moment automation starts contacting real people using the user's domain and
accounts. This skill makes that moment deliberate: capability verified, content the user has
actually read, timing understood, and an explicit go-ahead before anything leaves.

## When to use / when NOT to use

- Use to prepare or start a sequence, and to enrol contacts into one.
- Do NOT use to build the audience first — that is `audience-building`.
- Do NOT use to analyse a running campaign — that is `performance-analysis`.
- Do NOT use for one-off individual messages: that is a named gap in the operation contract,
  not something to approximate with a one-person sequence.

## Prerequisites

- An audience that exists and is defined (`audience-building`).
- Sending capability that is healthy — verified, not assumed.
- Deliverability sanity for meaningful volume or a fresh sender (`sending-guardrails`);
  the same for LinkedIn steps (`linkedin-guardrails`).
- Operations used: `sender.health`, `sequence.create`, `sequence.add-step`,
  `sequence.assign-sender`, `sequence.assign-schedule`, `enrollment.create`,
  `sequence.activate`, `sequence.state`.

## Planning guidance

Settle with the user before building anything:

1. **Reuse or create.** An existing sequence that already performs is usually a better
   starting point than a new one.
2. **Which sender, which schedule.** Volume spread across the sending window, in the
   recipients' working hours rather than the user's.
3. **Which contacts** — a list, a filter, or explicit individuals. The count matters: it is
   what the user is really approving.
4. **The content, written with the user.** Never invent outreach copy silently and never
   send copy the user has not read. Drafting together is part of the work, not a preliminary.
   - TODO(expert): what makes a first message earn a reply — structure, length,
     personalisation depth, and which openers to avoid.
5. **Cadence and channel mix.**
   - TODO(expert): step count and intervals by segment and channel; when a channel should
     lead versus follow; how long to keep following up before stopping.

## Execution guidance

1. **Verify sending is possible** (`sender.health`). No healthy sender is a **hard stop** —
   the user must connect one. Never attempt to send anyway, and never route around it.
2. **Pick or create the sequence** (`sequence.create`, or reuse).
3. **Define the steps** (`sequence.add-step`) with the content agreed above. Complex step
   editing — variant experiments, multi-channel steps — is a known contract gap: if it cannot
   be expressed cleanly, say so and hand that part to the user in their product's own
   interface rather than guessing.
4. **Attach sender and schedule** (`sequence.assign-sender`, `sequence.assign-schedule`),
   then **verify by reading back** (`sequence.state`) that steps, sender and schedule are all
   actually attached. A sequence that silently lacks a schedule is a classic surprise.
5. **Enrol the contacts** (`enrollment.create`). Reconcile every per-contact outcome — added,
   already enrolled, not found, blocked, limit reached — and explain each skip. Note that
   enrolling into an already-live sequence *is itself* sending: treat it with launch gates.
6. **The launch gate.** Show exactly what goes live: sequence name, step count, **the literal
   first message**, recipient count, sender, schedule. Wait for an explicit yes — this is
   `exact-text` approval, the strictest level (see `approval-boundaries`).
7. **Activate** (`sequence.activate`) and confirm the status actually flipped by re-reading.

## Validation

Re-read after every mutation: steps present, sender and schedule attached, enrolled count as
expected. After activation: status is active, and the reported enrolled count matches what the
user approved. A launch is not confirmed by the absence of an error — it is confirmed by
reading the state back.

## Reporting

Sequence identifier and name, steps created, contacts enrolled and skipped with reasons,
sender and schedule used, and the approval that authorised going live. Then the next
checkpoint: when to run `performance-analysis` once enough volume has accumulated.

## Failure modes

- **Launching without verified sending capability.** Produces silent non-delivery or a
  reputation hit.
- **Sending copy the user has not read.** The one mistake that cannot be undone.
- **Assuming enrolment is harmless** when the sequence is already live.
- **Partial enrolment reported as success**, hiding the contacts that never made it.
- **A missing schedule** discovered after launch, when messages went out at the wrong time.
- **Volume that ignores sender maturity** — see `sending-guardrails`; a burned domain
  outlasts the campaign.

## Safety

Starting a sequence, enrolling contacts in bulk, and resuming anything paused all require the
user's explicit approval in the conversation — the launch gate additionally requires them to
have seen the literal first message. Pausing is reversible and cheap; starting sends real
messages to real people and cannot be recalled. Archiving or deleting a sequence destroys
history: confirm separately, never as part of a launch. Full rules: `approval-boundaries`.

## Related skills

- `audience-building` — the audience must exist and be defined first.
- `sending-guardrails` · `linkedin-guardrails` — the limits that constrain volume and pacing.
- `performance-analysis` — the follow-up once the campaign runs.
- `approval-boundaries` — the launch gate in full.

## Changelog

- 2.0.0 (2026-07-30): renamed from `launch-outreach` and rewritten vendor-neutral for the
  `ai-sdr-core` pack — Reply endpoints, scopes and CLI calls moved to
  `reply-operations-mapping`. Safety rules now defer to `approval-boundaries` rather than
  restating them; message-strategy gaps marked for expert validation.
- 1.0.0 (2026-07-27): ported from the prototype workflow as `launch-outreach`.
