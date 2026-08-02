---
name: campaign-planning
description: >
  Turn a vague outbound goal into an executable plan: clarify the objective until success is
  observable, surface the constraints that shape it, compose the work from known operations
  and playbooks, and decide the checkpoints. Use when the user states a business goal — book
  meetings, launch a campaign, grow pipeline — rather than a single concrete action.
metadata:
  version: 2.1.0
  pack: ai-sdr-core
  category: strategy
  maturity: draft
  status: active
  owner: outbound-experts
  tags: [planning, decomposition, strategy, checkpoints]
  tools: []
  api: []
  relations:
    depends-on: [sdr-operations]
    recommends: [audience-building, campaign-launch, inbox-triage, performance-analysis, sending-guardrails, durable-work]
---

# Campaign planning

> **Partly an expert skeleton.** The planning method is complete. The strategic judgement —
> which play fits which situation, how to sequence experiments — is marked `TODO(expert)` and
> needs validation by outbound experts before this skill leaves `draft`.

## Purpose

Outbound is a loop, not a single prompt: goal → plan → work → measure → reassess → repeat.
This skill turns a business objective into the first two of those, in terms concrete enough
that someone else — another agent, another session, a colleague — could execute the result
without asking what was meant.

## When to use / when NOT to use

- Use when the request is a *goal* ("get me ten meetings with SaaS founders this quarter")
  rather than an *action* ("import this file").
- Do NOT use for single concrete actions — route straight to the matching skill.
- This skill produces a plan; it does not persist one. Where plans, work items and progress
  physically live is the job of a runtime — `durable-work`, if the `agentic-runtime` pack is
  installed. This skill works without it, and says so rather than assuming a workspace exists.

## Prerequisites

- A goal the user actually cares about, and whatever context they already have — ICP,
  preferences, past results.
- The operation contract (`sdr-operations`), because a plan is expressed in operations.

## Planning guidance

**Compose from what exists before inventing.** Ask which available skills already cover parts
of this goal, and assemble those. Where nothing covers a part, record the gap explicitly
rather than quietly improvising new methodology — an acknowledged gap improves the repository;
an invented method silently competes with it.

1. **Clarify until success is observable.** Target outcome, a number, a deadline, and the
   constraints: volume limits, brand voice, channels allowed, who must approve what. "More
   pipeline" is not a goal; "ten booked calls with EU SaaS VPs of Eng by 30 September" is.
   - **Settle where the audience will come from here, not later.** A plan whose first work
     item is "find the people", with no named source, is not executable — it stalls on its
     own first step. Ask whether the user has a list, has a sourcing tool of their own, or
     needs the options laid out: `audience-building` → *Where an audience comes from*.
2. **Surface the constraints that shape the plan** before designing it — sender maturity and
   volume ceilings (`sending-guardrails`), channel limits (`linkedin-guardrails`), and the
   approval boundaries the user expects (`approval-boundaries`). Constraints discovered
   mid-execution force replanning; constraints known up front shape a plan that works.
3. **Compose the strategy** in dependency order. The common backbone is
   `audience-building` → `campaign-launch` → `inbox-triage` as a loop, with
   `performance-analysis` at checkpoints.
   - TODO(expert): which plays fit which situation — new segment versus proven one, cold
     versus warm, single-channel versus multi-channel — and how to sequence experiments so
     each one teaches something.
4. **Decompose into work items** that are small, observable and independently resumable. Each
   one states its objective, how you will know it is done, and which operations it performs.
   Anything whose effect is `act` carries an approval gate, named in the plan.
5. **Decide the checkpoints and the replan triggers.** When to measure, and what would make
   the plan wrong: an assumption refuted, priorities changed, results contradicting the
   premise. A plan with no replan trigger gets followed past the point where it stopped
   making sense.

## Execution guidance

Get the user's approval of the **plan text** before the first work item runs. That approval
authorises the plan; it does not pass through the gates inside it — each `act` step still
stops and asks when it is reached (see `approval-boundaries`).

Then work item by item, in dependency order, via the referenced skills. Record identifiers as
soon as they exist, so that an interruption costs one step rather than the whole run.

**Replanning preserves completed work.** When the plan changes, the finished parts stay
finished: supersede the plan rather than rewriting history. If a runtime is available it
defines how (`durable-work`); if not, the same principle applies to however the user is
keeping track — a new revision, not an edit over the old one.

## Validation

The plan is sound when: success criteria are observable; every work item has completion
criteria; every `act` step carries an approval gate; each step names an operation from the
contract or an explicit gap; and the user has approved the plan text.

## Reporting

The plan itself is the first artefact. After that, report per checkpoint against the plan:
what was completed, what deviated and why, which assumptions held. Deviations are the
interesting part — a report that only confirms the plan teaches nothing.

## Failure modes

- **Planning a goal that was never clarified.** Everything downstream inherits the vagueness.
- **A plan with no approval gates** on steps that contact real people.
- **Inventing methodology** when an existing skill covers it, producing two competing
  approaches in the same repository.
- **Work items too large to resume** — "run the campaign" is not a work item.
- **No replan trigger**, so the plan is followed after its premise has been refuted.
- **Assuming a workspace exists.** If nothing durable is available, say what the user must
  keep track of themselves instead of silently relying on it.

## Safety

Planning itself changes nothing and is always safe. The plan's responsibility is to make
every irreversible or outward-facing step visible as a gate *before* execution starts, so the
user is never surprised by what a plan does — that is inherited from the safety sections of
the skills being composed, and defined in full in `approval-boundaries`.

## Related skills

- `sdr-operations` — the vocabulary a plan is written in.
- `audience-building` · `campaign-launch` · `inbox-triage` · `performance-analysis` — the
  usual building blocks.
- `durable-work` (in `agentic-runtime`, optional) — where plans and work items physically
  live, and how progress survives a session ending.

## Changelog

- 2.1.0 (2026-08-02): step 1 now requires the audience source to be settled during
  clarification. A plan that opens with an unnamed "find the people" stalls immediately,
  which is how a goal stated in one sentence turned into a refusal one step later.
- 2.0.0 (2026-07-30): renamed from `outbound-campaign-planning` and rewritten for the
  `ai-sdr-core` pack. The durable-work and workspace mechanics moved out to `durable-work` in
  `agentic-runtime`; the Reply CLI dependency is gone, so planning now works with any
  provider and with no runtime at all. Constraint-surfacing and replan triggers strengthened.
- 1.0.0 (2026-07-27): initial version as `outbound-campaign-planning`.
