---
name: orchestrator-integration
description: >
  How durable work is actually driven when nobody is watching: which orchestrator owns
  scheduling and resumption, how to avoid two of them fighting over the same workspace, and
  what changes when a run is unattended. Use when setting up background or recurring outbound
  work, or when more than one orchestration runtime is available.
metadata:
  version: 1.0.0
  pack: agentic-runtime
  category: runtime
  maturity: draft
  status: active
  owner: skills-maintainers
  tags: [orchestration, unattended, scheduling, daemon]
  tools: []
  api: []
  relations:
    depends-on: [durable-work]
    recommends: [approval-boundaries, execution-reporting]
---

# Orchestrator integration

## Purpose

`durable-work` defines what durable work *is*. Something still has to wake up and move it
forward — on a schedule, after a failure, or when a user approval finally arrives. That
something is an orchestrator, and there is more than one candidate. This skill decides which
one is in charge and keeps them from colliding.

## When to use / when NOT to use

- Use when setting up recurring or background outbound work, and when a machine has more than
  one orchestration runtime available.
- Use before enabling anything unattended, to establish what may run with no human present.
- Do NOT use for interactive work. A user at a keyboard *is* the orchestrator, and this skill
  adds nothing.
- Do NOT treat this pack as requiring any particular runtime. The workspace format is the
  interop layer; the runtime is swappable, and that is the point.

## Prerequisites

A workspace (`durable-work`), and a decision about which runtime owns it.

## Planning guidance

**Exactly one orchestrator owns a workspace at a time.** This is the rule that matters most.
The workspace is plain files with no transactions and no locking, so two schedulers advancing
the same goal will interleave writes, double-execute work items, and — worst case — send the
same messages twice. Choosing an owner is not a preference, it is a correctness requirement.

Candidates, in the order you should consider them:

1. **A general-purpose orchestrator the user already runs** — for example OpenClaw, or Hermes
   (capabilities still to be assessed). If the user already has one, use it. It has solved
   process lifecycle, retries and observability already, and it works for their non-outbound
   work too.
2. **`reply daemon`** — Reply's own local process manager, positioned as the
   **zero-dependency fallback** for users with no orchestrator of their own.
   **Honest gap: it does not exist yet.** It is designed but unbuilt, so today the practical
   answers are option 1 or option 3. Do not write plans that assume it is running.
3. **Nothing — the user drives it.** Entirely legitimate. Work items persist; the user or an
   agent picks them up next session. Slower, and nothing happens while the machine is off, but
   it needs no infrastructure and no trust decisions.

Whichever is chosen, record it in the workspace so the next session does not have to guess —
and so a second orchestrator can recognise that the workspace is already owned.

## Execution guidance

### What an orchestrator is responsible for

- **Waking up** on a schedule or an event, and finding work that is ready.
- **Respecting dependencies** between work items rather than running whatever is next in the
  file listing.
- **Not starting what is already running.** Single-flight per work item, across restarts.
- **Retry and backoff** for transient failures, using the failure classes in `durable-work`.
- **Surfacing what it did** — a run journal the user can read after the fact.

### What an orchestrator must NOT do

- Decide that an `act` operation may proceed without the user. Approval is
  `approval-boundaries`' decision, and an unattended context makes it stricter, not looser.
- Advance a work item sitting in `awaiting-approval`. That state exists to be waited on.
- Rewrite plans, or reinterpret a stale plan to make it runnable. A refuted premise means stop
  and re-plan.
- Assume anything about the provider. The orchestrator moves work items; it does not know what
  Reply is. Provider knowledge belongs to an adapter pack.

### Unattended runs specifically

Everything in the unattended section of `approval-boundaries` applies. In short: reads and
protective actions may run freely; anything that reaches a real person requires
pre-authorisation bounded in advance — this campaign, this list, this volume, this window —
and bounded *mechanically* by a credential scoped to only what the work needs, so that a
reasoning failure cannot exceed the boundary. Absent pre-authorisation, the run stops at the
gate and says so visibly. A run that stalls silently is indistinguishable from one that
crashed.

### Handing over between runtimes

Because state is files, migration is not an export: point the new orchestrator at the same
workspace, and make sure the old one is stopped first. Overlapping ownership during a handover
is exactly the concurrent-writer problem above.

## Validation

Integration is correct when: exactly one runtime is recorded as owning the workspace; a work
item never runs twice concurrently, including across a restart; items in `awaiting-approval`
stay untouched until the user answers; and every unattended run leaves a journal explaining
what it did or why it stopped.

## Reporting

Each run appends to the run journal: what was picked up, what advanced, what stopped and why.
Meaningful bursts still produce a proper report (`execution-reporting`) — a journal records
activity, a report records meaning, and they are not substitutes for each other.

## Failure modes

- **Two orchestrators, one workspace.** The failure that duplicates real sends. Always check
  for an existing owner.
- **Assuming `reply daemon` exists.** It does not yet.
- **Silent stalls** at approval gates, so the user believes the work finished.
- **Unbounded pre-authorisation** — "the agent may send" with no ceiling on volume, audience
  or window is not pre-authorisation, it is an unguarded loop.
- **Retry storms** on a permanent failure, which burn quota and hide the actual error.
- **Runtime-specific assumptions leaking into skills.** Scheduling semantics belong in the
  workspace conventions, not in a skill that presumes one host's features.

## Safety

Unattended execution is the highest-stakes mode this repository supports: nobody is watching,
and a mistake repeats on a timer. The safe posture is to run reads and protective actions
freely, and to require bounded pre-authorisation plus a narrowly-scoped credential for
anything else. When in doubt, the run stops and waits — an idle workspace costs a day, a
misfiring unattended agent costs a domain.

## Related skills

- `durable-work` — what is being orchestrated, and the failure classes.
- `approval-boundaries` (core pack) — what may run without a human, and what may not.
- `execution-reporting` — the reports a run produces.

## Changelog

- 1.0.0 (2026-07-30): initial version. Records the third-party-orchestrators-as-hosts decision
  (ADR-0005) as operating guidance: an orchestrator is chosen and recorded, exactly one owns a
  workspace, and `reply daemon` is the not-yet-built zero-dependency fallback rather than an
  assumed dependency.
