---
name: durable-work
description: >
  How long-running work survives a session ending: goals, plans, work items, checkpoints,
  approval pauses, recovery and resumption, kept as plain markdown in a workspace the user
  owns. Use when work spans more than one session, when resuming work someone or something
  else started, or when a plan needs to be persisted rather than held in conversation.
metadata:
  version: 1.0.0
  pack: agentic-runtime
  category: runtime
  maturity: draft
  status: active
  owner: skills-maintainers
  tags: [workspace, work-items, checkpoints, resumability, recovery]
  tools: []
  api: []
  relations:
    depends-on: [sdr-operations]
    recommends: [execution-reporting, user-memory, campaign-planning, approval-boundaries]
---

# Durable work

## Purpose

A session ends. The machine sleeps, the context fills up, the user goes home, the agent
crashes. Work that only exists in a conversation dies with it. This skill defines how work is
represented so that a *different* session — possibly a different agent, possibly a background
process — can pick it up and continue without redoing what is already done.

The repository holds reusable knowledge. The **workspace** holds instances: this goal, this
plan, these work items, this run's log. Plain markdown with YAML frontmatter, in a directory
the user owns, readable by any tool and by the user themselves.

## When to use / when NOT to use

- Use when work spans sessions, when a plan must outlive the conversation that produced it,
  and when resuming anything that was interrupted.
- Use to record progress *as it happens*, not at the end. A checkpoint written after the fact
  is a checkpoint that was not there when it was needed.
- Do NOT use for a single read-only lookup — creating a goal directory to answer one question
  is overhead with no payoff.
- Do NOT use this to decide *what* the plan should be: that is `campaign-planning` in the core
  pack. This skill is about persistence and resumption, not strategy.

## Prerequisites

A workspace — a directory containing the marker file described in
[references/workspace-spec.md](references/workspace-spec.md). Create it with the user's
consent if none exists; creating one is just creating that marker.

## Planning guidance

**Think in checkpoints, not in steps.** The question to ask about every unit of work is: if
this session died right now, what would the next one need to know in order not to repeat it?
The answer is what gets written down, and it gets written down *before* the risky part, not
after.

Three properties make a work item durable:

1. **Small and observable.** It has a stated objective and a way to tell it is done. "Run the
   campaign" fails both; "enrol the 214 contacts from list *Q3 founders* into campaign 12345"
   passes.
2. **Independently resumable.** Enough state recorded that a fresh session can continue from
   the middle. External identifiers get recorded the moment they exist — an identifier that
   only lives in the conversation is lost when the conversation is.
3. **Idempotent in intent.** Before re-executing anything, check whether the outcome already
   holds — every operation in the contract names the check to run. This is what makes retry
   safe, and it is the difference between resuming and duplicating.

## Execution guidance

Structure, discovery, and the full file layout are specified in
[references/workspace-spec.md](references/workspace-spec.md). The shapes:
[templates/plan.md](templates/plan.md) and [templates/work-item.md](templates/work-item.md).

### The loop

1. **Materialise the goal and plan** in the workspace once the user has approved the plan
   text. The plan is a document, not a message.
2. **Materialise the work items** from the plan, in dependency order, each with its objective,
   completion criteria and the operations it will perform.
3. **Execute one item at a time**, updating its status and history as you go, and recording
   outputs — identifiers, counts, artefact paths — the moment they exist.
4. **Pause at approval gates.** An item needing the user's decision moves to
   `awaiting-approval` with the question recorded, and execution stops gracefully. Which
   actions require this is decided by `approval-boundaries`, not here.
5. **Report at checkpoints** (`execution-reporting`), then reassess: the next planning pass
   reads the reports.
6. **Supersede, never rewrite.** A changed plan is archived and replaced by a new revision.
   Completed work stays completed; history is immutable, because a plan that was quietly
   edited cannot be learned from.

### Failure classes get different treatment

- **Transient** — retry, honouring any wait the provider asks for. Not recorded as a failure
  unless it persists.
- **Permanent or validation** — record it in the item's history, mark the item blocked,
  surface it to the user. Do not retry in a loop.
- **Ambiguous** — the call failed but the effect may have landed. Run the operation's check
  before doing anything else. This is the case that duplicates real sends when handled
  carelessly.

Recovery prefers continuation over restart. Re-running a whole plan because one item failed
wastes work that succeeded and risks repeating `act` operations.

## Validation

Work is durably represented when a fresh session, given only the workspace, can answer: what
is the goal, what is the current plan, which items are done, which is next, what is waiting on
the user, and which external identifiers already exist. If any of those requires the previous
conversation, the representation is incomplete.

## Reporting

Progress lives in the work items; meaning lives in reports (`execution-reporting`). Keep raw
command output in run logs rather than in items or reports — an item's history is a record of
state changes, not a transcript.

## Failure modes

- **Recording after the fact.** The one failure that makes everything else worse: an
  identifier not written down before the crash is an identifier that no longer exists.
- **Work items too coarse to resume**, forcing a restart that repeats `act` operations.
- **Rewriting a superseded plan** instead of archiving it, destroying the record of what was
  believed and when.
- **Retrying an ambiguous failure** without running the idempotency check first.
- **A silent `awaiting-approval`** — the work looks finished when it is actually waiting.
- **Assuming single-writer safety.** These are files with no transactions: two agents writing
  the same workspace concurrently will corrupt each other's view. One operator per workspace.

## Safety

This skill persists and resumes work; it never decides what may be executed. Approval rules
come from `approval-boundaries` in the core pack, and resumption inherits them — a resumed
session holds no approvals from the session before it, and stops at its gates exactly as the
first one would have.

The workspace may contain prospect data and will often be a git repository the user shares.
Never write credentials into it — tokens and keys belong to a credential store or the host's
secret management, never to a plan, a work item or a log.

## Related skills

- `execution-reporting` — the report half of the loop, and the evidence trail.
- `user-memory` — durable user knowledge, which lives alongside but is not work.
- `campaign-planning` (core pack) — decides what the plan says; this skill makes it persist.
- `orchestrator-integration` — who drives this loop when nobody is at the keyboard.

## Changelog

- 1.0.0 (2026-07-30): initial version. Consolidates the durable-work protocol that was
  previously split between the repository-level workspace specification and the workspace
  mechanics embedded in `outbound-campaign-planning`. The specification now ships inside this
  pack so an installed copy is self-contained.
