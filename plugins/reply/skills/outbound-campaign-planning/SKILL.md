---
name: outbound-campaign-planning
description: >
  Turn a vague outbound goal into a long-running executable plan: clarify the objective,
  select skills, decompose into durable work items in the user's workspace, define
  checkpoints and reporting cadence. Use when the user states a business goal (book
  meetings, launch a campaign, grow pipeline) rather than a single concrete action.
metadata:
  version: 1.0.0
  category: planning
  maturity: draft
  status: active
  owner: skills-maintainers
  tags: [planning, work-items, workspace, orchestration]
  tools: [reply-cli]
  api: []
  relations:
    depends-on: [reply-cli]
    recommends: [reporting-conventions, import-prospects, launch-outreach, manage-replies, analyze-performance]
---

# Outbound campaign planning

## Purpose

Outbound is a long-running loop, not a one-shot prompt: Goal → Plan → Work Items → Execute →
Report → Reassess → repeat. This skill turns a business objective into that loop, persisted in
the user's workspace so any future session (or another agent, or a daemon) can continue the work.

## When to use / when NOT to use

- Use when the request is a *goal* ("get me 10 meetings with SaaS founders") rather than an
  *action* ("import this CSV").
- Do NOT use for single concrete actions — route straight to the matching business skill.

## Prerequisites

- A workspace (directory with `reply-workspace.yaml`; create it with the user's consent if none
  exists — see the workspace spec in the repository docs).
- The skill catalog (this plugin) available, so planning is repository-first.

## Planning guidance

**Repository before reasoning.** Before inventing an approach: which existing skills cover parts
of this goal? Compose them; document genuine gaps rather than silently improvising new methodology.

1. **Clarify the objective** until success is observable: target outcome + number + deadline +
   constraints (budget/quotas, brand voice, channels, approvals). Check `memory/` for ICP and
   preferences.
2. **Identify constraints & protection rules** that shape the plan (sending limits, warm-up
   status, LinkedIn caps) — read `email-deliverability` / `linkedin-safety` early.
3. **Compose the strategy from skills**, in dependency order (typically: import-prospects →
   launch-outreach → manage-replies loop + analyze-performance checkpoints).
4. **Decompose into work items** — small, observable, resumable; each with objective,
   completion criteria and tools. Anything touching real prospects gets an approval gate
   (`awaiting-approval`).
5. **Define checkpoints & reporting cadence** (e.g. weekly analyze-performance report; replan
   triggers: assumptions invalidated, priorities changed, evidence contradicts the plan).

## Execution guidance

Materialize the plan in the workspace: `goals/<slug>/goal.md`, `plan.md` (Plan template),
`work-items/WI-…` (Work Item template). Get the user's approval of `plan.md` **before** executing
the first work item. Then execute item by item via the referenced skills, updating `status`,
`outputs` and `history` as you go — record external IDs the moment they exist (checkpoint
thinking). Replanning preserves completed work: archive the superseded plan, never rewrite it.

## Validation

The plan is valid when: success criteria are observable; every work item has completion criteria;
live-action items carry approval gates; the user approved the plan text.

## Reporting

Per `reporting-conventions`: a report after each meaningful execution burst and at every
checkpoint. Reports feed the Reassess step — the next planning iteration must read them.

## Failure modes

- Goal too vague after clarification → narrow to a first experiment (small list, one sequence),
  learn, then expand.
- No suitable skill exists for a step → do best-effort reasoning, and record the gap in the
  report's "Repository improvements" so a future skill captures it.

## Safety

Planning itself is safe. The plan MUST mark every irreversible/outward-facing action
(launch, send, delete) with an explicit approval gate — inherited from the business skills'
Safety sections.

## Related skills

- `reporting-conventions` — the report half of the loop.
- The four business skills — the usual building blocks.

## Changelog

- 1.0.0 (2026-07-27): initial version (orchestration model from the toolkit strategy).
