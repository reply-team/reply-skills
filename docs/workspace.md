# The User Workspace

> Normative spec for where **runtime instances** live. The repository holds reusable *knowledge*
> (skills); the workspace holds *instances*: goals, plans, work items, work logs, reports,
> artifacts. See ADR-0004 for the rationale.

Any agent, the CLI, `reply daemon` and `reply ui` can read and write a workspace — it is plain
markdown + YAML frontmatter, git-friendly and tool-agnostic. Third-party orchestrators
(e.g. OpenClaw) interoperate through the same files (ADR-0005).

## Discovery

A workspace is any directory containing `reply-workspace.yaml` at its root. Tools discover it by
walking up from the current working directory (same pattern as `.git` or `.agents/skills`);
fallback when nothing is found: `~/reply-workspace/`. Creating a workspace = creating that one
marker file (plus directories on demand).

```yaml
# reply-workspace.yaml
version: 1
team_id: 1045            # optional: default Reply team for this workspace
timezone: Europe/Kiev    # optional
reporting: weekly        # optional: default reporting cadence
```

## Structure

```
<workspace>/
├── reply-workspace.yaml
├── goals/<goal-slug>/
│   ├── goal.md                    # objective, constraints, success criteria
│   ├── plan.md                    # CURRENT plan (templates/plan.md); superseded → plans/archive/
│   ├── work-items/WI-001-<slug>.md
│   ├── reports/RPT-2026-07-27-<slug>.md
│   └── artifacts/                 # generated deliverables (drafts, exports, analyses)
├── memory/                        # user knowledge: preferences.md, icp.md, playbooks/
└── logs/                          # append-only run journals (one file per run/session)
```

One goal = one directory; slug is kebab-case. History is immutable: superseded plans and reports
are archived, not rewritten (new understanding = new revision).

## Work items

The smallest durable, resumable unit of work. `templates/work-item.md` is the canonical shape:

```yaml
---
id: WI-003                # unique within the goal
goal: q3-saas-founders    # parent goal slug
status: awaiting-approval # todo | in-progress | blocked | awaiting-approval | done | cancelled
depends-on: [WI-001]
tools: [reply-cli]
outputs: []               # artifact paths / created entity IDs, filled during execution
approval:                 # present only while status = awaiting-approval
  question: "Start sequence 12345 for 214 contacts?"
history:
  - 2026-07-27T14:02Z started
  - 2026-07-27T14:07Z paused: awaiting user approval
---
```

Rules:

- **Resumable**: enough state in `outputs`/`history` that a fresh session can continue without
  redoing completed steps (checkpoint thinking — record external IDs as soon as they exist).
- **Idempotent intent**: before re-executing, check whether the outcome already holds.
- **`awaiting-approval`** is the human-review pause: execution stops gracefully until the user
  answers the `approval.question`. Skills define *which* actions require it (their Safety section).
- Failure classes get different treatment: transient → retry; permanent/validation → record in
  history, mark `blocked`, surface to the user. Recovery prefers continuation over restart.

## Reports

Written after meaningful execution (`templates/report.md`): outcomes, deviations, observations,
evidence, recommendations — reusable learning, not activity logs. A report that confirms or
refutes a skill's guidance should be linked from that skill's `relations.validated-by` — this is
the evidence loop that matures skills.

## Memory

`memory/` holds durable user knowledge agents may consult and extend: `preferences.md` (tone,
constraints, sign-offs), `icp.md`, `playbooks/`. Never store secrets (API keys, tokens) in the
workspace — credentials belong to the CLI credential store or the host's secret management.
