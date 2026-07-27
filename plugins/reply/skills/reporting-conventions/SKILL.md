---
name: reporting-conventions
description: >
  How to write execution reports that become organizational memory: structure, evidence,
  honest deviations, and feeding results back into planning and skill maturity. Use after
  completing meaningful execution, at plan checkpoints, or when closing a work item.
metadata:
  version: 1.0.0
  category: planning
  maturity: draft
  status: active
  owner: skills-maintainers
  tags: [reports, evidence, workspace]
  tools: []
  api: []
  relations:
    depends-on: [outbound-campaign-planning]
---

# Reporting conventions

## Purpose

Execution without reporting is incomplete. Reports are not activity logs — they are reusable
learning: what happened, what deviated, what was learned, what the next planning iteration must
know. Over time reports are the evidence that matures skills (draft → validated).

## When to use / when NOT to use

- Use after meaningful execution bursts, at plan checkpoints, when closing work items.
- Don't write a report for a trivial read-only lookup — noise buries signal.

## Prerequisites

A workspace goal directory; the Report template (`templates/report.md` in the repository).

## Execution guidance

1. Create `goals/<slug>/reports/RPT-<date>-<slug>.md` from the template.
2. **Lead with the outcome** (2–4 sentences), then completed work with real IDs and counts.
3. **Deviations, honestly:** where execution diverged from the plan and why. Partial failures are
   stated as N succeeded / M failed / reasons — never rounded up to success.
4. **Observations & evidence:** unexpected findings with concrete numbers; each assumption from
   the plan marked confirmed / refuted / still open.
5. **Recommendations (1–3)** ranked by impact; **Repository improvements** — skills to update,
   create or deprecate based on what was learned; **Follow-up actions** — work items to create.
6. If the report confirms or contradicts a specific skill's guidance, name that skill in the
   report's `validates:` frontmatter and propose adding the report link to the skill's
   `relations.validated-by` (via PR to this repository).

## Validation

A good report lets a fresh session answer: what happened, what changed in our understanding, and
what to do next — without reading anything else.

## Reporting

(This skill defines it.)

## Failure modes

- Reports drifting into command transcripts → move raw logs to `logs/`, keep the report about
  meaning.
- Delayed reporting → context decays fast; write while fresh, even if shorter.

## Safety

Reports may quote prospect data; keep them inside the user's workspace and never paste secrets
(keys, tokens) into them.

## Related skills

- `outbound-campaign-planning` — reports close its loop (Reassess reads them).

## Changelog

- 1.0.0 (2026-07-27): initial version.
