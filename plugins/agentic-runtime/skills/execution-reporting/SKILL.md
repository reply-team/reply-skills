---
name: execution-reporting
description: >
  How to write execution reports that become organisational memory: structure, evidence,
  honest deviations, and feeding results back into the next planning pass. Use after
  completing meaningful execution, at a plan checkpoint, or when closing a work item.
metadata:
  version: 2.0.0
  pack: agentic-runtime
  category: runtime
  maturity: draft
  status: active
  owner: skills-maintainers
  tags: [reports, evidence, deviations, learning]
  tools: []
  api: []
  relations:
    depends-on: [durable-work]
    recommends: [user-memory, performance-analysis]
---

# Execution reporting

## Purpose

Execution without reporting is incomplete: the work happened, and nothing was learned from it.
A report is not an activity log — it is reusable learning. What happened, where reality
diverged from the plan, what that means, and what the next planning pass must know.

Over time reports are the only mechanism that moves guidance from *plausible* to *validated*.
Every unvalidated threshold in this repository is waiting for a report that tested it.

## When to use / when NOT to use

- Use after a meaningful burst of execution, at plan checkpoints, and when closing a work item.
- Do NOT write one for a trivial read-only lookup. Noise buries signal, and a repository full
  of empty reports is worse than one with few.
- Do NOT use a report as a progress tracker — that is the work item's job (`durable-work`).

## Prerequisites

A workspace with a goal directory (`durable-work`), and the report shape:
[templates/report.md](templates/report.md).

## Execution guidance

1. **Create the report** in the goal's reports directory, from the template, named by date and
   subject so that a list of filenames is already a timeline.
2. **Lead with the outcome** — two to four sentences. If the reader stops there, they should
   still know what happened and whether it worked.
3. **Completed work** with real identifiers and counts. Identifiers are what make a report
   verifiable rather than a claim.
4. **Deviations, honestly.** Where execution diverged from the plan and why. Partial failures
   are stated as N succeeded / M failed / reasons — never rounded up. A report that hides a
   partial failure will cause the same failure again.
5. **Observations and evidence.** Unexpected findings with concrete numbers and the window they
   were measured over. Mark each assumption the plan made as confirmed, refuted, or still open.
6. **Recommendations**, one to three, ranked by impact. Then **repository improvements** —
   which guidance should change based on what was learned — and **follow-up actions**, as work
   items to create.
7. **Close the evidence loop.** If the run confirmed or contradicted a specific skill's
   guidance, say which skill and how. That is what eventually promotes a `draft` skill to
   `validated`, or corrects a number that was wrong.

## Validation

A good report lets a fresh session answer three questions without reading anything else: what
happened, what changed in our understanding, and what to do next. If any answer requires the
original conversation, the report is not finished.

## Reporting

(This skill defines it.)

## Failure modes

- **Reports that drift into transcripts.** Raw command output belongs in run logs; the report
  is about meaning.
- **Delayed reporting.** Context decays within hours. A short report written now beats a
  thorough one that never gets written.
- **Success-shaped summaries** of runs that partly failed — the most damaging failure mode,
  because it destroys the trustworthiness of every other report.
- **Numbers without windows**, which cannot be compared to anything.
- **Recommendations nobody can act on** — "improve targeting" is an observation, not a
  recommendation.
- **No assumption tracking.** A report that never says which assumptions held cannot improve
  the plan that made them.

## Safety

Reports quote real prospect data and real results. Keep them inside the user's workspace, quote
only what the finding requires, and never paste credentials or tokens into them. Assume the
workspace may be shared or committed to git.

## Related skills

- `durable-work` — the loop this reporting closes, and where reports live.
- `user-memory` — durable learning *about the user* goes there instead, when it generalises
  beyond one run.
- `performance-analysis` (core pack) — the analytical read that a checkpoint report usually
  contains.

## Changelog

- 2.0.0 (2026-07-30): renamed from `reporting-conventions` and moved into the
  `agentic-runtime` pack. The report template now ships inside the pack, replacing the
  repository-root reference that would not have existed in an installed copy — the one
  concrete broken reference the reshuffle set out to fix.
- 1.0.0 (2026-07-27): initial version as `reporting-conventions`.
