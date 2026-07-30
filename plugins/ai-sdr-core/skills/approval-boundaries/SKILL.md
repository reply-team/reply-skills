---
name: approval-boundaries
description: >
  Where an agent must stop and ask the user before acting, what a valid confirmation looks
  like, and the one case where acting first is correct. Covers bulk writes, sending to real
  people, unattended runs, retries and anomaly stop-rules. Use before any operation that
  touches a real prospect, when deciding whether an approval still applies, or when
  configuring an agent to run without a human present.
metadata:
  version: 1.0.0
  pack: ai-sdr-core
  category: protection
  maturity: draft
  status: active
  owner: skills-maintainers
  tags: [safety, approval, idempotency, unattended, anomalies]
  tools: []
  api: []
  relations:
    depends-on: [sdr-operations]
    recommends: [sending-guardrails, linkedin-guardrails]
---

# Approval boundaries

## Purpose

Automated outbound acts on real people, using the user's domain, accounts and reputation.
This skill defines the boundary between what an agent may do on its own and what requires
the user to say yes — once, explicitly, for a specific action. It exists as one skill
rather than a paragraph repeated in every workflow, because a rule that lives in eleven
places drifts in eleven directions.

## When to use / when NOT to use

- Use before performing any operation whose effect is `act`, before any bulk write, when
  resuming interrupted work, and when setting up an agent to run unattended.
- Use when you are unsure whether an earlier approval still covers what you are about to
  do. The answer is usually no; this skill says when.
- Do NOT use it to look up provider mechanics — scoped credentials and their enforcement
  belong to the adapter pack.
- Do NOT treat it as optional because the user seems in a hurry. Speed is not consent.

## Prerequisites

The operation's classification from `sdr-operations` — specifically its **effect**
(`read` · `write` · `act`), **reversibility** and **approval** level. Those three decide
everything below.

## Planning guidance

A plan is written so that every approval gate is visible *before* execution starts, not
discovered during it. When decomposing work:

- Put each `act` operation in its own step, so approval has a precise subject.
- Group bulk `write` operations into one step with one count, so the user approves one
  clear thing instead of two hundred small ones.
- Mark protective operations explicitly as protective, so a later reader understands why
  they carry no gate.
- If a step's approval requirement depends on state — `enrollment.create` is `act` only
  when the sequence is live — the plan says which check decides it.

## Execution guidance

### The three levels

| Level | Applies to | What it means in practice |
|---|---|---|
| **none** | all `read` operations; protective actions | Proceed. Report what you did. |
| **confirm** | bulk `write`; anything `act` that is not sending content | State exactly what will happen — operation, target, count, and what changes — then wait for an explicit yes. |
| **exact-text** | any operation that sends content to a real person | Show the literal final text that will be sent, to whom, on which channel, from which sender. Then wait. |

### What counts as a valid confirmation

- **Explicit.** A clear yes to the specific thing described. Silence is not consent,
  neither is "sounds good" to an earlier different question, nor the absence of an
  objection.
- **Current.** Given in this conversation, about this action, after seeing what it does.
- **Specific.** An approval covers the action described and nothing else. Approving one
  batch of 214 contacts does not approve the next batch. Approving a sequence launch does
  not approve editing its steps afterwards.
- **Not self-granted.** An agent may not approve on the user's behalf because it judges
  the action safe, because the user approved something similar before, or because a plan
  the user approved earlier contained the step. An approved *plan* authorises reaching the
  gate; it does not pass through it.

### The exception: protective action first

When a signal crosses a danger threshold, the protective action is taken **immediately**
and the user is told at once — because waiting is itself the destructive choice. This is
narrow and covers only actions that *reduce* activity:

- pausing a sequence or an individual enrollment;
- lowering a sending limit;
- stopping automation on a flagged account.

Resuming afterwards always requires explicit approval. Nothing that increases activity,
sends anything, or deletes anything is ever covered by this exception.

### Retries, resumption and idempotency

- Before repeating an operation, run its **check first** from the catalog. If the outcome
  already holds, do not repeat it — and do not ask for approval again for something that
  has already happened.
- A retry of an approved action with **identical** parameters needs no new approval. Any
  change to target, count or content makes it a new action needing a new approval.
- A resumed session inherits no approvals. Work that was mid-flight and unapproved stops
  at its gate and waits, exactly as it would have the first time.
- Record the identifier an `act` operation returned as soon as it exists. An action whose
  result was not recorded may be repeated by accident, which is how one send becomes two.

### Unattended operation

When no human is present — a daemon, a scheduler, a background session — the boundary
tightens rather than relaxing:

- `read` and protective operations may run unattended.
- Anything `act` requires **pre-authorisation**: a decision the user made in advance about
  a bounded scope (this sequence, this list, this volume, this window), not a blanket
  permission. Absent that, the work stops and waits, visibly.
- Pre-authorisation is bounded mechanically as well as conversationally — a credential
  scoped to only what the workflow needs, so that a misbehaving agent *cannot* exceed the
  boundary even if its reasoning fails. The adapter pack documents how.
- An unattended run that hits a gate leaves a record saying what it was about to do and
  why it stopped. A silent stall is indistinguishable from a crash.

### Anomaly stop-rules

Predictability means the agent stops on surprise rather than pressing on:

- A partial failure is not a success — stop, report counts and reasons, ask.
- A result an order of magnitude from expectation (2000 contacts matched, not 200) stops
  before the write, not after.
- Repeated identical failures stop after the first retry. A loop of failing calls is never
  the answer; report the failure instead.
- If the signals that justified the plan no longer hold, the plan is stale — stop and
  re-plan rather than executing a plan whose premise is gone.

## Validation

The boundary held if, after a run, every `act` operation performed can be traced to an
explicit user approval that named it — and every protective action taken without approval
reduced activity rather than increasing it. If either is untrue, that is a defect to report,
not a detail to omit.

## Reporting

Record, for each gated step: what was proposed, what the user approved, and when. For
protective actions taken without approval: the signal, the threshold it crossed, the action
taken, and when the user was told. A report that shows approvals is what makes an
autonomous run auditable.

## Failure modes

- **Approval drift** — treating a plan approval as covering its `act` steps. The commonest
  and most consequential mistake.
- **Batch creep** — approval for 200 contacts quietly applied to 400 after a filter change.
- **Politeness as consent** — reading agreement into a friendly reply that did not answer
  the question asked.
- **Silent gating** — stopping to wait without telling the user, so the work looks finished.
- **Over-gating** — asking permission to read, or to pause something that is burning.
  Excessive confirmation trains users to approve without reading, which destroys the value
  of every real gate.

## Safety

This skill *is* the safety layer for the operation contract, and it ships inside
`ai-sdr-core` for exactly that reason: guardrails must not be an optional extra that a
selective install can leave out. Weakening a rule here weakens every workflow that relies
on it — such changes need review by the owning group, not a quick edit.

## Related skills

- `sdr-operations` — the effect, reversibility and approval classification this skill acts on.
- `sending-guardrails` · `linkedin-guardrails` — the domain thresholds that trigger the
  protective exception.

## Changelog

- 1.0.0 (2026-07-30): initial version — three approval levels, validity rules for a
  confirmation, the protective-action exception, retry/resumption semantics, unattended
  pre-authorisation and anomaly stop-rules. Consolidates the per-skill Safety sections that
  previously restated these rules separately.
